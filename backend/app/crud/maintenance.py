from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select  # Opcional, pero moderno
from fastapi import HTTPException  # <--- IMPORTANTE: Faltaba esto
from app.models import models
from app.schemas import maintenance as schemas
from datetime import datetime, timezone  # <--- Para fechas con zona horaria

# --- helpers ---


def generate_work_order_folio(db: Session):
    year = datetime.now().year
    # Contar órdenes del año actual para el consecutivo
    count = (
        db.query(models.WorkOrder)
        .filter(models.WorkOrder.folio.like(f"OT-{year}-%"))
        .count()
    )
    return f"OT-{year}-{(count + 1):03d}"


# --- INVENTARIO ---
def get_inventory(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.InventoryItem).offset(skip).limit(limit).all()


def create_inventory_item(db: Session, item: schemas.InventoryItemCreate):
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_inventory_item(
    db: Session, item_id: int, item_update: schemas.InventoryItemUpdate
):
    db_item = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.id == item_id)
        .first()
    )
    if not db_item:
        return None
    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_inventory_item(db: Session, item_id: int):
    item = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.id == item_id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
        return True
    return False


# --- MECANICOS ---
def get_mechanics(db: Session):
    # Uso de is_(True) es más "SQLAlchemy-way", aunque == True funciona
    return db.query(models.Mechanic).filter(models.Mechanic.activo.is_(True)).all()


# --- ORDENES ---
def get_work_orders(db: Session, skip: int = 0, limit: int = 100):
    orders = (
        db.query(models.WorkOrder)
        .options(
            joinedload(models.WorkOrder.unit),
            joinedload(models.WorkOrder.mechanic),
            joinedload(models.WorkOrder.parts).joinedload(models.WorkOrderPart.item),
        )
        .order_by(models.WorkOrder.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    if not orders:
        return []

    # Mapeo manual para respuesta plana (Correcto para Pydantic from_attributes)
    for o in orders:
        o.unit_numero = o.unit.numero_economico if o.unit else "N/A"
        o.mechanic_nombre = o.mechanic.nombre if o.mechanic else "Sin Asignar"
        for p in o.parts:
            # Validación extra por si se borró el item físico pero quedó el registro
            p.item_sku = p.item.sku if p.item else "ELIMINADO"

    return orders


def create_work_order(db: Session, order_in: schemas.WorkOrderCreate):
    try:
        # 1. Generar Folio
        new_folio = generate_work_order_folio(db)

        # 2. Crear cabecera de la Orden
        db_order = models.WorkOrder(
            folio=new_folio,
            unit_id=order_in.unit_id,
            mechanic_id=order_in.mechanic_id,
            descripcion_problema=order_in.descripcion_problema,
            status=models.WorkOrderStatus.ABIERTA,
        )
        db.add(db_order)
        db.flush()  # Para obtener el ID de db_order sin confirmar transacción global

        # 3. Procesar Partes e Inventario
        for part in order_in.parts:
            # Bloquear fila para update (with_for_update) evita condiciones de carrera
            item = (
                db.query(models.InventoryItem)
                .filter(models.InventoryItem.id == part.inventory_item_id)
                .with_for_update()  # <--- RECOMENDADO: Bloquea la fila mientras restamos
                .first()
            )

            # --- CORRECCIÓN CRÍTICA: Validar si el item existe ---
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Refacción con ID {part.inventory_item_id} no encontrada",
                )

            # Validar Stock
            if item.stock_actual < part.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {item.sku}. Disponible: {item.stock_actual}",
                )

            # Crear registro de parte usada
            db_part = models.WorkOrderPart(
                work_order_id=db_order.id,
                inventory_item_id=part.inventory_item_id,
                cantidad=part.cantidad,
                costo_unitario_snapshot=item.precio_unitario,
            )

            # Descontar del inventario
            item.stock_actual -= part.cantidad
            db.add(db_part)

        db.commit()
        db.refresh(db_order)
        return db_order

    except HTTPException as he:
        # Si es un error nuestro (400/404), hacemos rollback y lo relanzamos
        db.rollback()
        raise he
    except Exception as e:
        # Cualquier otro error de base de datos
        db.rollback()
        # Opcional: Loggear el error real aquí
        raise HTTPException(status_code=500, detail=f"Error al crear orden: {str(e)}")


def update_work_order_status(db: Session, order_id: int, status: str):
    order = db.query(models.WorkOrder).filter(models.WorkOrder.id == order_id).first()
    if order:
        order.status = status
        if status == "cerrada":
            # Usar timezone aware datetime
            order.fecha_cierre = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
    return order
