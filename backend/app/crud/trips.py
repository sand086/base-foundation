from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import trips as schemas
from datetime import datetime


def get_trips(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.unit),
            joinedload(models.Trip.operator),
            joinedload(models.Trip.timeline_events),
        )
        .order_by(models.Trip.start_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_trip(db: Session, trip_id: str):
    return (
        db.query(models.Trip)
        .options(joinedload(models.Trip.timeline_events))
        .filter(models.Trip.id == trip_id)
        .first()
    )


def create_trip(db: Session, trip: schemas.TripCreate):
    # Calculamos saldo
    total_anticipos = (
        trip.anticipo_casetas
        + trip.anticipo_viaticos
        + trip.anticipo_combustible
        + trip.otros_anticipos
    )
    saldo = trip.tarifa_base - total_anticipos

    db_trip = models.Trip(**trip.model_dump(), saldo_operador=saldo)
    db.add(db_trip)

    # Actualizar estado de unidad a EN RUTA
    unit = db.query(models.Unit).filter(models.Unit.id == trip.unit_id).first()
    if unit:
        unit.status = models.UnitStatus.EN_RUTA

    db.commit()
    db.refresh(db_trip)
    return db_trip


def update_trip_status(db: Session, trip_id: str, status: str, location: str = None):
    trip = get_trip(db, trip_id)
    if not trip:
        return None

    trip.status = status
    trip.last_update = datetime.utcnow()
    if location:
        trip.last_location = location

    # Registro en Timeline
    event = models.TripTimelineEvent(
        trip_id=trip_id,
        time=datetime.utcnow(),
        event=f"Status actualizado a {status}",
        event_type="status_change",
    )
    db.add(event)

    db.commit()
    db.refresh(trip)
    return trip
