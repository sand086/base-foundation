from datetime import datetime, timedelta, date
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.api.endpoints.auth import get_current_active_user
import logging
from app import crud
from app.schemas import finance

from lxml import etree

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/providers", response_model=List[finance.ProviderResponse])
def read_providers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_providers(db, skip, limit)


@router.post("/providers", response_model=finance.ProviderResponse)
def create_provider(provider: finance.ProviderCreate, db: Session = Depends(get_db)):
    if db.query(models.Provider).filter(models.Provider.rfc == provider.rfc).first():
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


@router.get("/bank-accounts", response_model=List[finance.BankAccountResponse])
def read_bank_accounts(db: Session = Depends(get_db)):
    return crud.get_bank_accounts(db)


@router.get("/movements", response_model=List[finance.BankMovementResponse])
def read_movements(db: Session = Depends(get_db)):
    return crud.get_bank_movements(db)


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

        # Parseo de días de crédito específicos si vienen en el Excel
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

        # Fechas
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

        # Namespace de pagos SAT 2.0 (como en el archivo de Gustavo)
        ns = {"pago20": "http://www.sat.gob.mx/Pagos20"}

        # Buscar el pago
        pagos = root.xpath("//pago20:Pago", namespaces=ns)
        if not pagos:
            raise HTTPException(
                status_code=400, detail="El XML no contiene complementos de pago."
            )

        pago = pagos[0]
        fecha_pago_str = pago.get("FechaPago")
        forma_pago = pago.get("FormaDePagoP", "03")

        # Buscar documentos relacionados (Facturas pagadas)
        doctos = root.xpath("//pago20:DoctoRelacionado", namespaces=ns)

        pagos_procesados = 0
        for doc in doctos:
            uuid_factura = doc.get("IdDocumento").upper()
            monto_pagado = float(doc.get("ImpPagado", "0.00"))

            # Buscar factura en CxC
            factura = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.uuid == uuid_val)
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

                # Actualizar saldos
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
