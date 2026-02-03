from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import trips as schemas
from app.crud import trips as crud

router = APIRouter()


@router.get("/trips", response_model=List[schemas.TripResponse])
def read_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_trips(db, skip, limit)


@router.post("/trips", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    # Validaciones básicas
    unit = db.query(models.Unit).filter(models.Unit.id == trip.unit_id).first()
    if not unit or unit.status != "disponible":
        raise HTTPException(status_code=400, detail="Unidad no disponible")

    return crud.create_trip(db, trip)


@router.patch("/trips/{trip_id}/status")
def update_status(
    trip_id: str, status: str, location: str = None, db: Session = Depends(get_db)
):
    trip = crud.update_trip_status(db, trip_id, status, location)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip
