from __future__ import annotations

from datetime import date
from sqlalchemy.orm import Session, joinedload

from app.models import models
from app.models.models import RecordStatus
from app.schemas import units as schemas

# Configuración de llantas esperadas por tipo
EXPECTED_TIRES = {
    "TRACTOCAMION": 10,
    "RABON": 6,
    "CAMIONETA": 4,
    "REMOLQUE": 8,
    "FULL": 18,  # Ejemplo
}


def _update_unit_status(db: Session, unit: models.Unit) -> None:
    """
    Calcula alertas, actualiza contadores y BLOQUEA la unidad si es necesario.

    Reglas:
    - Si hay documentos vencidos o llantas críticas o faltantes => status = BLOQUEADO (salvo ignore_blocking=True)
    - Si no hay razones y estaba bloqueado => regresa a DISPONIBLE y limpia razon_bloqueo
    """
    if not unit:
        return

    today = date.today()
    razones_bloqueo: list[str] = []

    # 1) Documentos vencidos
    expired_count = 0
    date_fields = [
        "seguro_vence",
        "verificacion_humo_vence",
        "verificacion_fisico_mecanica_vence",
        "verificacion_vence",
        "permiso_sct_vence",
        "caat_vence",
    ]

    for field in date_fields:
        expiration_date = getattr(unit, field, None)
        if expiration_date and expiration_date < today:
            expired_count += 1

    if expired_count > 0:
        razones_bloqueo.append(f"{expired_count} documentos vencidos")

    # 2) Llantas
    unit_tires = unit.tires or []

    # 2a) Llantas críticas
    critical_tires = 0
    for t in unit_tires:
        # Nota: si tus enums llegan como Enum, str(t.estado_fisico) puede incluir "TireCondition.BUENA"
        # Por eso normalizamos con split.
        estado_fisico = str(getattr(t, "estado_fisico", "")).lower()
        if "." in estado_fisico:
            estado_fisico = estado_fisico.split(".")[-1]

        profundidad = getattr(t, "profundidad_actual", 0) or 0
        if profundidad < 3 or estado_fisico in ["mala", "regular"]:
            critical_tires += 1

    if critical_tires > 0:
        razones_bloqueo.append(f"{critical_tires} llantas críticas")

    # 2b) Llantas incompletas
    tipo_unidad = str(unit.tipo_1).upper() if unit.tipo_1 else str(unit.tipo).upper()
    llantas_esperadas = EXPECTED_TIRES.get(tipo_unidad, 0)

    if llantas_esperadas > 0 and len(unit_tires) < llantas_esperadas:
        faltantes = llantas_esperadas - len(unit_tires)
        razones_bloqueo.append(f"Faltan {faltantes} llantas")

    # --- Aplicar cambios (sin commit aquí) ---
    unit.documentos_vencidos = expired_count
    unit.llantas_criticas = critical_tires

    should_block = len(razones_bloqueo) > 0
    if unit.ignore_blocking:
        should_block = False

    current_status = str(unit.status).lower()
    if "." in current_status:
        current_status = current_status.split(".")[-1]

    if should_block:
        new_reason = ", ".join(razones_bloqueo)
        if current_status != "bloqueado" or unit.razon_bloqueo != new_reason:
            unit.status = "bloqueado"
            unit.razon_bloqueo = new_reason
    else:
        if current_status == "bloqueado":
            unit.status = "disponible"
            unit.razon_bloqueo = None


