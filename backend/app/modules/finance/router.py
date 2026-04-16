import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body, status
from sqlalchemy.orm import Session, joinedload
from lxml import etree

from app.db.database import get_db
from app.models import models
from app.modules.auth.router import get_current_active_user

# IMPORTACIONES LOCALES (FSD)
from . import schemas, crud

logger = logging.getLogger(__name__)

# ÚNICA INSTANCIA DEL ROUTER
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


#  NUEVO: RUTA PARA EDITAR (PATCH)
@router.patch("/bank-accounts/{account_id}", response_model=schemas.BankAccountResponse)
def update_bank_account(
    account_id: int,
    account_data: dict = Body(
        ...
    ),  # Recibe los datos parciales (incluido saldo_inicial si fue forzado)
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Edita la cuenta bancaria. Permite ajuste de saldo si se autorizó en el front."""
    updated_account = crud.update_bank_account(
        db, account_id, account_data, current_user.id
    )
    if not updated_account:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return updated_account


#  NUEVO: RUTA PARA ELIMINAR/ARCHIVAR (DELETE)
@router.delete("/bank-accounts/{account_id}")
def delete_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Aplica un Soft Delete a la cuenta para proteger la integridad contable."""
    success = crud.delete_bank_account(db, account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return {"message": "Cuenta archivada exitosamente"}


@router.get("/movements", response_model=List[schemas.BankMovementResponse])
def read_movements(db: Session = Depends(get_db)):
    return crud.get_bank_movements(db)


# =====================================================================
# INVOICES (Carga Masiva CxP)
# =====================================================================


@router.post("/invoices/bulk-upload")
def bulk_upload_invoices(
    payload: BulkUploadPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
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


# =====================================================================
# RECEIVABLES (Cuentas por Cobrar)
# =====================================================================


@router.get("/receivables")
def get_receivable_invoices(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """
    Obtiene todas las facturas de clientes (Cuentas por Cobrar)
    con la información del cliente adjunta, ignorando las que no tienen folio.
    """
    invoices = (
        db.query(models.ReceivableInvoice)
        .options(
            joinedload(models.ReceivableInvoice.client),
            joinedload(models.ReceivableInvoice.payments),
        )
        .filter(
            models.ReceivableInvoice.record_status == models.RecordStatus.ACTIVO.value,
            #   AQUÍ ESTÁ LA MAGIA: Filtramos los que no tienen folio
            models.ReceivableInvoice.folio_interno.isnot(None),
            models.ReceivableInvoice.folio_interno != "",
        )
        .order_by(models.ReceivableInvoice.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    response = []

    for inv in invoices:
        # Empaquetamos el historial de pagos para esta factura
        pagos_list = []
        for p in inv.payments:
            pagos_list.append(
                {
                    "id": p.id,
                    "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None,
                    "monto": p.monto,
                    "metodo_pago": p.metodo_pago,
                    "referencia": p.referencia or "S/R",
                    "cuenta_deposito": p.cuenta_deposito,
                    "complemento_uuid": p.complemento_uuid,
                }
            )

        response.append(
            {
                "id": inv.id,
                "uuid": inv.uuid,
                "folio_interno": inv.folio_interno,  # Ya no ocupamos el 'or "S/F"' porque todos tendrán folio
                "concepto": inv.concepto or "Servicio de Flete",
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
                "pdf_url": inv.pdf_url,
                "xml_url": inv.xml_url,
                "payments": pagos_list,
                "client": (
                    {
                        "id": inv.client.id,
                        "razon_social": inv.client.razon_social,
                        "rfc": inv.client.rfc,
                    }
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

    #  MAGIA DE TESORERÍA: Si el front nos manda la cuenta bancaria elegida, la afectamos.
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

            # SOLUCIÓN AL BUG: Cambié uuid_val a uuid_factura
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


# =====================================================================
# PAGOS A PROVEEDORES Y CAJA CHICA (Endpoints)
# =====================================================================


@router.post("/payables/{invoice_id}/payments")
def register_provider_payment(
    invoice_id: int,
    payment: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Aplica un pago a una factura de proveedor (CXP) y descuenta del banco."""
    try:
        invoice = crud.register_payable_payment(
            db, invoice_id, payment, current_user.id
        )
        if not invoice:
            raise HTTPException(
                status_code=404, detail="Factura de proveedor no encontrada"
            )

        return {
            "message": "Pago a proveedor registrado exitosamente. Se descontó del banco.",
            "nuevo_saldo_factura": invoice.saldo_pendiente,
            "estatus": invoice.estatus,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/petty-cash")
def register_petty_cash(
    expense: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Registra un gasto de Caja Chica (Sin XML) afectando directo la Tesorería."""
    try:
        movimiento = crud.register_petty_cash_expense(db, expense, current_user.id)
        return {
            "message": "Gasto de Caja Chica registrado exitosamente.",
            "movimiento_id": movimiento.id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
