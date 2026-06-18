# --- Fuente: maintenance/router.py ---
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db

# <--- AUDITORÍA IMPORTACIONES: Para poder obtener al usuario actual
from app.models import models
from app.modules.auth.router import get_current_user

#  importacion LOCAL (FSD): Busca dentro de la misma carpeta "maintenance"
from . import schemas, crud

#  ÚNICA INSTANCIA DEL ROUTER CON SU TAG
router = APIRouter(tags=["Maintenance"])

# =========================================================
# INVENTARIO (Inventory)
# =========================================================


@router.get("/inventory", response_model=List[schemas.InventoryItemResponse])
def read_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_inventory(db, skip=skip, limit=limit)


@router.post("/inventory", response_model=schemas.InventoryItemResponse)
def create_inventory_item(
    item: schemas.InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        return crud.create_inventory_item(
            db, item, user_id=current_user.id
        )  # <--- AUDITORÍA
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear: Es posible que el SKU o nombre del artículo ya esté registrado.",
        )


@router.put("/inventory/{item_id}", response_model=schemas.InventoryItemResponse)
def update_inventory_item(
    item_id: int,
    item: schemas.InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        db_item = crud.update_inventory_item(
            db, item_id, item, user_id=current_user.id
        )  # <--- AUDITORÍA
        if not db_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado"
            )
        return db_item
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al actualizar: El SKU ya está en uso por otro artículo.",
        )


@router.delete("/inventory/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        if not crud.delete_inventory_item(
            db, item_id, user_id=current_user.id
        ):  # <--- AUDITORÍA
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado"
            )
        return {"message": "Eliminado correctamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar este artículo porque está siendo usado en Órdenes de Trabajo.",
        )


# =========================================================
# MECÁNICOS (Mechanics)
# =========================================================


@router.get("/mechanics", response_model=List[schemas.MechanicResponse])
def read_mechanics(db: Session = Depends(get_db)):
    return crud.list_mechanics(db)


@router.post("/mechanics", response_model=schemas.MechanicResponse)
def create_mechanic(
    mechanic: schemas.MechanicCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        return crud.create_mechanic(
            db, mechanic, user_id=current_user.id
        )  # <--- AUDITORÍA
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RFC, NSS o correo del mecánico ya está registrado.",
        )


@router.put("/mechanics/{mechanic_id}", response_model=schemas.MechanicResponse)
def update_mechanic(
    mechanic_id: int,
    mechanic: schemas.MechanicUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        db_mech = crud.update_mechanic(
            db, mechanic_id, mechanic, user_id=current_user.id
        )  # <--- AUDITORÍA
        if not db_mech:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Mecánico no encontrado"
            )
        return db_mech
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflicto de datos: El RFC o correo proporcionado pertenece a otro mecánico.",
        )


@router.post("/mechanics/{mechanic_id}/documents/{doc_type}")
def upload_mechanic_document(
    mechanic_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        return crud.upload_mechanic_document(
            db, mechanic_id, doc_type, file, user_id=current_user.id
        )  # <--- AUDITORÍA
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de base de datos al intentar guardar el documento.",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al procesar el archivo: {str(e)}",
        )


@router.get(
    "/mechanics/{mechanic_id}/documents",
    response_model=List[schemas.MechanicDocumentResponse],
)
def get_mechanic_documents(mechanic_id: int, db: Session = Depends(get_db)):
    return crud.list_mechanic_documents(db, mechanic_id)


@router.delete("/mechanics/documents/{document_id}")
def delete_mechanic_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    if not crud.delete_mechanic_document(
        db, document_id, user_id=current_user.id
    ):  # <--- AUDITORÍA
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado"
        )
    return {"message": "Documento eliminado"}


# =========================================================
# ÓRDENES DE TRABAJO (Work Orders)
# =========================================================


@router.get("/work-orders", response_model=List[schemas.WorkOrderResponse])
def read_work_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_work_orders(db, skip=skip, limit=limit)


@router.post("/work-orders", response_model=schemas.WorkOrderResponse)
def create_work_order(
    order: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        return crud.create_work_order(
            db, order, user_id=current_user.id
        )  # <--- AUDITORÍA
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear la orden: Verifica que la unidad exista y que el folio no esté duplicado.",
        )


@router.patch(
    "/work-orders/{order_id}/status", response_model=schemas.WorkOrderResponse
)
def update_order_status(
    order_id: int,
    payload: schemas.WorkOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    try:
        order = crud.update_work_order_status(
            db, order_id, payload.status, user_id=current_user.id
        )  # <--- AUDITORÍA
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada"
            )
        return order
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al intentar cambiar el estado de la orden.",
        )


@router.put("/work-orders/{order_id}", response_model=schemas.WorkOrderResponse)
def update_work_order(
    order_id: int,
    order: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    updated_order = crud.update_work_order(
        db=db, order_id=order_id, order_in=order, user_id=current_user.id
    )  # <--- AUDITORÍA
    return updated_order


@router.delete("/work-orders/{order_id}")
def delete_work_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # <--- AUDITORÍA
):
    # Llama a tu función que hace el Soft Delete perfecto
    crud.delete_work_order(
        db=db, order_id=order_id, user_id=current_user.id
    )  # <--- AUDITORÍA
    return {"message": "Orden de trabajo eliminada correctamente"}
