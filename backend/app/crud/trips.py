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
            joinedload(models.Trip.remolque_1),
            joinedload(models.Trip.dolly),
            joinedload(models.Trip.remolque_2),
        )
        .filter(models.Trip.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Trip.id.asc())
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
    Calcula saldo_operador y pone TODAS las unidades asignadas en EN_RUTA.
    """
    total_anticipos = (
        (trip.anticipo_casetas or 0)
        + (trip.anticipo_viaticos or 0)
        + (trip.anticipo_combustible or 0)
        + (trip.otros_anticipos or 0)
    )
    saldo = (trip.tarifa_base or 0) - total_anticipos

    db_trip = models.Trip(
        **trip.model_dump(exclude={"saldo_operador"}), saldo_operador=saldo
    )
    db.add(db_trip)

    # 1. Recopilar todos los IDs de unidades involucradas (Tracto, Remolques, Dolly)
    unit_ids_to_block = [
        trip.unit_id,
        getattr(trip, "remolque_1_id", None),
        getattr(trip, "dolly_id", None),
        getattr(trip, "remolque_2_id", None),
    ]

    # 2. Filtrar los que sean nulos (Ej: si es un viaje sencillo, dolly y remolque 2 serán None)
    valid_unit_ids = [uid for uid in unit_ids_to_block if uid is not None]

    # 3. Bloquear todas las unidades de una sola vez
    if valid_unit_ids:
        units = (
            db.query(models.Unit)
            .filter(
                models.Unit.id.in_(valid_unit_ids),
                models.Unit.record_status != RecordStatus.ELIMINADO,
            )
            .all()
        )
        for u in units:
            u.status = models.UnitStatus.EN_RUTA
            db.add(u)

    # 4. Bloquear al operador (Opcional, pero muy recomendado)
    operator = (
        db.query(models.Operator).filter(models.Operator.id == trip.operator_id).first()
    )
    if operator:
        operator.status = (
            models.OperatorStatus.INACTIVO
        )  # o un estado EN_RUTA si lo tienes en OperatorStatus
        db.add(operator)

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
    Actualiza el estado del viaje.
    Si el viaje termina, libera MASIVAMENTE todos los recursos (Unidades y Operador).
    """
    trip = get_trip(db, trip_id)
    if not trip:
        return None

    trip.status = status
    trip.last_update = datetime.utcnow()
    if location:
        trip.last_location = location

    # LÓGICA DE LIBERACIÓN DE RECURSOS
    if status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
        trip.actual_arrival = datetime.utcnow()
        if status == models.TripStatus.CERRADO:
            trip.closed_at = datetime.utcnow()

        # 1. Recopilar los IDs de todas las unidades atadas a este viaje
        unit_ids_to_free = [
            trip.unit_id,
            getattr(trip, "remolque_1_id", None),
            getattr(trip, "dolly_id", None),
            getattr(trip, "remolque_2_id", None),
        ]
        valid_unit_ids = [uid for uid in unit_ids_to_free if uid is not None]

        # 2. Liberarlas todas de un jalón
        if valid_unit_ids:
            units = (
                db.query(models.Unit).filter(models.Unit.id.in_(valid_unit_ids)).all()
            )
            for u in units:
                u.status = models.UnitStatus.DISPONIBLE
                db.add(u)

        # 3. Liberar el operador
        if trip.operator:
            trip.operator.status = models.OperatorStatus.ACTIVO
            db.add(trip.operator)

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
