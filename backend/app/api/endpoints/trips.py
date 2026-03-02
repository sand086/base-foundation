# src/api/endpoints/trips.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import trips as schemas
from app.crud import trips as crud
from app.api.endpoints.auth import (
    get_current_user,
)  # Asegúrate de tener esta importación

router = APIRouter()


@router.get("/trips", response_model=List[schemas.TripResponse])
def read_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_trips(db, skip, limit)


@router.post("/trips", response_model=schemas.TripResponse)
def create_trip(
    trip: schemas.TripCreate,
    db: Session = Depends(get_db),  # ✅ CORRECCIÓN: Se agregó el Depends
):
    # 1. Validar que la unidad exista
    unit = db.query(models.Unit).filter(models.Unit.id == trip.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="La unidad principal no existe")

    # 2. Validar estatus (Permitimos bloqueado para que puedas trabajar)
    # Si quieres ser estricto, quita 'bloqueado' de la lista
    estatus_permitidos = ["disponible", "bloqueado"]
    if unit.status.lower() not in estatus_permitidos:
        raise HTTPException(
            status_code=400,
            detail=f"La unidad {unit.numero_economico} no puede ser despachada. Estatus actual: {unit.status}",
        )

    # 3. Extraer los datos del esquema (sin el saldo para evitar duplicidad)
    trip_data = trip.model_dump(exclude={"saldo_operador"})

    # 4. Calcular el saldo real
    saldo_calculado = trip.tarifa_base - (
        trip.anticipo_casetas
        + trip.anticipo_viaticos
        + trip.anticipo_combustible
        + (trip.otros_anticipos or 0)
    )

    # 5. Crear el objeto
    db_trip = models.Trip(**trip_data, saldo_operador=saldo_calculado)

    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip


@router.patch("/trips/{trip_id}/status")
def update_status(
    trip_id: int,  # Cambiado a int si tu PK es numérica
    status: str,
    location: str = None,
    db: Session = Depends(get_db),
):
    trip = crud.update_trip_status(db, trip_id, status, location)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.delete("/trips/{trip_id}", response_model=dict)
def delete_trip_endpoint(trip_id: str, db: Session = Depends(get_db)):
    success = crud.delete_trip(db, trip_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Viaje no encontrado o ya eliminado"
        )
    return {"message": "Viaje eliminado correctamente"}


# Opcional pero recomendado para el UX (poder editar si hubo un error al crear)
@router.put("/trips/{trip_id}", response_model=schemas.TripResponse)
def update_trip(
    trip_id: int, trip_in: schemas.TripUpdate, db: Session = Depends(get_db)
):
    trip = crud.update_trip(db, trip_id, trip_in)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.post("/trips/{trip_id}/timeline", response_model=schemas.TripResponse)
def create_timeline_event(
    trip_id: int,
    payload: schemas.TripTimelineEventCreatePayload,
    db: Session = Depends(get_db),
):
    trip = crud.add_timeline_event(db, trip_id, payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.get(
    "/trips/{trip_id}/settlement", response_model=schemas.TripSettlementResponse
)
def get_trip_settlement(trip_id: int, db: Session = Depends(get_db)):
    settlement = crud.get_trip_settlement(db, trip_id)
    if not settlement:
        raise HTTPException(status_code=404, detail="Viaje no encontrado para liquidar")
    return settlement


@router.post("/trips/{trip_id}/close-settlement", response_model=schemas.TripResponse)
def close_trip_settlement(
    trip_id: int, payload: schemas.CloseSettlementPayload, db: Session = Depends(get_db)
):
    trip = crud.close_trip_settlement(db, trip_id, payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip
