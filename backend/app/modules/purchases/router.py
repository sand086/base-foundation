from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db

# Importamos schemas y crud locales
from . import schemas, crud

router = APIRouter(prefix="/purchases", tags=["Purchases"])


@router.post("/orders", response_model=schemas.PurchaseOrderResponse)
def create_purchase_order(
    order: schemas.PurchaseOrderCreate, db: Session = Depends(get_db)
):
    """
    Crea una nueva Orden de Compra desde el Wizard.
    Nace con estatus PENDIENTE.
    """
    # NOTA: Aquí asumo user_id=1. Si ya tienes Auth, usa current_user.id
    current_user_id = 1
    return crud.create_purchase_order(
        db=db, order_data=order.model_dump(), user_id=current_user_id
    )


@router.post("/orders/{order_id}/receive", response_model=schemas.PurchaseOrderResponse)
def receive_purchase_order(order_id: int, db: Session = Depends(get_db)):
    """
    Dispara la magia:
    1. Suma el stock al inventario (Si es tipo compra).
    2. Crea la Provisión PPD en CxP (Finanzas).
    """
    try:
        return crud.receive_purchase_order(db=db, order_id=order_id)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/orders", response_model=List[schemas.PurchaseOrderResponse])
def list_purchase_orders(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """
    Obtiene la lista de todas las Órdenes de Compra.
    """
    from app.models import models

    return (
        db.query(models.PurchaseOrder)
        .order_by(models.PurchaseOrder.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
