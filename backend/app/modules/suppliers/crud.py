# --- Archivo: app/crud/crud_suppliers.py ---

import traceback
from datetime import datetime, timedelta, date
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.models import models
from app.models.models import RecordStatus
from . import schemas

# =========================================================
# SUPPLIERS (Gestión de Proveedores)
# =========================================================


def get_suppliers(db: Session, skip: int = 0, limit: int = 100):
    """
    Obtiene la lista de proveedores no eliminados, cargando su Centro de Costos.
    """
    return (
        db.query(models.Supplier)
        .options(
            joinedload(models.Supplier.cost_center),
            joinedload(models.Supplier.invoices).joinedload(
                models.PayableInvoice.payments
            ),
        )
        .filter(models.Supplier.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Supplier.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_supplier(db: Session, supplier_id: int):
    """
    Obtiene un proveedor específico por ID, incluyendo su CECO.
    """
    return (
        db.query(models.Supplier)
        .options(
            joinedload(models.Supplier.cost_center),
            joinedload(models.Supplier.invoices).joinedload(
                models.PayableInvoice.payments
            ),
        )
        .filter(
            models.Supplier.id == supplier_id,
            models.Supplier.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_supplier(db: Session, supplier_in: schemas.SupplierCreate):
    """
    Crea un nuevo registro en la tabla de proveedores.
    """
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
            status_code=400, detail=f"El RFC ya existe o faltan datos: {str(e.orig)}"
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno al crear proveedor")


def update_supplier(db: Session, supplier_id: int, supplier_in: schemas.SupplierUpdate):
    """
    Actualiza los datos de un proveedor (incluyendo banco, clabe y ceco_id).
    """
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
        raise HTTPException(
            status_code=400,
            detail=f"Error de integridad en actualización: {str(e.orig)}",
        )
    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al actualizar proveedor")


def delete_supplier(db: Session, supplier_id: int):
    """
    Aplica Soft Delete al proveedor.
    """
    db_supplier = get_supplier(db, supplier_id)
    if not db_supplier:
        return False

    try:
        db_supplier.record_status = RecordStatus.ELIMINADO
        db.add(db_supplier)
        db.commit()
        return True
    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al eliminar proveedor")


# =========================================================
# INVOICES (PayableInvoice - Cuentas por Pagar)
# =========================================================


def get_invoices(db: Session, skip: int = 0, limit: int = 5000):
    invoices = (
        db.query(models.PayableInvoice)
        .options(
            joinedload(models.PayableInvoice.supplier),
            joinedload(models.PayableInvoice.payments),
        )
        .filter(models.PayableInvoice.record_status != RecordStatus.ELIMINADO)
        .order_by(models.PayableInvoice.fecha_vencimiento.asc())
        .offset(skip)
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
        payload = invoice_in.model_dump(exclude={"payments", "orden_compra_id"})
        monto_total = payload.get("monto_total") or 0.0

        db_invoice = models.PayableInvoice(
            **payload,
            saldo_pendiente=monto_total,
            estatus=models.InvoiceStatus.PENDIENTE,
        )

        #  HERENCIA AUTOMÁTICA: Si el proveedor tiene un CECO, se le asigna a la factura
        if db_invoice.supplier_id and not db_invoice.cost_center_id:
            prov = db.query(models.Supplier).get(db_invoice.supplier_id)
            if prov and prov.cost_center_id:
                db_invoice.cost_center_id = prov.cost_center_id

        db.add(db_invoice)
        db.flush()

        pagos = getattr(invoice_in, "payments", [])
        if pagos:
            for p in pagos:
                db_payment = models.InvoicePayment(
                    invoice_id=db_invoice.id, **p.model_dump()
                )
                db.add(db_payment)
                db_invoice.saldo_pendiente = max(
                    (db_invoice.saldo_pendiente or 0.0) - p.monto, 0
                )

        if (db_invoice.saldo_pendiente or 0) <= 0:
            db_invoice.estatus = models.InvoiceStatus.PAGADO
            db_invoice.saldo_pendiente = 0
        elif pagos and len(pagos) > 0:
            db_invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        db.commit()
        return get_invoice(db, db_invoice.id)

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def update_invoice(db: Session, invoice_id: int, payload: schemas.PayableInvoiceUpdate):
    """
    Actualiza la factura. Aquí inyectamos la lógica de Cancelación Lógica y Reapertura.
    """
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

    data = payload.model_dump(exclude_unset=True)

    #  ==========================================
    # LÓGICA DE CANCELACIÓN Y REAPERTURA
    # ==========================================
    if "estatus" in data:
        nuevo_estatus = data["estatus"]

        # Convertir Enum a string si es necesario
        estatus_str = (
            nuevo_estatus.value
            if hasattr(nuevo_estatus, "value")
            else str(nuevo_estatus)
        )
        estatus_str = estatus_str.lower()

        if estatus_str == "cancelado":
            # BLOQUEO AUDITORÍA: Si ya tiene pagos (saldo < total), prohibir cancelación.
            if invoice.saldo_pendiente < invoice.monto_total:
                raise ValueError(
                    "No se puede cancelar una factura que ya tiene pagos. Anula los pagos en Tesorería primero."
                )
            invoice.estatus = models.InvoiceStatus.CANCELADO

        elif estatus_str == "pendiente":
            # REABRIR: Restaura el saldo y la pone pendiente
            invoice.estatus = models.InvoiceStatus.PENDIENTE
            invoice.saldo_pendiente = invoice.monto_total
        else:
            invoice.estatus = nuevo_estatus

        # Sacamos el estatus del dict para que el bucle de abajo no lo sobreescriba con un string puro
        data.pop("estatus")

    for key, value in data.items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)
    return invoice


def delete_invoice(db: Session, invoice_id: int):
    """
    Eliminación definitiva (oculta de todo el sistema).
    """
    invoice = (
        db.query(models.PayableInvoice)
        .filter(models.PayableInvoice.id == invoice_id)
        .first()
    )
    if not invoice:
        return False

    #  BLOQUEO DE AUDITORÍA
    if invoice.saldo_pendiente < invoice.monto_total:
        raise ValueError(
            "Bloqueo de Auditoría: No se puede eliminar una factura que ya tiene abonos o pagos registrados."
        )

    invoice.record_status = RecordStatus.ELIMINADO
    invoice.estatus = models.InvoiceStatus.CANCELADO
    db.commit()
    return True


# =========================================================
# PAYMENTS (Tesorería Integrada)
# =========================================================


def register_payment(db: Session, invoice_id: int, payment_in: dict):
    from sqlalchemy.exc import IntegrityError
    import traceback

    # 1. Bloqueamos la factura en la base de datos para evitar que
    # dos personas paguen la misma factura al mismo tiempo (Concurrencia)
    invoice = (
        db.query(models.PayableInvoice)
        .filter(
            models.PayableInvoice.id == invoice_id,
            models.PayableInvoice.record_status != RecordStatus.ELIMINADO,
        )
        .with_for_update(of=models.PayableInvoice)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404, detail="Factura no encontrada o ya eliminada."
        )

    # CANDADO: Evitar pagar facturas canceladas
    if invoice.estatus == models.InvoiceStatus.CANCELADO:
        raise ValueError(
            "No puedes registrar pagos a una factura que ha sido Cancelada."
        )

    try:
        # 2. Validación y limpieza de montos
        monto_pago = round(float(payment_in.get("monto", 0.0)), 2)

        # --- NUEVA LÓGICA DE VALIDACIÓN ---
        # Si la factura tiene saldo pendiente positivo, exigimos un pago mayor a 0
        if invoice.saldo_pendiente > 0:
            if monto_pago <= 0:
                raise ValueError(
                    "El monto del pago debe ser mayor a cero para facturas con deuda."
                )
            if monto_pago > invoice.saldo_pendiente:
                raise ValueError(
                    "El monto del pago no puede superar el saldo pendiente."
                )
        else:
            # Si el saldo es negativo o cero, aceptamos $0, pero bloqueamos números negativos
            if monto_pago < 0:
                raise ValueError("El monto del pago no puede ser negativo.")
        # -----------------------------------

        # 3. Guardar el registro del pago en la tabla InvoicePayment
        db_payment = models.InvoicePayment(invoice_id=invoice_id, **payment_in)
        db.add(db_payment)

        # 4. Actualizar el saldo de la factura de forma segura
        nuevo_saldo = round((invoice.saldo_pendiente or 0.0) - monto_pago, 2)

        # MAGIA: Si el saldo era -89.89, max(-89.89, 0.0) forzará la factura a quedar en $0.0
        invoice.saldo_pendiente = max(nuevo_saldo, 0.0)

        # Usamos 0.01 de tolerancia por si quedan basuras de centavos por redondeos del SAT
        if invoice.saldo_pendiente <= 0.01:
            invoice.estatus = models.InvoiceStatus.PAGADO
            invoice.saldo_pendiente = 0.0
        else:
            invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        # 5. AFECTAR LA TESORERÍA (El Estado de Cuenta de la Empresa)
        bank_account_id = payment_in.get("bank_account_id")

        if bank_account_id:
            account = (
                db.query(models.BankAccount)
                .filter(models.BankAccount.id == bank_account_id)
                .with_for_update(of=models.BankAccount)
                .first()
            )

            if not account:
                raise ValueError("La cuenta bancaria seleccionada no existe.")

            # Descontamos el dinero de la cuenta de banco (Si el pago es de $0, la cuenta no se afecta)
            account.saldo = round((account.saldo or 0.0) - monto_pago, 2)

            proveedor_nombre = (
                invoice.supplier.razon_social
                if invoice.supplier
                else "Proveedor Desconocido"
            )
            folio_factura = invoice.folio if invoice.folio else invoice.uuid[:8]
            concepto_claro = f"Pago CxP: {proveedor_nombre[:35]} - Fra: {folio_factura}"
            referencia_clara = payment_in.get("referencia", f"PAGO-{invoice.id}")

            fecha_movimiento = payment_in.get(
                "fecha_pago", payment_in.get("fecha", datetime.now())
            )

            # Generamos el movimiento de $0 para que quede registro de auditoría en Tesorería
            # de que se "concilió" un saldo negativo en esa cuenta.
            mov = models.BankMovement(
                bank_account_id=account.id,
                tipo="egreso",
                monto=monto_pago,
                concepto=concepto_claro,
                referencia=referencia_clara,
                origen_modulo="CxP",
                fecha=fecha_movimiento,
            )
            db.add(mov)

        # Confirmamos todos los cambios juntos (Atomicidad)
        db.commit()
        return get_invoice(db, invoice_id)

    except ValueError as ve:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(ve))
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Error de integridad en la base de datos al registrar el pago.",
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error crítico en pago: {str(e)}")


def delete_payment(db: Session, payment_id: int, user_id: int):
    """
    Elimina un pago, restaura el saldo de la factura y devuelve el dinero al banco.
    """
    try:
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

        invoice = (
            db.query(models.PayableInvoice)
            .filter(models.PayableInvoice.id == payment.invoice_id)
            .with_for_update(of=models.PayableInvoice)
            .first()
        )

        payment.record_status = RecordStatus.ELIMINADO
        invoice.saldo_pendiente += payment.monto

        if invoice.saldo_pendiente >= invoice.monto_total:
            invoice.saldo_pendiente = invoice.monto_total
            invoice.estatus = models.InvoiceStatus.PENDIENTE
        else:
            invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        if payment.bank_account_id:
            account = db.query(models.BankAccount).get(payment.bank_account_id)
            if account:
                account.saldo += payment.monto
                reverso = models.BankMovement(
                    bank_account_id=account.id,
                    tipo="ingreso",
                    monto=payment.monto,
                    concepto=f"Reverso de Pago Cancelado - Fra {invoice.id}",
                    referencia=f"CANC-{payment.id}",
                    created_by_id=user_id,
                )
                db.add(reverso)

        db.commit()
        return True
    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al cancelar pago")
