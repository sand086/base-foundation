# --- Fuente: crud_suppliers.py ---

import traceback
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.models import models
from app.models.models import RecordStatus
from . import schemas

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
    try:
        db_supplier = models.Supplier(**supplier_in.model_dump())
        db.add(db_supplier)
        db.commit()
        db.refresh(db_supplier)
        return db_supplier
    except IntegrityError as e:
        db.rollback()
        print(f"  IntegrityError al crear proveedor: {str(e.orig)}")
        raise HTTPException(
            status_code=400, detail=f"Error de integridad: {str(e.orig)}"
        )
    except Exception as e:
        db.rollback()
        print("  Error inesperado al crear proveedor:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno al crear proveedor")


def update_supplier(db: Session, supplier_id: int, supplier_in: schemas.SupplierUpdate):
    db_supplier = get_supplier(db, supplier_id)
    if not db_supplier:
        return None

    try:
        data = supplier_in.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(db_supplier, k, v)

        db.add(db_supplier)
        db.commit()
        db.refresh(db_supplier)
        return db_supplier
    except IntegrityError as e:
        db.rollback()
        print(f"  IntegrityError al actualizar proveedor {supplier_id}: {str(e.orig)}")
        raise HTTPException(
            status_code=400, detail=f"Error de integridad: {str(e.orig)}"
        )
    except Exception as e:
        db.rollback()
        print(f"  Error inesperado al actualizar proveedor {supplier_id}:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail="Error interno al actualizar proveedor"
        )


def delete_supplier(db: Session, supplier_id: int):
    db_supplier = get_supplier(db, supplier_id)
    if not db_supplier:
        return False

    try:
        db_supplier.record_status = RecordStatus.ELIMINADO
        db.add(db_supplier)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"  Error al eliminar proveedor {supplier_id}:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail="Error interno al eliminar proveedor"
        )


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
    try:
        # saldo inicial = total, estatus inicial = PENDIENTE
        payload = invoice_in.model_dump(exclude={"payments", "orden_compra_id"})

        # Validamos que monto_total nunca sea None para evitar fallos en BD
        monto_total = payload.get("monto_total")
        if monto_total is None:
            monto_total = 0.0
            payload["monto_total"] = monto_total

        db_invoice = models.PayableInvoice(
            **payload,
            saldo_pendiente=monto_total,
            estatus=models.InvoiceStatus.PENDIENTE,
        )
        db.add(db_invoice)
        db.flush()  # obtener id antes de registrar pagos

        # pagos opcionales al crear
        pagos = getattr(invoice_in, "payments", [])
        if pagos:
            for p in pagos:
                db_payment = models.InvoicePayment(
                    invoice_id=db_invoice.id, **p.model_dump()
                )
                db.add(db_payment)
                db_invoice.saldo_pendiente = max(
                    (db_invoice.saldo_pendiente or 0) - p.monto, 0
                )

        # ajustar estatus por saldo si metieron pagos
        if (db_invoice.saldo_pendiente or 0) <= 0:
            db_invoice.estatus = models.InvoiceStatus.PAGADO
            db_invoice.saldo_pendiente = 0
        elif pagos and len(pagos) > 0:
            db_invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        db.commit()
        return get_invoice(db, db_invoice.id)

    except IntegrityError as e:
        db.rollback()
        print(f"  IntegrityError al crear factura: {str(e.orig)}")
        raise HTTPException(
            status_code=400,
            detail=f"Falta un dato obligatorio o conflicto de llave foránea: {str(e.orig)}",
        )

    except Exception as e:
        db.rollback()
        print("  Error inesperado al crear factura:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error interno al crear factura: {str(e)}"
        )


def update_invoice(
    db: Session, invoice_id: int, invoice_in: schemas.PayableInvoiceUpdate
):
    invoice = get_invoice(db, invoice_id)
    if not invoice:
        return None

    try:
        data = invoice_in.model_dump(exclude_unset=True)

        for k, v in data.items():
            # Si viene estatus como string, intenta enum
            if (
                k == "estatus"
                and v is not None
                and not isinstance(v, models.InvoiceStatus)
            ):
                v = models.InvoiceStatus(v)
            setattr(invoice, k, v)

        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        return get_invoice(db, invoice_id)

    except IntegrityError as e:
        db.rollback()
        print(f"  IntegrityError al actualizar factura {invoice_id}: {str(e.orig)}")
        raise HTTPException(
            status_code=400, detail=f"Error de integridad: {str(e.orig)}"
        )
    except Exception as e:
        db.rollback()
        print(f"  Error al actualizar factura {invoice_id}:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail="Error interno al actualizar factura"
        )


