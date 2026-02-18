from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas import maintenance as schemas
from app.crud import maintenance as crud

router = APIRouter()


# --- INVENTARIO ---
@router.get("/inventory", response_model=List[schemas.InventoryItemResponse])
def read_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_inventory(db, skip, limit)


@router.post("/inventory", response_model=schemas.InventoryItemResponse)
def create_inventory_item(
    item: schemas.InventoryItemCreate, db: Session = Depends(get_db)
):
    return crud.create_inventory_item(db, item)


@router.put("/inventory/{item_id}", response_model=schemas.InventoryItemResponse)
def update_inventory_item(
    item_id: int, item: schemas.InventoryItemUpdate, db: Session = Depends(get_db)
):
    db_item = crud.update_inventory_item(db, item_id, item)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return db_item


@router.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    if not crud.delete_inventory_item(db, item_id):
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return {"message": "Eliminado"}


# --- MECANICOS ---


@router.get("/mechanics", response_model=List[schemas.MechanicResponse])
def read_mechanics(db: Session = Depends(get_db)):
    return crud.get_mechanics(db)


@router.post("/mechanics", response_model=schemas.MechanicResponse)
def create_mechanic(mechanic: schemas.MechanicCreate, db: Session = Depends(get_db)):
    return crud.create_mechanic(db, mechanic)


@router.put("/mechanics/{mechanic_id}", response_model=schemas.MechanicResponse)
def update_mechanic(
    mechanic_id: int, mechanic: schemas.MechanicUpdate, db: Session = Depends(get_db)
):
    db_mech = crud.update_mechanic(db, mechanic_id, mechanic)
    if not db_mech:
        raise HTTPException(status_code=404, detail="Mecánico no encontrado")
    return db_mech


@router.post("/mechanics/{mechanic_id}/documents/{doc_type}")
def upload_mechanic_document(
    mechanic_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return crud.upload_mechanic_document(db, mechanic_id, doc_type, file)


@router.get(
    "/mechanics/{mechanic_id}/documents",
    response_model=List[schemas.MechanicDocumentResponse],
)
def get_mechanic_documents(mechanic_id: int, db: Session = Depends(get_db)):
    return crud.get_mechanic_documents(db, mechanic_id)


@router.delete("/mechanics/documents/{document_id}")
def delete_mechanic_document(document_id: int, db: Session = Depends(get_db)):
    if not crud.delete_mechanic_document(db, document_id):
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"message": "Documento eliminado"}


# --- ORDENES ---


@router.get("/work-orders", response_model=List[schemas.WorkOrderResponse])
def read_work_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_work_orders(db, skip, limit)


@router.post("/work-orders", response_model=schemas.WorkOrderResponse)
def create_work_order(order: schemas.WorkOrderCreate, db: Session = Depends(get_db)):
    return crud.create_work_order(db, order)


@router.patch("/work-orders/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = crud.update_work_order_status(db, order_id, status)
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order
