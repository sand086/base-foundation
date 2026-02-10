from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import maintenance as schemas
from datetime import datetime

# --- INVENTARIO ---
def get_inventory(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.InventoryItem).offset(skip).limit(limit).all()

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate):
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        return None
    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_inventory_item(db: Session, item_id: int):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False

# --- MECANICOS ---
def get_mechanics(db: Session):
    return db.query(models.Mechanic).filter(models.Mechanic.activo == True).all()

# --- ORDENES ---
def get_work_orders(db: Session, skip: int = 0, limit: int = 100):
    orders = db.query(models.WorkOrder)\
        .options(joinedload(models.WorkOrder.unit), joinedload(models.WorkOrder.mechanic), joinedload(models.WorkOrder.parts).joinedload(models.WorkOrderPart.item))\
        .order_by(models.WorkOrder.id.desc())\
        .offset(skip).limit(limit).all()
    
    # Mapeo manual para respuesta plana
    for o in orders:
        o.unit_numero = o.unit.numero_economico if o.unit else "N/A"
        o.mechanic_nombre = o.mechanic.nombre if o.mechanic else "Sin Asignar"
        for p in o.parts:
            p.item_sku = p.item.sku if p.item else "N/A"
            
    return orders

def create_work_order(db: Session, order: schemas.WorkOrderCreate):
    # Generar Folio Simple
    count = db.query(models.WorkOrder).count() + 1
    folio = f"OT-{datetime.now().year}-{str(count).zfill(4)}"

    db_order = models.WorkOrder(
        folio=folio,
        unit_id=order.unit_id,
        mechanic_id=order.mechanic_id,
        descripcion_problema=order.descripcion_problema,
        status="abierta"
    )
    db.add(db_order)
    db.flush()

    # Procesar Partes y Descontar Inventario
    for part in order.parts:
        inventory_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == part.inventory_item_id).first()
        if inventory_item:
            # Validar stock (opcional, por ahora permitimos negativos o lanzamos error)
            if inventory_item.stock_actual >= part.cantidad:
                inventory_item.stock_actual -= part.cantidad
            
            db_part = models.WorkOrderPart(
                work_order_id=db_order.id,
                inventory_item_id=part.inventory_item_id,
                cantidad=part.cantidad,
                costo_unitario_snapshot=inventory_item.precio_unitario
            )
            db.add(db_part)
    
    db.commit()
    db.refresh(db_order)
    return db_order

def update_work_order_status(db: Session, order_id: int, status: str):
    order = db.query(models.WorkOrder).filter(models.WorkOrder.id == order_id).first()
    if order:
        order.status = status
        if status == "cerrada":
            order.fecha_cierre = datetime.utcnow()
        db.commit()
        db.refresh(order)
    return order