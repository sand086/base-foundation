# src/api/endpoints/trips.py
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import trips as schemas
from app.crud import trips as crud
from app.api.endpoints.auth import (
    get_current_user,
)  # Asegúrate de tener esta importación

from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader

try:
    from weasyprint import HTML
except Exception as e:
    print(f"⚠️ Advertencia: WeasyPrint no se cargó correctamente ({e})")
    HTML = None

router = APIRouter()


@router.get("/trips", response_model=List[schemas.TripResponse])
def read_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_trips(db, skip, limit)


@router.post("/trips", response_model=schemas.TripResponse)
def create_trip(
    trip: schemas.TripCreate,
    db: Session = Depends(get_db),
):
    # 1. Validar que la unidad del primer tramo exista
    if trip.initial_leg and trip.initial_leg.unit_id:
        unit = (
            db.query(models.Unit)
            .filter(models.Unit.id == trip.initial_leg.unit_id)
            .first()
        )
        if not unit:
            raise HTTPException(status_code=404, detail="La unidad principal no existe")

        # 2. Validar estatus (Permitimos bloqueado para que puedas trabajar)
        estatus_permitidos = ["disponible", "bloqueado"]
        if unit.status.lower() not in estatus_permitidos:
            raise HTTPException(
                status_code=400,
                detail=f"La unidad {unit.numero_economico} no puede ser despachada. Estatus actual: {unit.status}",
            )

    # 3. Crear el objeto en BD (El CRUD ahora separa Viaje Padre y Tramo)
    db_trip = crud.create_trip(db, trip)
    return db_trip


@router.patch("/trips/{trip_id}/status", response_model=schemas.TripResponse)
def update_status(
    trip_id: int,  # Cambiado a int
    status: str,
    location: str = None,
    db: Session = Depends(get_db),
):
    trip = crud.update_trip_status(db, str(trip_id), status, location)
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


@router.put("/trips/{trip_id}", response_model=schemas.TripResponse)
def update_trip(
    trip_id: int, trip_in: schemas.TripUpdate, db: Session = Depends(get_db)
):
    # Ya puedes usar la función update_trip normal si la tienes en tu crud.
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


# =========================================================
# RUTAS DE LIQUIDACIÓN (Ahora apuntan al TRAMO / LEG)
# =========================================================


@router.get(
    "/trips/leg/{trip_leg_id}/settlement", response_model=schemas.TripSettlementResponse
)
def get_trip_settlement(trip_leg_id: int, db: Session = Depends(get_db)):
    settlement = crud.get_trip_settlement(db, trip_leg_id)
    if not settlement:
        raise HTTPException(status_code=404, detail="Tramo no encontrado para liquidar")
    return settlement


@router.post(
    "/trips/leg/{trip_leg_id}/close-settlement", response_model=schemas.TripResponse
)
def close_trip_settlement(
    trip_leg_id: int,
    payload: schemas.CloseSettlementPayload,
    db: Session = Depends(get_db),
):
    trip = crud.close_trip_settlement(db, trip_leg_id, payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")
    return trip


@router.post("/trips/{trip_id}/next-leg", response_model=schemas.TripResponse)
def create_next_leg_endpoint(
    trip_id: int,
    payload: schemas.TripLegCreate,
    db: Session = Depends(get_db),
):
    """
    Desengancha el viaje actual y crea una nueva fase/tramo asignando nuevo operador y unidad.
    """
    trip = crud.create_next_leg(db, str(trip_id), payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


TEMPLATE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "../../templates"
)
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


@router.get("/trips/{trip_id}/carta-porte-ciega")
def generate_carta_porte_ciega(trip_id: int, db: Session = Depends(get_db)):
    if HTML is None:
        raise HTTPException(
            status_code=500,
            detail="WeasyPrint no está instalado correctamente en el servidor.",
        )

    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    # Extraer el tramo activo para saber quién va manejando
    active_leg = None
    if trip.legs:
        # Buscamos el tramo que no esté cerrado, o tomamos el último
        active_leg = next(
            (
                leg
                for leg in trip.legs
                if leg.status
                not in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]
            ),
            trip.legs[-1],
        )

    # Cargar plantilla y renderizar
    template = jinja_env.get_template("carta_porte_ciega.html")
    html_content = template.render(
        trip=trip,
        leg=active_leg,
        fecha_impresion=datetime.now().strftime("%d/%m/%Y %H:%M"),
    )

    # Generar el PDF en memoria
    pdf_file = HTML(string=html_content).write_pdf()

    # Devolver el archivo PDF para descarga/visualización
    return Response(
        content=pdf_file,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Carta_Porte_{trip.public_id or trip.id}.pdf"
        },
    )
