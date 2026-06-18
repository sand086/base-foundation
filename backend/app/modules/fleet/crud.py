# --- Fuente: crud_operators.py ---
from sqlalchemy.orm import Session

from app.models import models
from app.models.models import RecordStatus
from . import schemas

# =========================================================
# OPERATORS - CRUD con AuditMixin + Soft Delete (E)
# =========================================================


def get_operators(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Operator)
        .filter(models.Operator.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Operator.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_operator(db: Session, operator_id: str):
    return (
        db.query(models.Operator)
        .filter(
            models.Operator.id == operator_id,
            models.Operator.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_operator(
    db: Session, operator: schemas.OperatorCreate, user_id: int
):  # <--- AUDITORÍA PARAM
    # <--- AUDITORÍA: Inyectar quién lo crea
    db_op = models.Operator(**operator.model_dump(), created_by_id=user_id)
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


def update_operator(
    db: Session,
    operator_id: str,
    operator_data: schemas.OperatorUpdate,
    user_id: int,  # <--- AUDITORÍA PARAM
):
    db_op = get_operator(db, operator_id)
    if not db_op:
        return None

    data = operator_data.model_dump(exclude_unset=True)

    for key, value in data.items():
        if value is not None:
            setattr(db_op, key, value)

    # <--- AUDITORÍA: Inyectar quién edita
    db_op.updated_by_id = user_id

    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


def delete_operator(
    db: Session, operator_id: str, user_id: int
):  # <--- AUDITORÍA PARAM
    db_op = (
        db.query(models.Operator)
        .filter(
            models.Operator.id == operator_id,
            models.Operator.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not db_op:
        return False

    db_op.record_status = RecordStatus.ELIMINADO
    db_op.updated_by_id = user_id  # <--- AUDITORÍA: Quién lo eliminó
    db.add(db_op)
    db.commit()
    return True


# --- Fuente: crud_tires.py ---

from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.models.models import RecordStatus, TireEventType
from . import schemas

# =========================================================
# Helpers
# =========================================================


def _enrich_tire_data(tire: models.Tire):
    if tire.unit:
        tire.unidad_actual_economico = tire.unit.numero_economico
        tire.unidad_actual_id = tire.unit.id
    else:
        tire.unidad_actual_economico = None
        tire.unidad_actual_id = None

    if tire.history:
        tire.history.sort(
            key=lambda x: x.fecha.timestamp() if x.fecha else 0, reverse=True
        )


def _visible_tire_query(db: Session):
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


def create_tire(
    db: Session, tire_in: schemas.TireCreate, user_id: int
):  # <--- AUDITORÍA PARAM
    from app.models.models import RecordStatus
    from sqlalchemy.sql import func

    old_deleted_tire = (
        db.query(models.Tire)
        .filter(
            models.Tire.codigo_interno == tire_in.codigo_interno,
            models.Tire.record_status == RecordStatus.ELIMINADO,
        )
        .first()
    )

    if old_deleted_tire:
        old_deleted_tire.codigo_interno = (
            f"{old_deleted_tire.codigo_interno}_DEL_{old_deleted_tire.id}"
        )
        old_deleted_tire.updated_by_id = user_id  # <--- AUDITORÍA
        db.add(old_deleted_tire)
        db.flush()

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
        costo_acumulado=tire_in.precio_compra or 0.0,
        proveedor=tire_in.proveedor,
        estado=tire_in.estado,
        estado_fisico=getattr(tire_in, "estado_fisico", None),
        km_recorridos=0.0,
        unit_id=None,
        posicion=None,
        created_by_id=user_id,  # <--- AUDITORÍA
    )
    db.add(db_tire)
    db.flush()

    history = models.TireHistory(
        tire_id=db_tire.id,
        fecha=func.now(),
        tipo=TireEventType.COMPRA,
        descripcion=f"Alta inicial - Compra a {tire_in.proveedor}",
        costo=tire_in.precio_compra or 0.0,
        responsable="Admin",
        km=0.0,
        created_by_id=user_id,  # <--- AUDITORÍA
    )
    db.add(history)

    db.commit()
    db.refresh(db_tire)
    _enrich_tire_data(db_tire)
    return db_tire


# =========================================================
# ASIGNACIÓN / DESMONTAJE
# =========================================================


def assign_tire(
    db: Session, tire_id: int, payload: schemas.AssignTirePayload, user_id: int
):  # <--- AUDITORÍA PARAM
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

    is_mounting = payload.unit_id is not None
    unit_economico_str = None

    if is_mounting:
        unit = _visible_unit(db, payload.unit_id)
        if not unit:
            raise ValueError("Unidad no encontrada")

        unit_economico_str = unit.numero_economico

        if payload.posicion:
            occupant = (
                db.query(models.Tire)
                .filter(
                    models.Tire.unit_id == payload.unit_id,
                    models.Tire.posicion == payload.posicion,
                    models.Tire.id != tire_id,
                    models.Tire.record_status != RecordStatus.ELIMINADO,
                )
                .first()
            )

            if occupant:
                occupant.unit_id = None
                occupant.posicion = None
                occupant.updated_by_id = (
                    user_id  # <--- AUDITORÍA: El usuario desasignó la llanta vieja
                )

                occ_history = models.TireHistory(
                    tire_id=occupant.id,
                    fecha=datetime.utcnow(),
                    tipo=TireEventType.DESMONTAJE,
                    descripcion=f"Desmontaje por reemplazo (Entra {tire.codigo_interno})",
                    unidad_economico=unit_economico_str,
                    unit_id=payload.unit_id,
                    km=occupant.km_recorridos,
                    responsable="Sistema",
                    created_by_id=user_id,  # <--- AUDITORÍA
                )
                db.add(occ_history)
                db.add(occupant)

        tipo_evento = TireEventType.MONTAJE
        desc = f"Montaje en {unit.numero_economico}"
        if payload.posicion:
            desc += f" - {payload.posicion}"

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

    tire.unit_id = payload.unit_id
    tire.posicion = payload.posicion
    tire.updated_by_id = user_id  # <--- AUDITORÍA

    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=tipo_evento,
        descripcion=desc,
        unidad_economico=unit_economico_str,
        unit_id=payload.unit_id,
        posicion=payload.posicion,
        km=tire.km_recorridos,
        responsable="Operaciones",
        created_by_id=user_id,  # <--- AUDITORÍA
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
    db: Session,
    tire_id: int,
    payload: schemas.MaintenanceTirePayload,
    user_id: int,  # <--- AUDITORÍA PARAM
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
    tire.updated_by_id = user_id  # <--- AUDITORÍA

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
        if tire.profundidad_original:
            tire.profundidad_actual = float(tire.profundidad_original) * 0.95
        tire.unit_id = None
        tire.posicion = None

    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=tipo_enum,
        descripcion=payload.descripcion,
        costo=payload.costo,
        km=tire.km_recorridos,
        responsable="Maintenance",
        created_by_id=user_id,  # <--- AUDITORÍA
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


def update_tire(
    db: Session, tire_id: int, tire_in: schemas.TireUpdate, user_id: int
):  # <--- AUDITORÍA PARAM
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

    old_price = tire.precio_compra or 0

    for field, value in changes_map.items():
        setattr(tire, field, value)

    if "precio_compra" in changes_map:
        new_price = tire.precio_compra or 0
        diff = new_price - old_price
        tire.costo_acumulado = (tire.costo_acumulado or 0) + diff

    tire.updated_by_id = user_id  # <--- AUDITORÍA

    unit_eco = tire.unit.numero_economico if tire.unit else None
    campos_editados = ", ".join(changes_map.keys())

    history_entry = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=TireEventType.INSPECCION,
        descripcion=f"Datos editados: {campos_editados}",
        unidad_economico=unit_eco,
        unit_id=tire.unit_id,
        posicion=tire.posicion,
        km=tire.km_recorridos,
        costo=0,
        responsable="Admin",
        created_by_id=user_id,  # <--- AUDITORÍA
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


def delete_tire(db: Session, tire_id: int, user_id: int):  # <--- AUDITORÍA PARAM
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
    tire.updated_by_id = user_id  # <--- AUDITORÍA
    db.add(tire)
    db.commit()
    return True


# --- Fuente: crud_units.py ---

from datetime import date
from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.models.models import RecordStatus
from . import schemas
import uuid

EXPECTED_TIRES = {
    "TRACTOCAMION": 10,
    "REMOLQUE": 8,
    "DOLLY": 8,
    "RABON": 6,
    "CAMIONETA": 4,
}


def get_unit_last_odometer(db: Session, unit_id: int):
    unit = db.query(models.Unit).filter(models.Unit.id == unit_id).first()
    if unit and str(unit.tipo_1).upper() == "MOTOGENERADOR":
        last_fuel = (
            db.query(models.FuelLog)
            .filter(
                models.FuelLog.unit_id == unit_id,
                models.FuelLog.is_motogenerator == True,
                models.FuelLog.record_status != RecordStatus.ELIMINADO,
            )
            .order_by(models.FuelLog.id.desc())
            .first()
        )
        return last_fuel.horometro if last_fuel and last_fuel.horometro else 0

    last_leg = (
        db.query(models.TripLeg)
        .filter(
            models.TripLeg.unit_id == unit_id,
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .order_by(models.TripLeg.id.desc())
        .first()
    )

    if not last_leg or not last_leg.odometro_final:
        last_fuel = (
            db.query(models.FuelLog)
            .filter(
                models.FuelLog.unit_id == unit_id,
                models.FuelLog.record_status != RecordStatus.ELIMINADO,
            )
            .order_by(models.FuelLog.odometro.desc())
            .first()
        )
        return last_fuel.odometro if last_fuel else 0

    return last_leg.odometro_final


def _update_unit_status(db: Session, unit: models.Unit) -> None:
    if not unit:
        return
    today = date.today()
    razones_bloqueo: list[str] = []

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

    unit_tires = unit.tires or []
    critical_tires = 0
    for t in unit_tires:
        estado_fisico = str(getattr(t, "estado_fisico", "")).lower()
        if "." in estado_fisico:
            estado_fisico = estado_fisico.split(".")[-1]

        profundidad = getattr(t, "profundidad_actual", 0) or 0
        if profundidad <= 3 or estado_fisico == "mala":
            critical_tires += 1

    if critical_tires > 0:
        razones_bloqueo.append(f"{critical_tires} llantas críticas")

    tipo_fisico = str(unit.tipo_1).upper() if unit.tipo_1 else "TRACTOCAMION"
    llantas_esperadas = EXPECTED_TIRES.get(tipo_fisico, 0)

    if llantas_esperadas > 0 and len(unit_tires) < llantas_esperadas:
        faltantes = llantas_esperadas - len(unit_tires)
        razones_bloqueo.append(f"Faltan {faltantes} llantas")

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
        unit.status = "bloqueado"
        unit.razon_bloqueo = new_reason
    else:
        if current_status == "bloqueado":
            unit.status = "disponible"
            unit.razon_bloqueo = None


def get_units(db: Session, skip: int = 0, limit: int = 100):
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


def create_unit(
    db: Session, unit: schemas.UnitCreate, user_id: int
):  # <--- AUDITORÍA PARAM
    data = unit.model_dump()

    if not data.get("public_id"):
        data["public_id"] = f"UNT-{uuid.uuid4().hex[:8].upper()}"

    data["created_by_id"] = user_id  # <--- AUDITORÍA

    db_unit = models.Unit(**data)
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)

    _update_unit_status(db, db_unit)
    db.commit()
    db.refresh(db_unit)

    return db_unit


def update_unit(
    db: Session, unit_id: str, unit_data: schemas.UnitUpdate, user_id: int
):  # <--- AUDITORÍA PARAM
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

    payload.pop("created_at", None)
    payload.pop("updated_at", None)
    payload.pop("created_by_id", None)
    payload.pop("updated_by_id", None)

    if payload.get("record_status") == RecordStatus.ELIMINADO:
        payload.pop("record_status", None)

    for key, value in payload.items():
        setattr(db_unit, key, value)

    db_unit.updated_by_id = user_id  # <--- AUDITORÍA

    _update_unit_status(db, db_unit)

    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


def delete_unit(db: Session, unit_id: str, user_id: int):  # <--- AUDITORÍA PARAM
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
    unit.updated_by_id = user_id  # <--- AUDITORÍA

    db.add(unit)
    db.commit()
    return True
