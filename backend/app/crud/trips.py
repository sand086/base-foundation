from __future__ import annotations

from datetime import datetime


from sqlalchemy.orm import Session, joinedload

from app.models import models
from app.models.models import RecordStatus
from app.schemas import trips as schemas

import uuid


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


def add_timeline_event(
    db: Session, trip_id: int, payload: schemas.TripTimelineEventCreatePayload
):
    trip = get_trip(db, str(trip_id))
    if not trip:
        return None

    # 1. Actualizar el estatus general y ubicación del viaje
    trip.status = payload.status
    trip.last_update = datetime.utcnow()
    trip.last_location = payload.location

    # 2. Formatear el texto de la bitácora
    event_text = f"Estatus actualizado a {payload.status.replace('_', ' ').title()} en {payload.location}"
    if payload.comments:
        event_text += f" | Notas: {payload.comments}"

    # 3. Determinar el tipo de evento (Alerta o Checkpoint normal)
    event_type = (
        "alert"
        if payload.status in ["retraso", "accidente", "detenido"]
        else "checkpoint"
    )

    # 4. Crear el registro en el timeline
    db_event = models.TripTimelineEvent(
        trip_id=trip.id, time=datetime.utcnow(), event=event_text, event_type=event_type
    )

    db.add(db_event)
    db.add(trip)
    db.commit()
    db.refresh(trip)

    return trip


def get_trip_settlement(db: Session, trip_id: int):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    kms_recorridos = (
        trip.tariff.distancia_km if trip.tariff and trip.tariff.distancia_km else 0
    )
    fecha_viaje = trip.start_date.strftime("%Y-%m-%d") if trip.start_date else "N/A"

    # 1. Obtener cargas de combustible asociadas a este viaje
    fuel_logs = db.query(models.FuelLog).filter(models.FuelLog.trip_id == trip_id).all()

    consumo_real_litros = sum(f.litros for f in fuel_logs)
    precio_promedio_litro = (
        (sum(f.precio_por_litro for f in fuel_logs) / len(fuel_logs))
        if fuel_logs
        else 24.50
    )

    # 2. Lógica de Tolerancia y Consumo
    RENDIMIENTO_ESPERADO = 3.2  # Esto debería venir de la BD (configuración de unidad), pero lo dejamos fijo por ahora
    consumo_esperado = (
        kms_recorridos / RENDIMIENTO_ESPERADO if kms_recorridos > 0 else 0
    )

    TOLERANCIA_PCT = 0.05  # 5% de tolerancia
    diferencia_litros = consumo_real_litros - consumo_esperado
    litros_a_cobrar = 0
    deduccion_combustible = 0

    # Solo cobramos si la diferencia es POSITIVA y EXCEdE la tolerancia
    if diferencia_litros > (consumo_esperado * TOLERANCIA_PCT):
        litros_a_cobrar = diferencia_litros
        deduccion_combustible = litros_a_cobrar * precio_promedio_litro

    # 3. Armar los Conceptos de Pago
    conceptos = []

    # INGRESOS
    conceptos.append(
        schemas.ConceptoPago(
            id=str(uuid.uuid4())[:8],
            tipo="ingreso",
            categoria="tarifa",
            descripcion="Tarifa Base de Viaje",
            monto=trip.tarifa_base,
            esAutomatico=True,
        )
    )

    # DEDUCCIONES (Anticipos dados previamente)
    if trip.anticipo_casetas > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Casetas",
                monto=trip.anticipo_casetas,
                esAutomatico=True,
            )
        )
    if trip.anticipo_viaticos > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Viáticos",
                monto=trip.anticipo_viaticos,
                esAutomatico=True,
            )
        )
    if trip.anticipo_combustible > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Diésel",
                monto=trip.anticipo_combustible,
                esAutomatico=True,
            )
        )
    if trip.otros_anticipos > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Otros Anticipos",
                monto=trip.otros_anticipos,
                esAutomatico=True,
            )
        )

    # DEDUCCIÓN POR EXCESO DE COMBUSTIBLE
    if deduccion_combustible > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="combustible",
                descripcion=f"Vale Exceso Combustible ({litros_a_cobrar:.1f} L)",
                monto=deduccion_combustible,
                esAutomatico=True,
            )
        )

    # 4. Sumas Finales
    total_ingresos = sum(c.monto for c in conceptos if c.tipo == "ingreso")
    total_deducciones = sum(c.monto for c in conceptos if c.tipo == "deduccion")
    neto_pagar = total_ingresos - total_deducciones

    # 5. Retornar el esquema completo
    return schemas.TripSettlementResponse(
        viajeId=trip.public_id or f"VIAJE-{trip.id}",
        operadorNombre=trip.operator.name if trip.operator else "N/A",
        unidadNumero=trip.unit.numero_economico if trip.unit else "N/A",
        ruta=trip.route_name or f"{trip.origin} -> {trip.destination}",
        fechaViaje=fecha_viaje,
        kmsRecorridos=kms_recorridos,
        estatus=trip.status,
        conceptos=conceptos,
        totalIngresos=total_ingresos,
        totalDeducciones=total_deducciones,
        netoAPagar=neto_pagar,
        consumoEsperadoLitros=round(consumo_esperado, 2),
        consumoRealLitros=round(consumo_real_litros, 2),
        diferenciaLitros=round(diferencia_litros, 2),
        precioPorLitro=round(precio_promedio_litro, 2),
        deduccionCombustible=round(deduccion_combustible, 2),
    )


def close_trip_settlement(
    db: Session, trip_id: int, payload: schemas.CloseSettlementPayload
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    # 1. Cambiamos el estatus a cerrado
    trip.status = models.TripStatus.CERRADO
    trip.closed_at = datetime.utcnow()

    # 2. Guardamos el saldo final exacto acordado en la liquidación
    trip.saldo_operador = payload.netoAPagar

    # 3. Agregamos el evento a la bitácora
    event = models.TripTimelineEvent(
        trip_id=trip.id,
        time=datetime.utcnow(),
        event=f"Viaje Liquidado y Cerrado. Saldo pagado: ${payload.netoAPagar:,.2f}",
        event_type="success",
    )

    db.add(event)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip
