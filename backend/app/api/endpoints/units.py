from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import units as schemas
from app.crud import units as crud

router = APIRouter()


@router.get("/units", response_model=List[schemas.UnitResponse])
def read_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_units(db, skip=skip, limit=limit)


@router.post("/units", response_model=schemas.UnitResponse)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    if (
        db.query(models.Unit)
        .filter(models.Unit.numero_economico == unit.numero_economico)
        .first()
    ):
        raise HTTPException(status_code=400, detail="El número económico ya existe")
    return crud.create_unit(db, unit)


@router.put("/units/{unit_id}", response_model=schemas.UnitResponse)
def update_unit(unit_id: str, unit: schemas.UnitUpdate, db: Session = Depends(get_db)):
    db_unit = crud.update_unit(db, unit_id, unit)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return db_unit


@router.delete("/units/{unit_id}")
def delete_unit(unit_id: str, db: Session = Depends(get_db)):
    if not crud.delete_unit(db, unit_id):
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"message": "Unidad eliminada"}
