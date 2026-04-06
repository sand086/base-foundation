# src/api/endpoints/receivables.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.api.endpoints.auth import get_current_active_user
from app import crud

from lxml import etree
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
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
        .order_by(models.ReceivableInvoice.id.desc())  # Las más recientes primero
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Formateamos la respuesta para React
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
                # Cargamos los datos del cliente gracias a la relación en models.py
                "client": (
                    {"id": inv.client.id, "razon_social": inv.client.razon_social}
                    if inv.client
                    else None
                ),
            }
        )

    return response


@router.delete("/{invoice_id}")
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


@router.post("/{invoice_id}/payments")
def register_receivable_payment(
    invoice_id: int, payment: dict = Body(...), db: Session = Depends(get_db)
):
    # 1. Buscar la factura
    invoice = (
        db.query(models.ReceivableInvoice)
        .filter(models.ReceivableInvoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    # 2. Validar el monto
    monto_pago = float(payment.get("monto", 0))
    if monto_pago <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if monto_pago > invoice.saldo_pendiente:
        raise HTTPException(
            status_code=400, detail="El monto supera el saldo pendiente"
        )

    # 3. Registrar el pago
    nuevo_pago = models.ReceivableInvoicePayment(
        invoice_id=invoice.id,
        monto=monto_pago,
        metodo_pago=payment.get("metodo_pago", "TRANSFERENCIA"),
        referencia=payment.get("referencia", ""),
    )
    db.add(nuevo_pago)

    # 4. Actualizar el saldo de la factura principal
    invoice.saldo_pendiente -= monto_pago

    # 5. Cambiar el semáforo automáticamente
    if invoice.saldo_pendiente <= 0:
        invoice.estatus = models.InvoiceStatus.PAGADO
    else:
        invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

    db.commit()
    db.refresh(invoice)

    return {
        "message": "Pago registrado exitosamente",
        "nuevo_saldo": invoice.saldo_pendiente,
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
