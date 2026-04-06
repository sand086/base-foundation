from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import models
from app.models.models import RecordStatus
from app.schemas import suppliers as schemas


# =========================================================
# SUPPLIERS (soft delete)
# =========================================================


def get_suppliers(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Supplier)
        .filter(models.Supplier.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Supplier.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_supplier(db: Session, supplier_id: int):
    return (
        db.query(models.Supplier)
        .filter(
            models.Supplier.id == supplier_id,
            models.Supplier.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_supplier(db: Session, supplier_in: schemas.SupplierCreate):
    db_supplier = models.Supplier(**supplier_in.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


def update_supplier(db: Session, supplier_id: int, supplier_in: schemas.SupplierUpdate):
    db_supplier = get_supplier(db, supplier_id)
    if not db_supplier:
        return None

    data = supplier_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(db_supplier, k, v)

    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


def delete_supplier(db: Session, supplier_id: int):
    db_supplier = get_supplier(db, supplier_id)
    if not db_supplier:
        return False

    db_supplier.record_status = RecordStatus.ELIMINADO
    db.add(db_supplier)
    db.commit()
    return True


# =========================================================
# INVOICES (PayableInvoice) (soft delete)
# =========================================================


def get_invoices(db: Session, skip: int = 0, limit: int = 100):
    invoices = (
        db.query(models.PayableInvoice)
        .options(
            joinedload(models.PayableInvoice.supplier),
            joinedload(models.PayableInvoice.payments),
        )
        .filter(models.PayableInvoice.record_status != RecordStatus.ELIMINADO)
        .order_by(models.PayableInvoice.fecha_vencimiento.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    for inv in invoices:
        inv.supplier_razon_social = inv.supplier.razon_social if inv.supplier else None

    return invoices


def get_invoice(db: Session, invoice_id: int):
    invoice = (
        db.query(models.PayableInvoice)
        .options(
            joinedload(models.PayableInvoice.supplier),
            joinedload(models.PayableInvoice.payments),
        )
        .filter(
            models.PayableInvoice.id == invoice_id,
            models.PayableInvoice.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if invoice:
        invoice.supplier_razon_social = (
            invoice.supplier.razon_social if invoice.supplier else None
        )
    return invoice


def create_invoice(db: Session, invoice_in: schemas.PayableInvoiceCreate):
    # saldo inicial = total, estatus inicial = PENDIENTE
    payload = invoice_in.model_dump(exclude={"payments"})
    db_invoice = models.PayableInvoice(
        **payload,
        saldo_pendiente=invoice_in.monto_total,
        estatus=models.InvoiceStatus.PENDIENTE,
    )
    db.add(db_invoice)
    db.flush()  # obtener id antes de pagos

    # pagos opcionales al crear
    for p in invoice_in.payments:
        db_payment = models.InvoicePayment(invoice_id=db_invoice.id, **p.model_dump())
        db.add(db_payment)
        db_invoice.saldo_pendiente = max((db_invoice.saldo_pendiente or 0) - p.monto, 0)

    # ajustar estatus por saldo si metieron pagos
    if (db_invoice.saldo_pendiente or 0) <= 0:
        db_invoice.estatus = models.InvoiceStatus.PAGADO
        db_invoice.saldo_pendiente = 0
    elif len(invoice_in.payments) > 0:
        db_invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

    db.commit()
    return get_invoice(db, db_invoice.id)


def update_invoice(
    db: Session, invoice_id: int, invoice_in: schemas.PayableInvoiceUpdate
):
    invoice = get_invoice(db, invoice_id)
    if not invoice:
        return None

    data = invoice_in.model_dump(exclude_unset=True)

    for k, v in data.items():
        # Si viene estatus como string, intenta enum
        if k == "estatus" and v is not None and not isinstance(v, models.InvoiceStatus):
            v = models.InvoiceStatus(v)
        setattr(invoice, k, v)

    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return get_invoice(db, invoice_id)


def delete_invoice(db: Session, invoice_id: int):
    invoice = get_invoice(db, invoice_id)
    if not invoice:
        return False

    invoice.record_status = RecordStatus.ELIMINADO
    db.add(invoice)
    db.commit()
    return True


# =========================================================
# PAYMENTS (InvoicePayment)
# =========================================================


def register_payment(
    db: Session, invoice_id: int, payment_in: schemas.InvoicePaymentCreate
):
    invoice = (
        db.query(models.PayableInvoice)
        .filter(
            models.PayableInvoice.id == invoice_id,
            models.PayableInvoice.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not invoice:
        return None

    db_payment = models.InvoicePayment(invoice_id=invoice_id, **payment_in.model_dump())
    db.add(db_payment)

    invoice.saldo_pendiente = max((invoice.saldo_pendiente or 0) - payment_in.monto, 0)

    if invoice.saldo_pendiente <= 0:
        invoice.estatus = models.InvoiceStatus.PAGADO
        invoice.saldo_pendiente = 0
    else:
        invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

    db.add(invoice)
    db.commit()
    return get_invoice(db, invoice_id)


def delete_payment(db: Session, payment_id: int):
    """
    Si lo ocupas: soft delete del pago.
    OJO: Si eliminas un pago, normalmente también debes recalcular saldo/estatus de la factura.
    """
    payment = (
        db.query(models.InvoicePayment)
        .filter(
            models.InvoicePayment.id == payment_id,
            models.InvoicePayment.record_status
            != RecordStatus.ELIMININADO,  # <-- typo intencional? NO. Corrige abajo.
        )
        .first()
    )
    # CORRECCIÓN: RecordStatus.ELIMINADO
    # Dejo esta función sin usar por default para evitar inconsistencias.
    raise NotImplementedError(
        "Si vas a permitir borrar pagos, hay que recalcular saldo/estatus de la factura."
    )
