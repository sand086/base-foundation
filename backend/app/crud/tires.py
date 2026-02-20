from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models import models
from app.models.models import RecordStatus, TireEventType
from app.schemas import tires as schemas


# =========================================================
# Helpers
# =========================================================


def _enrich_tire_data(tire: models.Tire):
    """
    Enriquecimiento solo para response (no persiste columnas).
    """
    if tire.unit:
        tire.unidad_actual_economico = tire.unit.numero_economico
        tire.unidad_actual_id = tire.unit.id
    else:
        tire.unidad_actual_economico = None
        tire.unidad_actual_id = None

    if tire.history:
        tire.history.sort(key=lambda x: x.fecha, reverse=True)


def _visible_tire_query(db: Session):
    """
    Query base: oculta record_status = E (ELIMINADO). Muestra A e I.
    """
    return (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .filter(models.Tire.record_status != RecordStatus.ELIMINADO)
    )


def _visible_unit(db: Session, unit_id: int | None):

    if unit_id is None:
        return None
    return (
        db.query(models.Unit)
        .filter(
            models.Unit.id == unit_id,
            models.Unit.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


# =========================================================
# LECTURA
# =========================================================


def get_tires(db: Session, skip: int = 0, limit: int = 100):
    tires = (
        _visible_tire_query(db)
        .order_by(models.Tire.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for tire in tires:
        _enrich_tire_data(tire)
    return tires


def get_tire(db: Session, tire_id: int):
    tire = _visible_tire_query(db).filter(models.Tire.id == tire_id).first()
    if tire:
        _enrich_tire_data(tire)
    return tire


def get_tire_by_code(db: Session, codigo: str):
    tire = _visible_tire_query(db).filter(models.Tire.codigo_interno == codigo).first()
    if tire:
        _enrich_tire_data(tire)
    return tire


# =========================================================
# CREACIÓN
# =========================================================


def create_tire(db: Session, tire_in: schemas.TireCreate):
    db_tire = models.Tire(
        codigo_interno=tire_in.codigo_interno,
        marca=tire_in.marca,
        modelo=tire_in.modelo,
        medida=tire_in.medida,
        dot=tire_in.dot,
        profundidad_original=tire_in.profundidad_original,
        profundidad_actual=tire_in.profundidad_actual,
        fecha_compra=tire_in.fecha_compra,
        precio_compra=tire_in.precio_compra,
        costo_acumulado=tire_in.precio_compra,
        proveedor=tire_in.proveedor,
        estado=tire_in.estado,  # Enum TireStatus en tu modelo
        km_recorridos=0,
        unit_id=None,
        posicion=None,
        # record_status default A por AuditMixin
    )
    db.add(db_tire)
    db.flush()  # para obtener id

    history = models.TireHistory(
        tire_id=db_tire.id,
        fecha=datetime.utcnow(),
        tipo=TireEventType.COMPRA,  # ✅ enum (no string)
        descripcion=f"Alta inicial - Compra a {tire_in.proveedor}",
        costo=tire_in.precio_compra,
        responsable="Admin",
        km=0,
    )
    db.add(history)

    db.commit()
    db.refresh(db_tire)
    _enrich_tire_data(db_tire)
    return db_tire


# =========================================================
# ASIGNACIÓN / DESMONTAJE
# =========================================================


def assign_tire(db: Session, tire_id: int, payload: schemas.AssignTirePayload):
    tire = (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .filter(
            models.Tire.id == tire_id,
            models.Tire.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not tire:
        return None

    is_mounting = payload.unidad_id is not None
    unit_economico_str = None

    if is_mounting:
        unit = _visible_unit(db, payload.unidad_id)
        if not unit:
            raise ValueError("Unidad no encontrada")

        unit_economico_str = unit.numero_economico

        # Si hay posición, validar ocupante (visible). Si existe -> desmontaje del ocupante (soft delete NO aplica)
        if payload.posicion:
            occupant = (
                db.query(models.Tire)
                .filter(
                    models.Tire.unit_id == payload.unidad_id,
                    models.Tire.posicion == payload.posicion,
                    models.Tire.id != tire_id,
                    models.Tire.record_status != RecordStatus.ELIMINADO,
                )
                .first()
            )

            if occupant:
                occupant.unit_id = None
                occupant.posicion = None

                occ_history = models.TireHistory(
                    tire_id=occupant.id,
                    fecha=datetime.utcnow(),
                    tipo=TireEventType.DESMONTAJE,
                    descripcion=f"Desmontaje por reemplazo (Entra {tire.codigo_interno})",
                    unidad_economico=unit_economico_str,
                    unidad_id=payload.unidad_id,
                    km=occupant.km_recorridos,
                    responsable="Sistema",
                )
                db.add(occ_history)
                db.add(occupant)

        tipo_evento = TireEventType.MONTAJE
        desc = f"Montaje en {unit.numero_economico}"
        if payload.posicion:
            desc += f" - {payload.posicion}"

        # Cambiar estado de nuevo->usado si se monta
        if (
            str(tire.estado) == "TireStatus.NUEVO"
            or str(tire.estado).lower() == "nuevo"
        ):
            tire.estado = models.TireStatus.USADO

    else:
        tipo_evento = TireEventType.DESMONTAJE
        desc = "Desmontaje - Enviada a Almacén"

    if payload.notas:
        desc += f". Notas: {payload.notas}"

    tire.unit_id = payload.unidad_id
    tire.posicion = payload.posicion

    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=tipo_evento,  # ✅ enum
        descripcion=desc,
        unidad_economico=unit_economico_str,
        unidad_id=payload.unidad_id,
        posicion=payload.posicion,
        km=tire.km_recorridos,
        responsable="Operaciones",
    )

    db.add(history)
    db.add(tire)
    db.commit()

    db.refresh(tire)
    _enrich_tire_data(tire)
    return tire


# =========================================================
# MANTENIMIENTO
# =========================================================


def register_maintenance(
    db: Session, tire_id: int, payload: schemas.MaintenanceTirePayload
):
    tire = (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .filter(
            models.Tire.id == tire_id,
            models.Tire.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not tire:
        return None

    tire.costo_acumulado = (tire.costo_acumulado or 0) + (payload.costo or 0)

    # payload.tipo viene como string; lo convertimos a enum válido
    # Esperado: "desecho" / "renovado" / "reparacion" / etc.
    try:
        tipo_enum = TireEventType(payload.tipo)
    except Exception:
        raise ValueError(f"Tipo de evento inválido: {payload.tipo}")

    if tipo_enum == TireEventType.DESECHO:
        tire.estado = models.TireStatus.DESECHO
        tire.estado_fisico = models.TireCondition.MALA
        tire.unit_id = None
        tire.posicion = None

    elif tipo_enum == TireEventType.RENOVADO:
        tire.estado = models.TireStatus.RENOVADO
        # regla de negocio
        if tire.profundidad_original:
            tire.profundidad_actual = float(tire.profundidad_original) * 0.95
        tire.unit_id = None
        tire.posicion = None

    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=tipo_enum,  # ✅ enum
        descripcion=payload.descripcion,
        costo=payload.costo,
        km=tire.km_recorridos,
        responsable="Mantenimiento",
    )

    db.add(history)
    db.add(tire)
    db.commit()

    db.refresh(tire)
    _enrich_tire_data(tire)
    return tire


# =========================================================
# EDICIÓN (solo cambios reales)
# =========================================================


def update_tire(db: Session, tire_id: int, tire_in: schemas.TireUpdate):
    tire = (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .filter(
            models.Tire.id == tire_id,
            models.Tire.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not tire:
        return None

    incoming_data = tire_in.model_dump(exclude_unset=True)

    # No permitir que te manden auditoría desde front
    for forbidden in (
        "record_status",
        "created_at",
        "updated_at",
        "created_by_id",
        "updated_by_id",
    ):
        incoming_data.pop(forbidden, None)

    changes_map: dict[str, object] = {}
    for field, new_value in incoming_data.items():
        current_value = getattr(tire, field)
        if current_value != new_value:
            changes_map[field] = new_value

    if not changes_map:
        _enrich_tire_data(tire)
        return tire

    # Nota: si cambia precio_compra, ajustar costo_acumulado correctamente
    old_price = tire.precio_compra or 0

    for field, value in changes_map.items():
        setattr(tire, field, value)

    if "precio_compra" in changes_map:
        new_price = tire.precio_compra or 0
        diff = new_price - old_price
        tire.costo_acumulado = (tire.costo_acumulado or 0) + diff

    unit_eco = tire.unit.numero_economico if tire.unit else None
    campos_editados = ", ".join(changes_map.keys())

    history_entry = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=TireEventType.INSPECCION,  # ✅ usa un enum válido (no existe "edicion")
        descripcion=f"Datos editados: {campos_editados}",
        unidad_economico=unit_eco,
        unidad_id=tire.unit_id,
        posicion=tire.posicion,
        km=tire.km_recorridos,
        costo=0,
        responsable="Admin",
    )

    db.add(history_entry)
    db.add(tire)
    db.commit()

    db.refresh(tire)
    _enrich_tire_data(tire)
    return tire


# =========================================================
# DELETE (soft delete -> record_status = E)
# =========================================================


def delete_tire(db: Session, tire_id: int):
    tire = (
        db.query(models.Tire)
        .filter(
            models.Tire.id == tire_id,
            models.Tire.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not tire:
        return False

    tire.record_status = RecordStatus.ELIMINADO
    db.add(tire)
    db.commit()
    return True
