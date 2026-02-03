# Flota y Operadores + carga masiva

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app import crud

router = APIRouter()


# --- UNIDADES ---
@router.get("/flota/unidades", response_model=List[schemas.UnitResponse])
def list_units(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.get_units(db, skip=skip, limit=limit, status=status, tipo=tipo)


@router.get("/flota/unidades/disponibles")
def list_available_units(
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_available_units_for_dispatch(db, unit_type=tipo)


@router.post("/flota/unidades", response_model=schemas.UnitResponse, status_code=201)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.Unit)
        .filter(models.Unit.numero_economico == unit.numero_economico)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Número económico ya registrado")
    return crud.create_unit(db, unit)


@router.patch("/flota/unidades/{unit_id}/status")
def update_unit_status(
    unit_id: str, status: str = Query(...), db: Session = Depends(get_db)
):
    unit = crud.update_unit_status(db, unit_id, status)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"message": "Status actualizado", "unit_id": unit_id, "new_status": status}


# --- OPERADORES ---
@router.get("/flota/operadores")
def list_operators(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    include_expired: bool = Query(True),
    db: Session = Depends(get_db),
):
    return crud.get_operators(
        db, skip=skip, limit=limit, status=status, include_expired=include_expired
    )


@router.post("/flota/operadores", status_code=201)
def create_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.Operator)
        .filter(models.Operator.license_number == operator.license_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Número de licencia ya registrado")
    return crud.create_operator(db, operator)


@router.post("/operators/bulk", tags=["Carga Masiva"])
def create_operators_bulk(
    operators: List[schemas.OperatorCreate], db: Session = Depends(get_db)
):
    try:
        db_operators = [models.Operator(**op.model_dump()) for op in operators]
        db.add_all(db_operators)
        db.commit()
        return {
            "message": f"Se cargaron {len(db_operators)} operadores",
            "status": "success",
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Error: Posible duplicado en Licencia o ID."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
