from __future__ import annotations

import os
import shutil
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.models import models

print("RecordStatus ELIMINADO value =>", models.RecordStatus.ELIMINADO.value)
print("RecordStatus members =>", [e.value for e in models.RecordStatus])
print("models loaded from =>", getattr(models, "__file__", None))


from app.schemas import maintenance as schemas


# -----------------------------
# Helpers
# -----------------------------


def generate_work_order_folio(db: Session) -> str:
    year = datetime.now().year
    count = (
        db.query(models.WorkOrder)
        .filter(models.WorkOrder.folio.like(f"OT-{year}-%"))
        .count()
    )
    return f"OT-{year}-{(count + 1):03d}"


def _not_found(entity: str = "Registro"):
    raise HTTPException(status_code=404, detail=f"{entity} no encontrado")


# -----------------------------
# INVENTORY
# -----------------------------


def list_inventory(
    db: Session, skip: int = 0, limit: int = 100, q: Optional[str] = None
):
    query = db.query(models.InventoryItem).filter(
        models.InventoryItem.record_status != models.RecordStatus.ELIMINADO.value
    )

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (models.InventoryItem.sku.ilike(like))
            | (models.InventoryItem.descripcion.ilike(like))
        )

    return (
        query.order_by(models.InventoryItem.id.desc()).offset(skip).limit(limit).all()
    )


def get_inventory_item(db: Session, item_id: int):
    item = (
        db.query(models.InventoryItem)
        .filter(
            models.InventoryItem.id == item_id,
            models.InventoryItem.record_status != models.RecordStatus.ELIMINADO.value,
        )
        .first()
    )
    if not item:
        _not_found("Item de inventario")
    return item


