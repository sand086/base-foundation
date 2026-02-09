from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import operators as schemas
from app.crud import operators as crud

router = APIRouter()


@router.get("/operators", response_model=List[schemas.OperatorResponse])
def read_operators(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_operators(db, skip, limit)


@router.post("/operators", response_model=schemas.OperatorResponse)
def create_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    if (
        db.query(models.Operator)
        .filter(models.Operator.license_number == operator.license_number)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Licencia ya registrada")
    return crud.create_operator(db, operator)


@router.put("/operators/{operator_id}", response_model=schemas.OperatorResponse)
def update_operator(
    operator_id: int, operator: schemas.OperatorUpdate, db: Session = Depends(get_db) # <--- int
):
    db_op = crud.update_operator(db, operator_id, operator)
    if not db_op:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return db_op


@router.delete("/operators/{operator_id}")
def delete_operator(operator_id: int, db: Session = Depends(get_db)):
    if not crud.delete_operator(db, operator_id):
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return {"message": "Operador eliminado"}
