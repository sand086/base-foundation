from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from fastapi import HTTPException
from datetime import datetime, timedelta
from app.models import models
from . import schemas

# =====================================================================
# PROVIDERS & CATEGORIES
# =====================================================================


def get_providers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Provider).offset(skip).limit(limit).all()


def create_provider(db: Session, provider: schemas.ProviderCreate):
    db_provider = models.Provider(**provider.model_dump())
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider


def delete_provider(db: Session, provider_id: str):
    provider = (
        db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    )
    if provider:
        db.delete(provider)
        db.commit()
        return True
    return False


def get_indirect_categories(db: Session):
    return db.query(models.IndirectExpenseCategory).all()


# =====================================================================
# TREASURY & BANKS (Cuentas y Tesorería)
# =====================================================================


def get_bank_accounts(db: Session):
    """Obtiene solo las cuentas bancarias activas (Oculta las archivadas)"""
    return (
        db.query(models.BankAccount)
        .filter(models.BankAccount.estatus == "activo")
        .all()
    )


def create_bank_account(db: Session, account: schemas.BankAccountCreate, user_id: int):
    """Crea una nueva cuenta bancaria."""
    db_account = models.BankAccount(**account.model_dump(), created_by_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


def update_bank_account(db: Session, account_id: int, account_data: dict, user_id: int):
    """
    Actualiza parcialmente los datos de una cuenta bancaria.
    Si trae 'saldo' (por ajuste manual de administrador), también lo afectará.
    """
    account = (
        db.query(models.BankAccount).filter(models.BankAccount.id == account_id).first()
    )

    if not account:
        return None

    for key, value in account_data.items():
        if hasattr(account, key) and value is not None:
            setattr(account, key, value)

    db.commit()
    db.refresh(account)
    return account


def delete_bank_account(db: Session, account_id: int):
    """
    Realiza un SOFT DELETE (Archivado) de la cuenta bancaria.
    No se elimina de la base de datos para no romper reportes históricos.
    """
    account = (
        db.query(models.BankAccount).filter(models.BankAccount.id == account_id).first()
    )

    if not account:
        return False

    # 🎯 MAGIA: SOFT DELETE (No usamos db.delete(account))
    account.estatus = "inactivo"

    # Si tienes habilitado AuditMixin en tu modelo, descomenta la siguiente línea:
    # account.record_status = "I"

    db.commit()
    return True


def get_bank_movements(db: Session):
    return (
        db.query(models.BankMovement).order_by(models.BankMovement.fecha.desc()).all()
    )


def create_bank_movement(
    db: Session, movement_data: schemas.BankMovementCreate, current_user_id: int
):
    """
    Registra un movimiento bancario y actualiza el saldo de la cuenta en una transacción atómica.
    Evita race-conditions usando bloqueo de fila (with_for_update).
    """
    # 1. Bloquear la fila de la cuenta bancaria temporalmente en la BD
    account = (
        db.query(models.BankAccount)
        .filter(models.BankAccount.id == movement_data.bank_account_id)
        .with_for_update()
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada.")

    # 2. Lógica matemática de saldos
    if movement_data.tipo == "ingreso":
        account.saldo += movement_data.monto
    elif movement_data.tipo == "egreso":
        account.saldo -= movement_data.monto

    # 3. Registrar el movimiento en el historial
    nuevo_movimiento = models.BankMovement(
        bank_account_id=account.id,
        tipo=movement_data.tipo,
        monto=movement_data.monto,
        concepto=movement_data.concepto,
        referencia=movement_data.referencia,
        created_by_id=current_user_id,
    )

    db.add(nuevo_movimiento)
    db.flush()

    return nuevo_movimiento


# =====================================================================
# INVOICES (Facturación y CXP)
# =====================================================================


def process_bulk_payables(db: Session, payload_data: list[dict]):
    """
    Procesa un array de diccionarios proveniente del Excel del SAT.
    Reglas de negocio:
    1. Evita duplicados por UUID.
    2. Crea el proveedor automáticamente si no existe por RFC.
    3. Calcula fecha de vencimiento basada en días de crédito.
    """
    facturas_creadas = 0
    proveedores_creados = 0

    for item in payload_data:
        rfc = str(item.get("rfc_emisor") or "").strip()
        nombre = str(item.get("nombre_emisor") or "").strip()
        uuid_fiscal = str(item.get("uuid") or "").strip()

        # Ignorar filas vacías o inválidas
        if not rfc or not uuid_fiscal:
            continue

        # 1. EVITAR DUPLICADOS
        existing_invoice = (
            db.query(models.PayableInvoice)
            .filter(models.PayableInvoice.uuid == uuid_fiscal)
            .first()
        )
        if existing_invoice:
            continue  # Ya existe, nos la saltamos

        # 2. GESTIÓN DEL PROVEEDOR
        provider = db.query(models.Provider).filter(models.Provider.rfc == rfc).first()

        # Obtener días de crédito (del Excel o 0 por defecto)
        try:
            dias_credito_excel = int(item.get("dias_credito") or 0)
        except (ValueError, TypeError):
            dias_credito_excel = 0

        if not provider:
            # Crear proveedor al vuelo
            provider = models.Provider(
                razon_social=nombre,
                rfc=rfc,
                dias_credito=dias_credito_excel,
                estatus="activo",
            )
            db.add(provider)
            db.flush()  # Guardar temporalmente para obtener el ID
            proveedores_creados += 1

        # Los días de crédito finales son los del proveedor o los del Excel
        dias_finales = (
            dias_credito_excel
            if dias_credito_excel > 0
            else (provider.dias_credito or 0)
        )

        # 3. GESTIÓN DE FECHAS
        fecha_str = str(item.get("fecha_emision") or "")
        try:
            # El SAT a veces manda '2023-08-01 06:00:00' o '2023-08-01'
            fecha_obj = datetime.fromisoformat(fecha_str.replace("Z", "").split(" ")[0])
        except ValueError:
            fecha_obj = datetime.utcnow()

        vencimiento = fecha_obj + timedelta(days=dias_finales)

        # 4. GESTIÓN DE MONTOS
        try:
            subtotal = float(item.get("subtotal") or 0)
            total = float(item.get("total") or 0)
        except (ValueError, TypeError):
            subtotal = 0.0
            total = 0.0

        # 5. CREACIÓN DE FACTURA (CXP)
        concepto = str(item.get("concepto") or "Factura importada del SAT")

        invoice = models.PayableInvoice(
            supplier_id=provider.id,
            uuid=uuid_fiscal,
            folio=str(item.get("folio") or ""),
            concepto=concepto[:200],  # Truncar por si viene muy largo
            monto_total=total,
            saldo_pendiente=total,  # Al importarse, se debe todo
            fecha_emision=fecha_obj.date(),
            fecha_vencimiento=vencimiento.date(),
            dias_credito=dias_finales,
            moneda=str(item.get("moneda") or "MXN").strip()[:3],
            estatus="pendiente",
            clasificacion="gasto_indirecto_variable",  # Clasificación por defecto al subir
        )
        db.add(invoice)
        facturas_creadas += 1

    # Guardar todos los cambios en la BD
    db.commit()

    return {
        "message": f"Se procesaron con éxito {facturas_creadas} facturas y se crearon {proveedores_creados} proveedores nuevos."
    }