def create_inventory_item(db: Session, item_in: schemas.InventoryItemCreate):
    db_item = models.InventoryItem(**item_in.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_inventory_item(
    db: Session, item_id: int, item_in: schemas.InventoryItemUpdate
):
    db_item = get_inventory_item(db, item_id)
    for k, v in item_in.model_dump(exclude_unset=True).items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_inventory_item(db: Session, item_id: int):
    # Soft delete: record_status = E
    item = get_inventory_item(db, item_id)
    item.record_status = models.RecordStatus.ELIMINADO.value
    db.commit()
    return True


# -----------------------------
# MECHANICS
# -----------------------------


def list_mechanics(
    db: Session, skip: int = 0, limit: int = 100, only_active: bool = True
):
    query = (
        db.query(models.Mechanic)
        .options(joinedload(models.Mechanic.documents))
        .filter(models.Mechanic.record_status != models.RecordStatus.ELIMINADO.value)
    )

    if only_active:
        query = query.filter(models.Mechanic.activo.is_(True))

    return query.order_by(models.Mechanic.id.desc()).offset(skip).limit(limit).all()


def get_mechanic(db: Session, mechanic_id: int):
    mech = (
        db.query(models.Mechanic)
        .options(joinedload(models.Mechanic.documents))
        .filter(
            models.Mechanic.id == mechanic_id,
            models.Mechanic.record_status != models.RecordStatus.ELIMINADO.value,
        )
        .first()
    )
    if not mech:
        _not_found("Mecánico")
    return mech


def create_mechanic(db: Session, mechanic_in: schemas.MechanicCreate):
    db_mech = models.Mechanic(**mechanic_in.model_dump())
    db.add(db_mech)
    db.commit()
    db.refresh(db_mech)
    return db_mech


def update_mechanic(db: Session, mechanic_id: int, mechanic_in: schemas.MechanicUpdate):
    db_mech = get_mechanic(db, mechanic_id)
    for k, v in mechanic_in.model_dump(exclude_unset=True).items():
        setattr(db_mech, k, v)
    db.commit()
    db.refresh(db_mech)
    return db_mech


def delete_mechanic(db: Session, mechanic_id: int):
    # soft: lo marcamos inactivo + record_status
    db_mech = get_mechanic(db, mechanic_id)
    db_mech.activo = False
    db_mech.record_status = models.RecordStatus.ELIMINADO.value
    db.commit()
    return True


# ---- mechanic documents ----


def upload_mechanic_document(
    db: Session,
    mechanic_id: int,
    doc_type: str,
    file: UploadFile,
    upload_dir: str = "app/uploads/mechanics",
    static_prefix: str = "/static/mechanics",
):
    mechanic = get_mechanic(db, mechanic_id)

    os.makedirs(upload_dir, exist_ok=True)

    clean_filename = f"{mechanic_id}_{doc_type}_{file.filename}".replace(" ", "_")
    file_location = os.path.join(upload_dir, clean_filename)

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url_publica = f"{static_prefix}/{clean_filename}"

    db_doc = models.MechanicDocument(
        mechanic_id=mechanic.id,
        tipo_documento=doc_type,
        nombre_archivo=file.filename,
        url_archivo=url_publica,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc


def list_mechanic_documents(db: Session, mechanic_id: int):
    get_mechanic(db, mechanic_id)
    return (
        db.query(models.MechanicDocument)
        .filter(
            models.MechanicDocument.mechanic_id == mechanic_id,
            models.MechanicDocument.record_status
            != models.RecordStatus.ELIMINADO.value,
        )
        .order_by(models.MechanicDocument.id.desc())
        .all()
    )


def delete_mechanic_document(db: Session, document_id: int):

    print(models.RecordStatus.ELIMINADO.value)

    doc = (
        db.query(models.MechanicDocument)
        .filter(
            models.MechanicDocument.id == document_id,
            models.MechanicDocument.record_status != "E",
        )
        .first()
    )
    if not doc:
        _not_found("Documento")

    # best effort borrar archivo físico
    try:
        relative_path = doc.url_archivo.replace("/static/", "app/uploads/")
        if os.path.exists(relative_path):
            os.remove(relative_path)
    except Exception:
        pass

    doc.record_status = models.RecordStatus.ELIMINADO.value
    db.commit()
    return True


# -----------------------------
# WORK ORDERS
# -----------------------------


def list_work_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[models.WorkOrderStatus] = None,
):
    query = (
        db.query(models.WorkOrder)
        .options(
            joinedload(models.WorkOrder.unit),
            joinedload(models.WorkOrder.mechanic),
            joinedload(models.WorkOrder.parts).joinedload(models.WorkOrderPart.item),
        )
        .filter(models.WorkOrder.record_status != models.RecordStatus.ELIMINADO.value)
    )

    if status:
        query = query.filter(models.WorkOrder.status == status)

    orders = query.order_by(models.WorkOrder.id.desc()).offset(skip).limit(limit).all()

    # campos planos para UI
    for o in orders:
        o.unit_numero = o.unit.numero_economico if o.unit else None
        o.mechanic_nombre = o.mechanic.nombre if o.mechanic else None
        for p in o.parts:
            if p.item:
                p.item_sku = p.item.sku
                p.item_descripcion = p.item.descripcion
            else:
                p.item_sku = "ELIMINADO"
                p.item_descripcion = None

    return orders


def get_work_order(db: Session, order_id: int):
    order = (
        db.query(models.WorkOrder)
        .options(
            joinedload(models.WorkOrder.unit),
            joinedload(models.WorkOrder.mechanic),
            joinedload(models.WorkOrder.parts).joinedload(models.WorkOrderPart.item),
        )
        .filter(
            models.WorkOrder.id == order_id,
            models.WorkOrder.record_status != models.RecordStatus.ELIMINADO.value,
        )
        .first()
    )
    if not order:
        _not_found("Orden de trabajo")

    order.unit_numero = order.unit.numero_economico if order.unit else None
    order.mechanic_nombre = order.mechanic.nombre if order.mechanic else None
    for p in order.parts:
        if p.item:
            p.item_sku = p.item.sku
            p.item_descripcion = p.item.descripcion
        else:
            p.item_sku = "ELIMINADO"
            p.item_descripcion = None

    return order


def create_work_order(db: Session, order_in: schemas.WorkOrderCreate):
    try:
        folio = generate_work_order_folio(db)

        db_order = models.WorkOrder(
            folio=folio,
            unit_id=order_in.unit_id,
            mechanic_id=order_in.mechanic_id,
            descripcion_problema=order_in.descripcion_problema,
            status=models.WorkOrderStatus.ABIERTA,
        )
        db.add(db_order)
        db.flush()  # obtiene id sin commit

        # Partes: bloquear inventario, validar stock, snapshot costo
        for part in order_in.parts:
            item = (
                db.query(models.InventoryItem)
                .filter(models.InventoryItem.id == part.inventory_item_id)
                .with_for_update()
                .first()
            )
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Refacción con ID {part.inventory_item_id} no encontrada",
                )
            if item.record_status == models.RecordStatus.ELIMINADO.value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Refacción {item.sku} está eliminada",
                )
            if item.stock_actual < part.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {item.sku}. Disponible: {item.stock_actual}",
                )

            db_part = models.WorkOrderPart(
                work_order_id=db_order.id,
                inventory_item_id=item.id,
                cantidad=part.cantidad,
                costo_unitario_snapshot=item.precio_unitario,
            )
            item.stock_actual -= part.cantidad
            db.add(db_part)

        db.commit()
        return get_work_order(db, db_order.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear orden: {str(e)}")


def update_work_order_status(
    db: Session, order_id: int, status: models.WorkOrderStatus
):
    order = db.query(models.WorkOrder).filter(models.WorkOrder.id == order_id).first()
    if not order:
        _not_found("Orden de trabajo")

    order.status = status
    if status == models.WorkOrderStatus.CERRADA:
        order.fecha_cierre = datetime.now(timezone.utc)

    db.commit()
    return get_work_order(db, order_id)


def delete_work_order(db: Session, order_id: int):
    # Soft delete: record_status
    order = db.query(models.WorkOrder).filter(models.WorkOrder.id == order_id).first()
    if not order:
        _not_found("Orden de trabajo")
    order.record_status = models.RecordStatus.ELIMINADO.value
    db.commit()
    return True
