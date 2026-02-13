from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import units as schemas
from datetime import datetime, date

# Configuración de llantas esperadas por tipo
EXPECTED_TIRES = {
    "TRACTOCAMION": 10,
    "RABON": 6,
    "CAMIONETA": 4,
    "REMOLQUE": 8,
    "FULL": 18,  # Ejemplo
}


def _update_unit_status(db: Session, unit: models.Unit):
    """
    Calcula alertas, actualiza contadores y BLOQUEA la unidad si es necesario.
    """
    if not unit:
        return

    today = date.today()
    razones_bloqueo = []

    # 1. Verificar Documentos Vencidos
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

    # 2. Verificar Llantas (Críticas y Cantidad)
    # Necesitamos acceder a unit.tires. Si no se cargó con joinedload, esto podría dar error o ser lento.
    # Asumimos que las consultas principales usan joinedload.
    unit_tires = unit.tires if unit.tires else []

    # 2a. Llantas Críticas (< 5mm o estado 'mala'/'desecho')
    # Ajusta el umbral (5mm) según tu regla de negocio
    critical_tires = 0
    for t in unit_tires:
        if t.profundidad_actual < 3 or str(t.estado_fisico).lower() in [
            "mala",
            "regular",
        ]:  # Ejemplo criterio
            critical_tires += 1

    if critical_tires > 0:
        razones_bloqueo.append(f"{critical_tires} llantas críticas")

    # 2b. Llantas Incompletas
    tipo_unidad = str(unit.tipo_1).upper() if unit.tipo_1 else str(unit.tipo).upper()
    llantas_esperadas = EXPECTED_TIRES.get(tipo_unidad, 0)

    if llantas_esperadas > 0 and len(unit_tires) < llantas_esperadas:
        faltantes = llantas_esperadas - len(unit_tires)
        razones_bloqueo.append(f"Faltan {faltantes} llantas")

    # --- APLICAR CAMBIOS ---

    # Actualizar contadores
    unit.documentos_vencidos = expired_count
    unit.llantas_criticas = critical_tires

    # Lógica de Bloqueo
    should_block = len(razones_bloqueo) > 0

    if unit.ignore_blocking:
        should_block = False

    current_status = str(unit.status).lower()

    if should_block:
        # Bloqueo forzoso
        new_reason = ", ".join(razones_bloqueo)
        if current_status != "bloqueado" or unit.razon_bloqueo != new_reason:
            unit.status = "bloqueado"
            unit.razon_bloqueo = new_reason
            db.add(unit)
            db.commit()

    else:
        # Si NO hay razones de bloqueo, pero estaba bloqueado -> Liberar a disponible
        if current_status == "bloqueado":
            unit.status = "disponible"
            unit.razon_bloqueo = None
            db.add(unit)
            db.commit()

        else:
            # Si ya no hay motivos O se activó el desbloqueo manual
            if current_status == "bloqueado":
                # Liberamos a disponible (o el estado que el usuario haya elegido en el update)
                unit.status = "disponible"
                unit.razon_bloqueo = None
                db.add(unit)
                db.commit()

        # Si tiene ignore_blocking activado pero sigue con problemas,
        # podríamos dejar una nota en razon_bloqueo como advertencia,
        # pero el status se mantiene "disponible".


def get_units(db: Session, skip: int = 0, limit: int = 100):
    units = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Recalculamos al vuelo para que el usuario siempre vea datos frescos
    for unit in units:
        _update_unit_status(db, unit)

    return units


def get_unit(db: Session, unit_id: int):
    unit = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .filter(models.Unit.id == unit_id)
        .first()
    )
    _update_unit_status(db, unit)
    return unit


def get_unit_by_eco(db: Session, numero_economico: str):
    unit = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.tires))
        .filter(models.Unit.numero_economico == numero_economico)
        .first()
    )
    _update_unit_status(db, unit)
    return unit


def create_unit(db: Session, unit: schemas.UnitCreate):
    db_unit = models.Unit(**unit.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)

    _update_unit_status(db, db_unit)
    return db_unit


def update_unit(db: Session, unit_id: str, unit_data: schemas.UnitUpdate):
    try:
        uid = int(unit_id)
        db_unit = (
            db.query(models.Unit)
            .options(joinedload(models.Unit.tires))
            .filter(models.Unit.id == uid)
            .first()
        )
    except ValueError:
        return None

    if not db_unit:
        return None

    for key, value in unit_data.model_dump(exclude_unset=True).items():
        setattr(db_unit, key, value)

    db_unit.updated_at = datetime.utcnow()
    db.commit()

    db.refresh(db_unit)

    _update_unit_status(db, db_unit)

    return db_unit


def delete_unit(db: Session, unit_id: str):
    try:
        uid = int(unit_id)
        unit = db.query(models.Unit).filter(models.Unit.id == uid).first()
    except ValueError:
        return False

    if unit:
        db.delete(unit)
        db.commit()
        return True
    return False
