from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import tires as schemas
from datetime import datetime

# --- LECTURA ---


def get_tires(db: Session, skip: int = 0, limit: int = 100):
    # Eager load 'unit' y 'history' para optimizar
    tires = (
        db.query(models.Tire)
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))
        .order_by(models.Tire.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Enriquecer datos para el frontend
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
    """Helper para validar duplicados"""
    return db.query(models.Tire).filter(models.Tire.codigo_interno == codigo).first()


def _enrich_tire_data(tire):
    """Helper para aplanar datos relacionales que espera el frontend"""
    if tire.unit:
        tire.unidad_actual_economico = tire.unit.numero_economico
        tire.unidad_actual_id = tire.unit.id
    else:
        tire.unidad_actual_economico = None
        tire.unidad_actual_id = None

    # Ordenar historial por fecha descendente si existe
    if tire.history:
        tire.history.sort(key=lambda x: x.fecha, reverse=True)


# --- CREACIÓN ---


def create_tire(db: Session, tire_in: schemas.TireCreate):
    # 1. Crear Objeto Llanta
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
        unit_id=None,  # Nace en Stock
        posicion=None,
    )
    db.add(db_tire)
    db.flush()  # Para obtener el ID

    # 2. Registrar Historial de Compra
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


# --- OPERACIONES (Asignar / Mantenimiento) ---


def assign_tire(db: Session, tire_id: int, payload: schemas.AssignTirePayload):
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return None

    # Determinar si es Montaje o Desmontaje
    is_mounting = payload.unidad_id is not None

    unit_economico_str = None

    if is_mounting:
        # Verificar unidad
        unit = db.query(models.Unit).filter(models.Unit.id == payload.unidad_id).first()
        if not unit:
            raise ValueError("La unidad especificada no existe")
        unit_economico_str = unit.numero_economico

        # LOGICA DE DESMONTAJE AUTOMÁTICO (Ocupante previo)
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

                # CORRECCIÓN AQUÍ: unidad_economico
                occ_history = models.TireHistory(
                    tire_id=occupant.id,
                    fecha=datetime.utcnow(),
                    tipo="desmontaje",
                    descripcion=f"Desmontaje automático por reemplazo (Entra llanta {tire.codigo_interno})",
                    unidad_economico=unit_economico_str,  # <--- CORREGIDO (antes decía unidad)
                    unidad_id=payload.unidad_id,  # Opcional: guardamos también el ID si el modelo lo tiene
                    posicion=payload.posicion,
                    km=occupant.km_recorridos,
                    responsable="Sistema",
                )
                db.add(occ_history)
                db.add(occupant)

        tipo_evento = "montaje"
        desc = f"Montaje en unidad {unit.numero_economico}"
        if payload.posicion:
            desc += f" - Pos {payload.posicion}"
    else:
        tipo_evento = "desmontaje"
        desc = "Desmontaje - Enviada a Almacén"

    if payload.notas:
        desc += f". Notas: {payload.notas}"

    # Actualizar Llanta
    tire.unit_id = payload.unidad_id
    tire.posicion = payload.posicion

    if tire.estado == "nuevo" and is_mounting:
        tire.estado = "usado"

    # CORRECCIÓN AQUÍ: unidad_economico
    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=tipo_evento,
        descripcion=desc,
        unidad_economico=unit_economico_str,  # <--- CORREGIDO (antes decía unidad)
        unidad_id=payload.unidad_id,  # Opcional: guardamos también el ID si el modelo lo tiene
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

    # Actualizar acumulados
    tire.costo_acumulado += payload.costo

    # Lógica por tipo
    if payload.tipo == "desecho":
        tire.estado = "desecho"
        tire.estado_fisico = "mala"
        tire.unit_id = None
        tire.posicion = None
    elif payload.tipo == "renovado":
        tire.estado = "renovado"
        # Recupera vida útil aprox (ej. 95% de original)
        tire.profundidad_actual = tire.profundidad_original * 0.95
        tire.unit_id = None
        tire.posicion = None

    # Historial
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


# --- EDICIÓN Y ELIMINACIÓN (LO QUE TE FALTABA) ---


def update_tire(db: Session, tire_id: int, tire_in: schemas.TireUpdate):
    """Actualiza datos básicos de la llanta"""
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return None

    # Usamos model_dump con exclude_unset para actualizar solo lo enviado
    update_data = tire_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(tire, field, value)

    db.add(tire)
    db.commit()
    db.refresh(tire)
    _enrich_tire_data(tire)
    return tire


def delete_tire(db: Session, tire_id: int):
    """Elimina la llanta física y lógicamente"""
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if not tire:
        return False

    db.delete(tire)
    db.commit()
    return True
