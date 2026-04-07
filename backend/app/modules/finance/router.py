import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body, status
from sqlalchemy.orm import Session
from lxml import etree

from app.db.database import get_db
from app.models import models
from app.modules.auth.router import get_current_active_user

#  IMPORTACIONES LOCALES (FSD)
from . import schemas, crud

logger = logging.getLogger(__name__)

#  ÚNICA INSTANCIA DEL ROUTER
router = APIRouter(tags=["Finance"])


# Definimos un esquema rápido para recibir el array dinámico
class BulkUploadPayload(BaseModel):
    data: List[dict]


# =====================================================================
# PAYABLES (Cuentas por Pagar) & PROVIDERS
# =====================================================================


@router.get("/providers", response_model=List[schemas.ProviderResponse])
def read_providers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_providers(db, skip, limit)


@router.post("/providers", response_model=schemas.ProviderResponse)
def create_provider(provider: schemas.ProviderCreate, db: Session = Depends(get_db)):
    if db.query(models.Supplier).filter(models.Supplier.rfc == provider.rfc).first():
        raise HTTPException(status_code=400, detail="RFC ya registrado")
    return crud.create_provider(db, provider)


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: str, db: Session = Depends(get_db)):
    if not crud.delete_provider(db, provider_id):
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado"}


@router.get("/indirect-categories")
def read_indirect_categories(db: Session = Depends(get_db)):
    """Obtiene las categorías de gastos indirectos (Fijos/Variables)"""
    return crud.get_indirect_categories(db)


# =====================================================================
# TREASURY & BANKS
# =====================================================================


@router.get("/bank-accounts", response_model=List[schemas.BankAccountResponse])
def read_bank_accounts(db: Session = Depends(get_db)):
    return crud.get_bank_accounts(db)


