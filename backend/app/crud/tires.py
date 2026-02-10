from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import tires as schemas
from datetime import datetime

def get_tires(db: Session, skip: int = 0, limit: int = 100):
    # Eager load 'unit' y 'history' para optimizar
    tires = db.query(models.Tire)\
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))\
        .order_by(models.Tire.id.asc())\
        .offset(skip).limit(limit).all()
    
    # Mapeo manual ligero para facilitar la vida a Pydantic
    for t in tires:
        t.unidad_actual_id = t.unit_id
        t.unidad_actual_economico = t.unit.numero_economico if t.unit else None
        # Para el historial, mapeamos unidad_economico a 'unidad' que espera el front
        for h in t.history:
            h.unidad = h.unidad_economico
            
    return tires

def get_tire(db: Session, tire_id: int):
    tire = db.query(models.Tire)\
        .options(joinedload(models.Tire.unit), joinedload(models.Tire.history))\
        .filter(models.Tire.id == tire_id).first()
    
    if tire:
        tire.unidad_actual_id = tire.unit_id
        tire.unidad_actual_economico = tire.unit.numero_economico if tire.unit else None
        for h in tire.history:
            h.unidad = h.unidad_economico
    return tire

def create_tire(db: Session, tire: schemas.TireCreate):
    # 1. Crear Llanta
    db_tire = models.Tire(
        codigo_interno=tire.codigo_interno,
        marca=tire.marca,
        modelo=tire.modelo,
        medida=tire.medida,
        dot=tire.dot,
        profundidad_original=tire.profundidad_original,
        profundidad_actual=tire.profundidad_actual,
        fecha_compra=tire.fecha_compra,
        precio_compra=tire.precio_compra,
        costo_acumulado=tire.precio_compra, # Costo inicial = precio compra
        proveedor=tire.proveedor,
        estado=tire.estado,
        estado_fisico=tire.estado_fisico,
        km_recorridos=0,
        unit_id=None, # Nace en almacén
        posicion=None
    )
    db.add(db_tire)
    db.flush() # Generar ID

    # 2. Crear Evento Historial Inicial (Compra)
    history = models.TireHistory(
        tire_id=db_tire.id,
        fecha=datetime.utcnow(),
        tipo="compra",
        descripcion=f"Compra inicial a {tire.proveedor or 'Proveedor'}",
        costo=tire.precio_compra,
        responsable="Admin", # Podrías sacar esto del usuario logueado
        km=0
    )
    db.add(history)
    db.commit()
    db.refresh(db_tire)
    return db_tire

def assign_tire(db: Session, tire_id: int, payload: schemas.AssignTirePayload):
    tire = get_tire(db, tire_id)
    if not tire:
        return None

    # Obtener datos de la unidad si existe (para guardar snapshot en historial)
    unit_eco = None
    if payload.unidad_id:
        unit = db.query(models.Unit).filter(models.Unit.id == payload.unidad_id).first()
        if unit:
            unit_eco = unit.numero_economico

    # Determinar tipo de evento
    # Si hay unidad_id -> Montaje. Si es None -> Desmontaje (Almacén)
    event_type = "montaje" if payload.unidad_id else "desmontaje"
    
    desc_accion = f"Montaje en {unit_eco}" if unit_eco else "Enviado a Almacén/Stock"
    desc_pos = f" - {payload.posicion}" if payload.posicion else ""
    desc_notas = f". {payload.notas}" if payload.notas else ""
    
    full_desc = f"{desc_accion}{desc_pos}{desc_notas}"

    # Actualizar estado de la Llanta
    tire.unit_id = payload.unidad_id
    tire.posicion = payload.posicion
    
    # Crear Historial
    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=event_type,
        descripcion=full_desc,
        unidad_id=payload.unidad_id,
        unidad_economico=unit_eco, # Guardamos texto por si borran la unidad en el futuro
        posicion=payload.posicion,
        km=tire.km_recorridos,
        responsable="Operaciones"
    )
    db.add(history)
    db.commit()
    db.refresh(tire)
    return tire

def register_maintenance(db: Session, tire_id: int, payload: schemas.MaintenanceTirePayload):
    tire = get_tire(db, tire_id)
    if not tire:
        return None

    # Actualizar costo acumulado
    tire.costo_acumulado += payload.costo
    
    # Lógica específica por tipo
    if payload.tipo == "renovado":
        tire.estado = "renovado"
        # Asumimos que recupera profundidad (esto podría ser un input extra)
        tire.profundidad_actual = tire.profundidad_original * 0.90 
        tire.unit_id = None # Se desmonta para ir a renovadora
        tire.posicion = None
        
    elif payload.tipo == "desecho":
        tire.estado = "desecho"
        tire.estado_fisico = "mala"
        tire.unit_id = None # Ya no está en unidad
        tire.posicion = None

    # Historial
    history = models.TireHistory(
        tire_id=tire.id,
        fecha=datetime.utcnow(),
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        costo=payload.costo,
        km=tire.km_recorridos,
        responsable="Taller"
    )
    db.add(history)
    db.commit()
    db.refresh(tire)
    return tire

def delete_tire(db: Session, tire_id: int):
    tire = db.query(models.Tire).filter(models.Tire.id == tire_id).first()
    if tire:
        db.delete(tire)
        db.commit()
        return True
    return False