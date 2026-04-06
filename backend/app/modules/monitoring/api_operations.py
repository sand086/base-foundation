# (Despacho y Viajes)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas import schemas
from app import crud

router = APIRouter()


@router.get("/viajes")
def list_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.get_trips(db, skip=skip, limit=limit, status=status)


@router.post("/viajes", status_code=201)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_trip(db, trip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/viajes/{trip_id}/status")
def update_trip_status(
    trip_id: str,
    status: str = Query(...),
    location: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    trip = crud.update_trip_status(db, trip_id, status, location)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return {"message": "Status actualizado", "trip_id": trip_id, "new_status": status}
