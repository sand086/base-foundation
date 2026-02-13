from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import tires as schemas
from datetime import datetime

# --- LECTURA ---


def get_tires(db: Session, skip: int = 0, limit: int = 100):
    tires = (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .order_by(models.Tire.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for tire in tires:
        _enrich_tire_data(tire)
    return tires


def get_tire(db: Session, tire_id: int):
    tire = (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .filter(models.Tire.id == tire_id)
        .first()
    )
    if tire:
        _enrich_tire_data(tire)
    return tire


def get_tire_by_code(db: Session, codigo: str):
    return db.query(models.Tire).filter(models.Tire.codigo_interno == codigo).first()


def _enrich_tire_data(tire):
    if tire.unit:
        tire.unidad_actual_economico = tire.unit.numero_economico
        tire.unidad_actual_id = tire.unit.id
    else:
        tire.unidad_actual_economico = None
        tire.unidad_actual_id = None

    if tire.history:
        tire.history.sort(key=lambda x: x.fecha, reverse=True)


# --- CREACIÓN ---


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
        estado=tire_in.estado,
        km_recorridos=0,
        unit_id=None,
        posicion=None,
    )
    db.add(db_tire)
    db.flush()

    history = models.TireHistory(
        tire_id=db_tire.id,
        fecha=datetime.utcnow(),
        tipo="compra",
        descripcion=f"Alta inicial - Compra a {tire_in.proveedor}",
        costo=tire_in.precio_compra,
        responsable="Admin",
        km=0,
    )
    db.add(history)
    db.commit()
    db.refresh(db_tire)
    return db_tire


# --- MANTENIMIENTO Y ASIGNACIÓN ---


def assign_tire(db: Session, tire_id: int, payload: schemas.AssignTirePayload):
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return None

    is_mounting = payload.unidad_id is not None
    unit_economico_str = None

    if is_mounting:
        unit = db.query(models.Unit).filter(models.Unit.id == payload.unidad_id).first()
        if not unit:
            raise ValueError("Unidad no encontrada")
        unit_economico_str = unit.numero_economico

        if payload.posicion:
            occupant = (
                db.query(models.Tire)
                .filter(
                    models.Tire.unit_id == payload.unidad_id,
                    models.Tire.posicion == payload.posicion,
                    models.Tire.id != tire_id,
                )
                .first()
            )

            if occupant:
                occupant.unit_id = None
                occupant.posicion = None
                occ_history = models.TireHistory(
                    tire_id=occupant.id,
                    fecha=datetime.utcnow(),
                    tipo="desmontaje",
                    descripcion=f"Desmontaje por reemplazo (Entra {tire.codigo_interno})",
                    unidad_economico=unit_economico_str,
                    km=occupant.km_recorridos,
                    responsable="Sistema",
                )
                db.add(occ_history)
                db.add(occupant)

        tipo_evento = "montaje"
        desc = f"Montaje en {unit.numero_economico}"
        if payload.posicion:
            desc += f" - {payload.posicion}"
    else:
        tipo_evento = "desmontaje"
        desc = "Desmontaje - Enviada a Almacén"

    if payload.notas:
        desc += f". Notas: {payload.notas}"

    tire.unit_id = payload.unidad_id
    tire.posicion = payload.posicion

    if tire.estado == "nuevo" and is_mounting:
        tire.estado = "usado"

    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=tipo_evento,
        descripcion=desc,
        unidad_economico=unit_economico_str,
        unidad_id=payload.unidad_id,
        posicion=payload.posicion,
        km=tire.km_recorridos,
        responsable="Operaciones",
    )

    db.add(history)
    db.commit()
    db.refresh(tire)
    _enrich_tire_data(tire)
    return tire


def register_maintenance(
    db: Session, tire_id: int, payload: schemas.MaintenanceTirePayload
):
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return None

    tire.costo_acumulado += payload.costo

    if payload.tipo == "desecho":
        tire.estado = "desecho"
        tire.estado_fisico = "mala"
        tire.unit_id = None
        tire.posicion = None
    elif payload.tipo == "renovado":
        tire.estado = "renovado"
        tire.profundidad_actual = tire.profundidad_original * 0.95
        tire.unit_id = None
        tire.posicion = None

    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        costo=payload.costo,
        km=tire.km_recorridos,
        responsable="Mantenimiento",
    )

    db.add(history)
    db.commit()
    db.refresh(tire)
    _enrich_tire_data(tire)
    return tire


# --- EDICIÓN (LÓGICA CORREGIDA: SOLO CAMBIOS REALES) ---


def update_tire(db: Session, tire_id: int, tire_in: schemas.TireUpdate):
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return None

    # 1. Obtener todos los datos que envía el frontend
    incoming_data = tire_in.model_dump(exclude_unset=True)

    # 2. Filtrar: ¿Qué dato es diferente al que ya está en la DB?
    changes_map = {}
    for field, new_value in incoming_data.items():
        current_value = getattr(tire, field)
        # Comparamos valor actual vs nuevo valor
        if current_value != new_value:
            changes_map[field] = new_value

    # Si después de filtrar no queda nada, no hacemos nada (ahorramos log basura)
    if not changes_map:
        return tire

    # 3. Actualizar la Llanta
    for field, value in changes_map.items():
        setattr(tire, field, value)

        # Ajuste de costo acumulado si cambia el precio base
        if field == "precio_compra":
            old_price = tire.precio_compra or 0
            diff = value - old_price
            tire.costo_acumulado = (tire.costo_acumulado or 0) + diff

    # 4. Crear Historial con SOLO los campos cambiados
    unit_eco = None
    if tire.unit:
        unit_eco = tire.unit.numero_economico

    # Generamos la lista bonita: "Datos editados: marca, modelo"
    campos_editados = ", ".join(changes_map.keys())

    history_entry = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo="edicion",
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


def delete_tire(db: Session, tire_id: int):
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return False
    db.delete(tire)
    db.commit()
    return True
