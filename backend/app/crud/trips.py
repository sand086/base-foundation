from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models import models
from app.models.models import RecordStatus
from app.schemas import trips as schemas


def get_trips(db: Session, skip: int = 0, limit: int = 100):
    """
    Lista viajes visibles (A e I). Oculta eliminados (E).
    """
    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.unit),
            joinedload(models.Trip.operator),
            joinedload(models.Trip.timeline_events),
        )
        .filter(models.Trip.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Trip.start_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_trip(db: Session, trip_id: str):
    """
    Obtiene un viaje visible (A e I). Oculta eliminados (E).
    Nota: tu id en modelo es Integer, pero dejas trip_id como str por compat.
    """
    try:
        tid = int(trip_id)
    except (TypeError, ValueError):
        return None

    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.unit),
            joinedload(models.Trip.operator),
            joinedload(models.Trip.timeline_events),
        )
        .filter(
            models.Trip.id == tid,
            models.Trip.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_trip(db: Session, trip: schemas.TripCreate):
    """
    Crea viaje (record_status default A por AuditMixin).
    Calcula saldo_operador y pone unidad EN_RUTA.
    """
    total_anticipos = (
        (trip.anticipo_casetas or 0)
        + (trip.anticipo_viaticos or 0)
        + (trip.anticipo_combustible or 0)
        + (trip.otros_anticipos or 0)
    )
    saldo = (trip.tarifa_base or 0) - total_anticipos

    db_trip = models.Trip(**trip.model_dump(), saldo_operador=saldo)
    db.add(db_trip)

    # Actualizar estado de unidad a EN_RUTA (si la unidad no está eliminada)
    unit = (
        db.query(models.Unit)
        .filter(
            models.Unit.id == trip.unit_id,
            models.Unit.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if unit:
        unit.status = models.UnitStatus.EN_RUTA
        db.add(unit)

    db.commit()
    db.refresh(db_trip)
    return db_trip


def update_trip_status(
    db: Session,
    trip_id: str,
    status: str,
    location: str | None = None,
):
    """
    Update de status:
    - No tocar updated_at manual (lo hace trigger/server_onupdate).
    - last_update sí se actualiza porque es un campo de negocio del trip.
    - Agrega evento en timeline.
    """
    trip = get_trip(db, trip_id)
    if not trip:
        return None

    # Si el viaje está soft-deleted, get_trip ya no lo regresa.
    trip.status = status
    trip.last_update = datetime.utcnow()
    if location:
        trip.last_location = location

    # Timeline
    event = models.TripTimelineEvent(
        trip_id=trip.id,
        time=datetime.utcnow(),
        event=f"Status actualizado a {status}",
        event_type="status_change",
    )
    db.add(event)

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def delete_trip(db: Session, trip_id: str):
    """
    Soft delete:
    - record_status = E
    """
    try:
        tid = int(trip_id)
    except (TypeError, ValueError):
        return False

    trip = (
        db.query(models.Trip)
        .filter(
            models.Trip.id == tid,
            models.Trip.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not trip:
        return False

    trip.record_status = RecordStatus.ELIMINADO
    db.add(trip)
    db.commit()
    return True