def get_units(db: Session, skip: int = 0, limit: int = 100):
    """
    Lista unidades visibles (A e I). Oculta eliminadas (E).
    Recalcula estatus/contadores “al vuelo” y persiste cambios en un solo commit.
    """
    units = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .filter(models.Unit.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Unit.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    changed_any = False
    for unit in units:
        before = (
            unit.status,
            unit.razon_bloqueo,
            unit.documentos_vencidos,
            unit.llantas_criticas,
        )
        _update_unit_status(db, unit)
        after = (
            unit.status,
            unit.razon_bloqueo,
            unit.documentos_vencidos,
            unit.llantas_criticas,
        )
        if before != after:
            changed_any = True
            db.add(unit)

    if changed_any:
        db.commit()

    return units


def get_unit(db: Session, unit_id: int):
    """
    Obtiene unidad visible (A e I). Oculta eliminada (E).
    Recalcula estatus/contadores y persiste si cambia.
    """
    unit = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .filter(
            models.Unit.id == unit_id,
            models.Unit.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not unit:
        return None

    before = (
        unit.status,
        unit.razon_bloqueo,
        unit.documentos_vencidos,
        unit.llantas_criticas,
    )
    _update_unit_status(db, unit)
    after = (
        unit.status,
        unit.razon_bloqueo,
        unit.documentos_vencidos,
        unit.llantas_criticas,
    )
    if before != after:
        db.add(unit)
        db.commit()
        db.refresh(unit)

    return unit


def get_unit_by_eco(db: Session, numero_economico: str):
    """
    Busca por número económico (visible A/I). Oculta eliminadas (E).
    """
    unit = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .filter(
            models.Unit.numero_economico == numero_economico,
            models.Unit.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not unit:
        return None

    before = (
        unit.status,
        unit.razon_bloqueo,
        unit.documentos_vencidos,
        unit.llantas_criticas,
    )
    _update_unit_status(db, unit)
    after = (
        unit.status,
        unit.razon_bloqueo,
        unit.documentos_vencidos,
        unit.llantas_criticas,
    )
    if before != after:
        db.add(unit)
        db.commit()
        db.refresh(unit)

    return unit


def create_unit(db: Session, unit: schemas.UnitCreate):
    """
    Crea unidad (record_status default A por AuditMixin).
    """
    data = unit.model_dump()
    db_unit = models.Unit(**data)
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)

    # Recalcular estatus y persistir si cambia
    before = (
        db_unit.status,
        db_unit.razon_bloqueo,
        db_unit.documentos_vencidos,
        db_unit.llantas_criticas,
    )
    _update_unit_status(db, db_unit)
    after = (
        db_unit.status,
        db_unit.razon_bloqueo,
        db_unit.documentos_vencidos,
        db_unit.llantas_criticas,
    )
    if before != after:
        db.add(db_unit)
        db.commit()
        db.refresh(db_unit)

    return db_unit


def update_unit(db: Session, unit_id: str, unit_data: schemas.UnitUpdate):
    """
    Update unidad:
    - NO tocar created_at/updated_at manual
    - Permite actualizar record_status si viene (A/I), pero jamás “revive” una E vía update normal.
    - Recalcula estatus/contadores.
    """
    try:
        uid = int(unit_id)
    except ValueError:
        return None

    db_unit = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .filter(
            models.Unit.id == uid,
            models.Unit.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not db_unit:
        return None

    payload = unit_data.model_dump(exclude_unset=True)

    # Bloqueo de campos de auditoría (se manejan por mixin / server defaults)
    payload.pop("created_at", None)
    payload.pop("updated_at", None)
    payload.pop("created_by_id", None)
    payload.pop("updated_by_id", None)

    # Si por error intentan mandar E en update, lo ignoramos (el delete controla E)
    if payload.get("record_status") == RecordStatus.ELIMINADO:
        payload.pop("record_status", None)

    for key, value in payload.items():
        setattr(db_unit, key, value)

    _update_unit_status(db, db_unit)

    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


def delete_unit(db: Session, unit_id: str):
    """
    Soft delete:
    - record_status = E
    - No se borra físico.
    """
    try:
        uid = int(unit_id)
    except ValueError:
        return False

    unit = (
        db.query(models.Unit)
        .filter(
            models.Unit.id == uid,
            models.Unit.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not unit:
        return False

    unit.record_status = RecordStatus.ELIMINADO
    db.add(unit)
    db.commit()
    return True