@router.post("/bank-accounts", response_model=schemas.BankAccountResponse)
def create_bank_account(
    account: schemas.BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Crea una nueva cuenta bancaria en Tesorería"""
    return crud.create_bank_account(db, account, current_user.id)


@router.get("/movements", response_model=List[schemas.BankMovementResponse])
def read_movements(db: Session = Depends(get_db)):
    return crud.get_bank_movements(db)


# =====================================================================
# INVOICES (Carga Masiva CxP)
# =====================================================================


class BulkInvoicePayload(BaseModel):
    data: List[Dict[str, Any]]


@router.post("/invoices/bulk-upload")
def bulk_upload_invoices(
    payload: BulkInvoicePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    config_credito = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "dias_credito_default")
        .first()
    )
    dias_credito_default = (
        int(config_credito.value)
        if config_credito and config_credito.value.isdigit()
        else 15
    )

    facturas_creadas = 0
    proveedores_creados = 0

    for row in payload.data:
        uuid_val = str(row.get("uuid", "")).strip().upper()
        rfc_prov = str(row.get("rfc_emisor", "")).strip().upper()
        nombre_prov = (
            str(row.get("nombre_emisor", "")).strip() or "PROVEEDOR DESCONOCIDO"
        )
        folio = str(row.get("folio", "")).strip()
        concepto = str(row.get("concepto", "")).strip() or "Importación SAT"
        moneda = str(row.get("moneda", "MXN")).strip().upper()

        dias_csv = str(row.get("dias_credito", "")).strip()
        dias_credito_final = (
            int(dias_csv) if dias_csv.isdigit() else dias_credito_default
        )

        if not rfc_prov or len(rfc_prov) < 10:
            continue

        if uuid_val:
            existe_factura = (
                db.query(models.PayableInvoice)
                .filter(models.PayableInvoice.uuid == uuid_val)
                .first()
            )
            if existe_factura:
                continue

        # 🧠 INTELIGENCIA: Buscar o Crear Proveedor
        proveedor = (
            db.query(models.Supplier).filter(models.Supplier.rfc == rfc_prov).first()
        )
        if not proveedor:
            proveedor = models.Supplier(
                razon_social=nombre_prov,
                rfc=rfc_prov,
                dias_credito=dias_credito_final,
                estatus="activo",
                created_by_id=current_user.id,
            )
            db.add(proveedor)
            db.flush()
            proveedores_creados += 1

        def safe_float(val):
            try:
                return float(str(val).replace(",", "").replace("$", "").strip())
            except (ValueError, TypeError):
                return 0.0

        subtotal = safe_float(row.get("subtotal"))
        iva = safe_float(row.get("iva"))
        retenciones = safe_float(row.get("retenciones"))
        total = safe_float(row.get("total"))

        fecha_str = str(row.get("fecha_emision", "")).strip()
        try:
            fecha_emision = datetime.strptime(fecha_str[:10], "%Y-%m-%d").date()
        except ValueError:
            fecha_emision = date.today()

        fecha_vencimiento = fecha_emision + timedelta(days=proveedor.dias_credito)

        nueva_factura = models.PayableInvoice(
            supplier_id=proveedor.id,
            supplier_razon_social=proveedor.razon_social,
            uuid=uuid_val if uuid_val else None,
            folio_interno=folio,
            subtotal=subtotal,
            iva=iva,
            retenciones=retenciones,
            monto_total=total,
            saldo_pendiente=total,
            moneda=moneda,
            fecha_emision=fecha_emision,
            fecha_vencimiento=fecha_vencimiento,
            concepto=concepto[:200],
            clasificacion="gasto_indirecto_variable",
            estatus="pendiente",
            created_by_id=current_user.id,
        )
        db.add(nueva_factura)
        facturas_creadas += 1

    db.commit()
    return {
        "status": "success",
        "message": f"Se procesaron {facturas_creadas} facturas y se crearon {proveedores_creados} proveedores nuevos.",
    }


# =====================================================================
# RECEIVABLES (Cuentas por Cobrar)
# =====================================================================


@router.get("/receivables")
def get_receivable_invoices(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """
    Obtiene todas las facturas de clientes (Cuentas por Cobrar)
    con la información del cliente adjunta.
    """
    invoices = (
        db.query(models.ReceivableInvoice)
        .filter(
            models.ReceivableInvoice.record_status == models.RecordStatus.ACTIVO.value
        )
        .order_by(models.ReceivableInvoice.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    response = []
    for inv in invoices:
        response.append(
            {
                "id": inv.id,
                "uuid": inv.uuid,
                "folio_interno": inv.folio_interno,
                "monto_total": inv.monto_total,
                "saldo_pendiente": inv.saldo_pendiente,
                "fecha_emision": (
                    inv.fecha_emision.isoformat() if inv.fecha_emision else None
                ),
                "fecha_vencimiento": (
                    inv.fecha_vencimiento.isoformat() if inv.fecha_vencimiento else None
                ),
                "estatus": inv.estatus,
                "moneda": inv.moneda,
                "client": (
                    {"id": inv.client.id, "razon_social": inv.client.razon_social}
                    if inv.client
                    else None
                ),
            }
        )
    return response


@router.delete("/receivables/{invoice_id}")
def delete_receivable_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = (
        db.query(models.ReceivableInvoice)
        .filter(models.ReceivableInvoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.saldo_pendiente < invoice.monto_total:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar una factura con pagos registrados",
        )

    db.delete(invoice)
    db.commit()
    return {"message": "Factura eliminada"}


@router.post("/receivables/{invoice_id}/payments")
def register_receivable_payment(
    invoice_id: int,
    payment: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # Importante traer el usuario
):
    invoice = (
        db.query(models.ReceivableInvoice)
        .filter(models.ReceivableInvoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    monto_pago = float(payment.get("monto", 0))
    if monto_pago <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if monto_pago > invoice.saldo_pendiente:
        raise HTTPException(
            status_code=400, detail="El monto supera el saldo pendiente"
        )

    nuevo_pago = models.ReceivableInvoicePayment(
        invoice_id=invoice.id,
        monto=monto_pago,
        metodo_pago=payment.get("metodo_pago", "TRANSFERENCIA"),
        referencia=payment.get("referencia", ""),
        created_by_id=current_user.id,
    )
    db.add(nuevo_pago)

    invoice.saldo_pendiente -= monto_pago

    if invoice.saldo_pendiente <= 0:
        invoice.estatus = models.InvoiceStatus.PAGADO
    else:
        invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

    # 🚀 MAGIA DE TESORERÍA: Si el front nos manda la cuenta bancaria elegida, la afectamos.
    bank_account_id = payment.get("bank_account_id")
    if bank_account_id:
        movimiento_schema = schemas.BankMovementCreate(
            bank_account_id=int(bank_account_id),
            tipo="ingreso",  # Es un pago de cliente (CXC), entonces entra dinero
            monto=monto_pago,
            concepto=f"Cobro de Fra. {invoice.folio_interno or invoice.uuid}",
            referencia=payment.get("referencia", ""),
        )
        # Llamamos al CRUD con bloqueo pesimista
        crud.create_bank_movement(db, movimiento_schema, current_user.id)

    # 1 solo Commit para asegurar que si falla el saldo, no se guarda el pago (Transacción Atómica)
    db.commit()
    db.refresh(invoice)

    return {
        "message": "Pago y movimiento bancario registrados exitosamente",
        "nuevo_saldo_factura": invoice.saldo_pendiente,
        "estatus": invoice.estatus,
    }


@router.post("/payments/upload-xml")
async def upload_payment_xml(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Lee un XML de Complemento de Pago (REP), busca el UUID de la factura relacionada
    y aplica el pago automáticamente matando el saldo pendiente.
    """
    try:
        content = await file.read()
        root = etree.fromstring(content)

        ns = {"pago20": "http://www.sat.gob.mx/Pagos20"}
        pagos = root.xpath("//pago20:Pago", namespaces=ns)
        if not pagos:
            raise HTTPException(
                status_code=400, detail="El XML no contiene complementos de pago."
            )

        pago = pagos[0]
        fecha_pago_str = pago.get("FechaPago")
        forma_pago = pago.get("FormaDePagoP", "03")

        doctos = root.xpath("//pago20:DoctoRelacionado", namespaces=ns)

        pagos_procesados = 0
        for doc in doctos:
            uuid_factura = doc.get("IdDocumento").upper()
            monto_pagado = float(doc.get("ImpPagado", "0.00"))

            #  SOLUCIÓN AL BUG: Cambié uuid_val a uuid_factura
            factura = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.uuid == uuid_factura)
                .first()
            )

            if factura and factura.saldo_pendiente > 0:
                nuevo_pago = models.ReceivableInvoicePayment(
                    invoice_id=factura.id,
                    fecha_pago=fecha_pago_str[:10],
                    monto=monto_pagado,
                    metodo_pago=forma_pago,
                    referencia="Carga XML REP",
                    cuenta_deposito="Banco Automático",
                    created_by_id=current_user.id,
                )
                db.add(nuevo_pago)

                factura.saldo_pendiente -= monto_pagado
                if factura.saldo_pendiente <= 0:
                    factura.saldo_pendiente = 0
                    factura.estatus = "pagado"
                else:
                    factura.estatus = "pago_parcial"

                pagos_procesados += 1

        db.commit()
        return {
            "status": "success",
            "message": f"Se procesaron {pagos_procesados} pagos automáticamente.",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al leer XML: {str(e)}")


@router.post("/invoices/bulk-upload")
def bulk_upload_invoices(payload: BulkUploadPayload, db: Session = Depends(get_db)):
    """
    Endpoint para procesar la carga masiva de facturas del SAT (CXP).
    """
    try:
        resultado = crud.process_bulk_payables(db=db, payload_data=payload.data)
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error procesando facturas: {str(e)}"
        )
