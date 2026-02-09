from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import tires as schemas
from app.crud import tires as crud

router = APIRouter()

@router.get("/tires", response_model=List[schemas.TireResponse])
def read_tires(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_tires(db, skip, limit)

@router.get("/tires/{tire_id}", response_model=schemas.TireResponse)
def read_tire(tire_id: int, db: Session = Depends(get_db)):
    tire = crud.get_tire(db, tire_id)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return tire

@router.post("/tires", response_model=schemas.TireResponse)
def create_tire(tire: schemas.TireCreate, db: Session = Depends(get_db)):
    # Validar que el código interno (ID visual) no exista
    existing = db.query(models.Tire).filter(models.Tire.codigo_interno == tire.codigo_interno).first()
    if existing:
        raise HTTPException(status_code=400, detail="El código de llanta ya existe")
    return crud.create_tire(db, tire)

@router.post("/tires/{tire_id}/assign")
def assign_tire(tire_id: int, payload: schemas.AssignTirePayload, db: Session = Depends(get_db)):
    tire = crud.assign_tire(db, tire_id, payload)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return {"message": "Asignación exitosa", "tire_id": tire.id}

@router.post("/tires/{tire_id}/maintenance")
def maintenance_tire(tire_id: int, payload: schemas.MaintenanceTirePayload, db: Session = Depends(get_db)):
    tire = crud.register_maintenance(db, tire_id, payload)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return {"message": "Mantenimiento registrado", "tire_id": tire.id}

@router.delete("/tires/{tire_id}")
def delete_tire(tire_id: int, db: Session = Depends(get_db)):
    if not crud.delete_tire(db, tire_id):
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return {"message": "Llanta eliminada"}