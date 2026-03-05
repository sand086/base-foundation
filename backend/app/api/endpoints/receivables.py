# src/api/endpoints/receivables.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models

router = APIRouter()


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