def delete_invoice(db: Session, invoice_id: int):
    invoice = get_invoice(db, invoice_id)
    if not invoice:
        return False

    try:
        invoice.record_status = RecordStatus.ELIMINADO
        db.add(invoice)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"  Error al eliminar factura {invoice_id}:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno al eliminar factura")


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
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    try:
        db_payment = models.InvoicePayment(
            invoice_id=invoice_id, **payment_in.model_dump()
        )
        db.add(db_payment)

        # Actualizar saldo
        monto_pago = payment_in.monto or 0.0
        invoice.saldo_pendiente = max((invoice.saldo_pendiente or 0.0) - monto_pago, 0)

        # Actualizar estatus
        if invoice.saldo_pendiente <= 0:
            invoice.estatus = models.InvoiceStatus.PAGADO
            invoice.saldo_pendiente = 0
        else:
            invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        db.add(invoice)
        db.commit()
        return get_invoice(db, invoice_id)

    except IntegrityError as e:
        db.rollback()
        print(
            f"  IntegrityError al registrar pago en factura {invoice_id}: {str(e.orig)}"
        )
        raise HTTPException(
            status_code=400, detail=f"Datos inválidos para el pago: {str(e.orig)}"
        )
    except Exception as e:
        db.rollback()
        print(f"  Error inesperado al registrar pago en factura {invoice_id}:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail="Error interno al registrar el pago"
        )


def delete_payment(db: Session, payment_id: int, user_id: int):
    """
    1. Hace Soft Delete del pago.
    2. Recalcula el saldo_pendiente y estatus de la factura.
    3. Devuelve el dinero a la cuenta bancaria (Tesorería) registrando un Ingreso por reverso.
    """
    try:
        # 1. Buscar el pago original
        payment = (
            db.query(models.InvoicePayment)
            .filter(
                models.InvoicePayment.id == payment_id,
                models.InvoicePayment.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )
        if not payment:
            return False

        # 2. Bloquear la Factura asociada (Evita race conditions y PROTEGE CONTRA ELIMINADOS)
        invoice = (
            db.query(models.PayableInvoice)
            .filter(
                models.PayableInvoice.id == payment.invoice_id,
                models.PayableInvoice.record_status
                != RecordStatus.ELIMINADO,  # <-- PROTECCIÓN AGREGADA
            )
            .with_for_update()
            .first()
        )
        if not invoice:
            raise ValueError(
                "La factura asociada a este pago no existe o fue eliminada."
            )

        # 3. Marcar el pago como eliminado (Soft Delete)
        payment.record_status = RecordStatus.ELIMINADO
        db.add(payment)

        # 4. RECALCULAR FACTURA (Devolverle la deuda)
        invoice.saldo_pendiente += payment.monto

        # Ajustar estatus según el nuevo saldo
        if invoice.saldo_pendiente >= invoice.monto_total:
            invoice.saldo_pendiente = invoice.monto_total
            invoice.estatus = models.InvoiceStatus.PENDIENTE
        else:
            invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        db.add(invoice)

        # 5. RECALCULAR TESORERÍA (Devolver el dinero al banco y PROTEGE CONTRA ELIMINADOS)
        if payment.bank_account_id:
            account = (
                db.query(models.BankAccount)
                .filter(
                    models.BankAccount.id == payment.bank_account_id,
                    models.BankAccount.record_status
                    != RecordStatus.ELIMINADO,  # <-- PROTECCIÓN AGREGADA
                )
                .with_for_update()
                .first()
            )
            if account:
                # El dinero que había salido (egreso), ahora entra de vuelta
                account.saldo += payment.monto

                # Crear el movimiento de auditoría en Tesorería
                folio_interno = invoice.folio_interno or (
                    invoice.uuid[:8] if invoice.uuid else str(invoice.id)
                )
                reverso = models.BankMovement(
                    bank_account_id=account.id,
                    tipo="ingreso",  # Entra dinero por cancelación de pago
                    monto=payment.monto,
                    concepto=f"Reverso de Pago CxP Cancelado - Fra. {folio_interno}",
                    referencia=f"CANC-PAGO-{payment.id}",
                    created_by_id=user_id,
                )
                db.add(reverso)

        # 6. Guardar todo atómicamente
        db.commit()
        return True

    except Exception as e:
        # Si algo de Tesorería o Facturación falla, echamos todo para atrás
        db.rollback()
        raise e
