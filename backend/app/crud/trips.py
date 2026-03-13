from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import func, and_, or_
from datetime import date, timedelta

from app.models import models
from app.models.models import RecordStatus, TripLegType
from app.schemas import trips as schemas

import uuid


def get_trips(db: Session, skip: int = 0, limit: int = 100):
    """
    Lista viajes visibles (A e I). Oculta eliminados (E).
    Ahora carga los tramos (legs) en lugar del unit/operator directo del viaje.
    """
    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.remolque_1),
            joinedload(models.Trip.dolly),
            joinedload(models.Trip.remolque_2),
            joinedload(models.Trip.legs).joinedload(models.TripLeg.unit),
            joinedload(models.Trip.legs).joinedload(models.TripLeg.operator),
        )
        .filter(models.Trip.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Trip.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_trip(db: Session, trip_id: str):
    """
    Obtiene un viaje visible.
    """
    try:
        tid = int(trip_id)
    except (TypeError, ValueError):
        return None

    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.remolque_1),
            joinedload(models.Trip.legs).joinedload(models.TripLeg.unit),
            joinedload(models.Trip.legs).joinedload(models.TripLeg.operator),
            joinedload(models.Trip.legs).joinedload(models.TripLeg.timeline_events),
        )
        .filter(
            models.Trip.id == tid,
            models.Trip.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_trip(db: Session, trip: schemas.TripCreate):
    """
    1. Crea el Viaje Padre (con remolques, tarifa y fecha programada).
    2. Si trae un Tramo Inicial (No es Standby), crea el TripLeg y bloquea recursos.
    """
    # 1. Crear el Viaje Padre
    db_trip = models.Trip(
        client_id=trip.client_id,
        sub_client_id=trip.sub_client_id,
        tariff_id=trip.tariff_id,
        remolque_1_id=trip.remolque_1_id,
        dolly_id=trip.dolly_id,
        remolque_2_id=trip.remolque_2_id,
        origin=trip.origin,
        destination=trip.destination,
        route_name=trip.route_name,
        status=trip.status,
        tarifa_base=trip.tarifa_base,
        costo_casetas=trip.costo_casetas,
        start_date=trip.start_date,
        fecha_programada=trip.fecha_programada,  # 🚀 Se guarda la fecha del viaje
    )
    db.add(db_trip)
    db.flush()  # Para obtener el db_trip.id

    # 2. Solo si trae initial_leg (Si se le dio click a DESPACHAR AHORA)
    if trip.initial_leg:
        leg_data = trip.initial_leg

        # Calcular saldo estimado para el primer tramo
        total_anticipos = (
            (leg_data.anticipo_casetas or 0)
            + (leg_data.anticipo_viaticos or 0)
            + (leg_data.anticipo_combustible or 0)
        )
        saldo_estimado = (trip.tarifa_base or 0) - total_anticipos

        # 3. Crear el Primer Tramo (Leg)
        db_leg = models.TripLeg(
            trip_id=db_trip.id,
            leg_type=leg_data.leg_type,
            status=trip.status,
            unit_id=leg_data.unit_id,
            operator_id=leg_data.operator_id,
            anticipo_casetas=leg_data.anticipo_casetas,
            anticipo_viaticos=leg_data.anticipo_viaticos,
            anticipo_combustible=leg_data.anticipo_combustible,
            saldo_operador=saldo_estimado,
            odometro_inicial=leg_data.odometro_inicial,
            nivel_tanque_inicial=leg_data.nivel_tanque_inicial,
            start_date=trip.start_date,
        )
        db.add(db_leg)

        # 4. Bloquear Unidades (Tracto del tramo + Remolques del viaje)
        unit_ids_to_block = [
            leg_data.unit_id,
            trip.remolque_1_id,
            trip.dolly_id,
            trip.remolque_2_id,
        ]
        valid_unit_ids = [uid for uid in unit_ids_to_block if uid is not None]

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

        # 5. Bloquear al Operador
        if leg_data.operator_id:
            operator = (
                db.query(models.Operator)
                .filter(models.Operator.id == leg_data.operator_id)
                .first()
            )
            if operator:
                operator.status = models.OperatorStatus.EN_RUTA  # o EN_RUTA
                db.add(operator)

    # Si fue Standby, brinca todo lo anterior y solo guarda el viaje padre
    db.commit()
    db.refresh(db_trip)
    return db_trip


def update_trip_status(
    db: Session, trip_id: str, status: str, location: str | None = None
):
    """
    Actualiza el estado del viaje general y de su tramo activo.
    Libera recursos si el viaje/tramo termina.
    """
    trip = get_trip(db, trip_id)
    if not trip:
        return None

    trip.status = status
    trip.last_update = datetime.utcnow()

    # Buscamos el último tramo creado para este viaje
    active_leg = None
    if trip.legs:
        active_leg = trip.legs[-1]  # El último tramo agregado
        active_leg.status = status
        active_leg.last_update = datetime.utcnow()
        if location:
            active_leg.last_location = location

    # LÓGICA DE LIBERACIÓN DE RECURSOS
    if status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
        trip.actual_arrival = datetime.utcnow()
        if active_leg:
            active_leg.actual_arrival = datetime.utcnow()

        if status == models.TripStatus.CERRADO:
            trip.closed_at = datetime.utcnow()

        # Liberar Remolques (del viaje padre) y Tracto (del tramo)
        unit_ids_to_free = [
            active_leg.unit_id if active_leg else None,
            trip.remolque_1_id,
            trip.dolly_id,
            trip.remolque_2_id,
        ]
        valid_unit_ids = [uid for uid in unit_ids_to_free if uid is not None]

        if valid_unit_ids:
            units = (
                db.query(models.Unit).filter(models.Unit.id.in_(valid_unit_ids)).all()
            )
            for u in units:
                u.status = models.UnitStatus.DISPONIBLE
                db.add(u)

        # Liberar Operador
        if active_leg and active_leg.operator:
            active_leg.operator.status = models.OperatorStatus.ACTIVO
            db.add(active_leg.operator)

    # Timeline (Se amarra al Tramo Activo)
    if active_leg:
        event = models.TripTimelineEvent(
            trip_leg_id=active_leg.id,
            time=datetime.utcnow(),
            event=f"Status actualizado a {status}",
            event_type="status_change",
        )
        db.add(event)

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def update_trip(db: Session, trip_id: int, trip_in: schemas.TripUpdate):
    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not db_trip:
        return None

    update_data = trip_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_trip, field, value)

    db_trip.last_update = datetime.utcnow()
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip


def delete_trip(db: Session, trip_id: str):
    try:
        tid = int(trip_id)
    except (TypeError, ValueError):
        return False

    trip = (
        db.query(models.Trip)
        .filter(
            models.Trip.id == tid, models.Trip.record_status != RecordStatus.ELIMINADO
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

    # Actualizamos viaje padre
    trip.status = payload.status
    trip.last_update = datetime.utcnow()

    # Buscamos el Tramo activo
    active_leg = trip.legs[-1] if trip.legs else None

    if active_leg:
        active_leg.status = payload.status
        active_leg.last_update = datetime.utcnow()
        active_leg.last_location = payload.location

        event_text = f"Estatus actualizado a {payload.status.replace('_', ' ').title()} en {payload.location}"
        if payload.comments:
            event_text += f" | Notas: {payload.comments}"

        event_type = (
            "alert"
            if payload.status in ["retraso", "accidente", "detenido"]
            else "checkpoint"
        )

        db_event = models.TripTimelineEvent(
            trip_leg_id=active_leg.id,
            time=datetime.utcnow(),
            event=event_text,
            event_type=event_type,
        )
        db.add(db_event)

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def get_trip_settlement(db: Session, trip_leg_id: int):
    """
    Liquidación. OJO: Ahora liquida un TRAMO (TripLeg), no un viaje entero.
    """
    leg = (
        db.query(models.TripLeg)
        .options(joinedload(models.TripLeg.trip))
        .filter(models.TripLeg.id == trip_leg_id)
        .first()
    )
    if not leg or not leg.trip:
        return None

    trip = leg.trip

    kms_recorridos = (
        trip.tariff.distancia_km if trip.tariff and trip.tariff.distancia_km else 0
    )
    fecha_viaje = leg.start_date.strftime("%Y-%m-%d") if leg.start_date else "N/A"

    # 1. Obtener cargas de combustible asociadas EXACTAMENTE A ESTE TRAMO
    fuel_logs = (
        db.query(models.FuelLog).filter(models.FuelLog.trip_leg_id == trip_leg_id).all()
    )
    if leg.leg_type == models.TripLegType.RUTA and not fuel_logs:
        raise ValueError("BLOCKED_NO_FUEL")

    consumo_real_litros = sum(f.litros for f in fuel_logs)
    precio_promedio_litro = (
        (sum(f.precio_por_litro for f in fuel_logs) / len(fuel_logs))
        if fuel_logs
        else 24.50
    )

    RENDIMIENTO_ESPERADO = 3.2
    consumo_esperado = (
        kms_recorridos / RENDIMIENTO_ESPERADO if kms_recorridos > 0 else 0
    )

    TOLERANCIA_PCT = 0.05
    diferencia_litros = consumo_real_litros - consumo_esperado
    litros_a_cobrar = 0
    deduccion_combustible = 0

    if diferencia_litros > (consumo_esperado * TOLERANCIA_PCT):
        litros_a_cobrar = diferencia_litros
        deduccion_combustible = litros_a_cobrar * precio_promedio_litro

    # 3. Armar los Conceptos de Pago
    conceptos = []

    # INGRESOS (Solo la tarifa del viaje si es el tramo principal)
    conceptos.append(
        schemas.ConceptoPago(
            id=str(uuid.uuid4())[:8],
            tipo="ingreso",
            categoria="tarifa",
            descripcion=f"Tarifa Base ({leg.leg_type.value})",
            monto=trip.tarifa_base,
            esAutomatico=True,
        )
    )

    # DEDUCCIONES (Del Tramo)
    if leg.anticipo_casetas > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Casetas",
                monto=leg.anticipo_casetas,
                esAutomatico=True,
            )
        )
    if leg.anticipo_viaticos > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Viáticos",
                monto=leg.anticipo_viaticos,
                esAutomatico=True,
            )
        )
    if leg.anticipo_combustible > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Diésel",
                monto=leg.anticipo_combustible,
                esAutomatico=True,
            )
        )
    if leg.otros_anticipos > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Otros Anticipos",
                monto=leg.otros_anticipos,
                esAutomatico=True,
            )
        )

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

    total_ingresos = sum(c.monto for c in conceptos if c.tipo == "ingreso")
    total_deducciones = sum(c.monto for c in conceptos if c.tipo == "deduccion")
    neto_pagar = total_ingresos - total_deducciones

    return schemas.TripSettlementResponse(
        viajeId=trip.public_id or f"VIAJE-{trip.id}",
        legId=leg.id,
        operadorNombre=leg.operator.name if leg.operator else "N/A",
        unidadNumero=leg.unit.numero_economico if leg.unit else "N/A",
        ruta=trip.route_name or f"{trip.origin} -> {trip.destination}",
        fechaViaje=fecha_viaje,
        kmsRecorridos=kms_recorridos,
        estatus=leg.status,
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
    db: Session, trip_leg_id: int, payload: schemas.CloseSettlementPayload
):
    """
    Cierra UN TRAMO y, si es el último, cierra el VIAJE.
    """
    leg = db.query(models.TripLeg).filter(models.TripLeg.id == trip_leg_id).first()
    if not leg:
        return None

    # Cerramos el Tramo
    leg.status = models.TripStatus.CERRADO
    leg.saldo_operador = payload.netoAPagar
    leg.actual_arrival = datetime.utcnow()

    event = models.TripTimelineEvent(
        trip_leg_id=leg.id,
        time=datetime.utcnow(),
        event=f"Tramo Liquidado y Cerrado. Saldo pagado: ${payload.netoAPagar:,.2f}",
        event_type="success",
    )
    db.add(event)

    # Revisamos si debemos cerrar el viaje completo (Opcional, de momento lo cerramos siempre)
    if leg.trip:
        leg.trip.status = models.TripStatus.CERRADO
        leg.trip.closed_at = datetime.utcnow()
        db.add(leg.trip)

    db.add(leg)
    db.commit()
    db.refresh(leg)
    return leg.trip


def create_next_leg(db: Session, trip_id: str, payload: schemas.TripLegCreate):
    """
    Cierra el tramo actual (si existe) liberando el camión/chofer anterior,
    y crea un nuevo tramo enganchando al nuevo camión/chofer.
    """
    tid = int(trip_id)
    trip = db.query(models.Trip).filter(models.Trip.id == tid).first()

    if not trip:
        return None

    # 1. Cerrar el tramo anterior (si existe alguno)
    if trip.legs:
        last_leg = trip.legs[-1]

        # Si el tramo anterior no estaba entregado, forzamos su cierre/entrega
        if last_leg.status not in [
            models.TripStatus.ENTREGADO,
            models.TripStatus.CERRADO,
        ]:
            last_leg.status = models.TripStatus.ENTREGADO
            last_leg.actual_arrival = datetime.utcnow()
            last_leg.last_update = datetime.utcnow()

            # Liberamos la unidad y operador ANTERIORES
            if last_leg.unit_id:
                old_unit = (
                    db.query(models.Unit)
                    .filter(models.Unit.id == last_leg.unit_id)
                    .first()
                )
                if old_unit:
                    old_unit.status = models.UnitStatus.DISPONIBLE
                    db.add(old_unit)

            if last_leg.operator_id:
                old_op = (
                    db.query(models.Operator)
                    .filter(models.Operator.id == last_leg.operator_id)
                    .first()
                )
                if old_op:
                    old_op.status = models.OperatorStatus.ACTIVO
                    db.add(old_op)

            # Dejamos un log en el tramo anterior
            db_event = models.TripTimelineEvent(
                trip_leg_id=last_leg.id,
                time=datetime.utcnow(),
                event="Tramo concluido por Desenganche / Cambio de operador.",
                event_type="info",
            )
            db.add(db_event)
            db.add(last_leg)

    # 2. Crear el NUEVO Tramo
    new_leg = models.TripLeg(
        trip_id=trip.id,
        leg_type=payload.leg_type,
        status=models.TripStatus.CREADO,
        unit_id=payload.unit_id,
        operator_id=payload.operator_id,
        anticipo_casetas=payload.anticipo_casetas,
        anticipo_viaticos=payload.anticipo_viaticos,
        anticipo_combustible=payload.anticipo_combustible,
        odometro_inicial=payload.odometro_inicial,
        nivel_tanque_inicial=payload.nivel_tanque_inicial,
        start_date=datetime.utcnow(),
    )
    db.add(new_leg)
    db.flush()  # Para obtener el new_leg.id

    # 3. Bloquear el NUEVO camión y operador
    if payload.unit_id:
        new_unit = (
            db.query(models.Unit).filter(models.Unit.id == payload.unit_id).first()
        )
        if new_unit:
            new_unit.status = models.UnitStatus.EN_RUTA
            db.add(new_unit)

    if payload.operator_id:
        new_op = (
            db.query(models.Operator)
            .filter(models.Operator.id == payload.operator_id)
            .first()
        )
        if new_op:
            new_op.status = models.OperatorStatus.EN_RUTA
            db.add(new_op)

    # 4. Asegurarnos de que el viaje general vuelva a estar "En Proceso"
    trip.status = models.TripStatus.EN_TRANSITO
    trip.last_update = datetime.utcnow()
    db.add(trip)

    # 5. Guardar todo
    db.commit()
    db.refresh(trip)
    return trip


def settle_trip_legs_batch(db: Session, leg_ids: list[int], total_pago: float):
    legs = db.query(models.TripLeg).filter(models.TripLeg.id.in_(leg_ids)).all()
    if not legs:
        return None

    trips_to_check = set()

    for leg in legs:
        # 1. Marcar el tramo como liquidado
        leg.status = "liquidado"
        # Dividimos el pago total entre los movimientos para el historial financiero
        leg.saldo_operador = total_pago / len(legs)
        leg.actual_arrival = datetime.utcnow()

        event = models.TripTimelineEvent(
            trip_leg_id=leg.id,
            time=datetime.utcnow(),
            event=f"Tramo Liquidado en Lote. Saldo acreditado: ${(total_pago/len(legs)):,.2f}",
            event_type="success",
        )
        db.add(event)
        trips_to_check.add(leg.trip)

    cxc_creadas = 0

    # 2. Verificar los viajes padre
    for trip in trips_to_check:
        # Si TODOS los tramos de este viaje ya acabaron, cerramos el viaje general
        all_completed = all(
            l.status in ["entregado", "cerrado", "liquidado"] for l in trip.legs
        )

        if all_completed and trip.status not in ["cerrado", "liquidado"]:
            trip.status = "cerrado"
            trip.closed_at = func.now()

            # Generar CxC (Cuentas por Cobrar) si no existe
            existing_cxc = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.viaje_id == trip.id)
                .first()
            )
            if not existing_cxc:
                base = trip.tarifa_base or 0.0
                casetas = trip.costo_casetas or 0.0
                subtotal = base + casetas
                iva = subtotal * 0.16
                retencion = subtotal * 0.04
                monto_total = subtotal + iva - retencion

                dias_credito = 15
                if trip.client and trip.client.dias_credito:
                    dias_credito = trip.client.dias_credito

                nueva_cxc = models.ReceivableInvoice(
                    client_id=trip.client_id,
                    sub_client_id=trip.sub_client_id,
                    viaje_id=trip.id,
                    folio_interno=f"CXC-VIAJE-{trip.public_id or trip.id}",
                    concepto=f"Servicio de Flete: {trip.origin} a {trip.destination}",
                    subtotal=subtotal,
                    iva=iva,
                    retenciones=retencion,
                    monto_total=monto_total,
                    saldo_pendiente=monto_total,
                    fecha_emision=date.today(),
                    fecha_vencimiento=date.today() + timedelta(days=dias_credito),
                    estatus=models.InvoiceStatus.PENDIENTE,
                )
                db.add(nueva_cxc)
                cxc_creadas += 1

    db.commit()
    return {
        "message": "Liquidación completada",
        "legs_procesados": len(legs),
        "cxc_generadas": cxc_creadas,
    }


def preview_batch_settlement(db: Session, leg_ids: list[int]):
    # Buscamos los tramos e incluimos sus viajes, tarifas y vales de combustible
    legs = (
        db.query(models.TripLeg)
        .options(
            joinedload(models.TripLeg.trip).joinedload(models.Trip.tariff),
            joinedload(models.TripLeg.fuel_logs),
        )
        .filter(models.TripLeg.id.in_(leg_ids))
        .all()
    )

    if not legs:
        return None

    total_kms = 0.0
    total_real_liters = 0.0
    total_fuel_cost = 0.0
    alertas = []

    for leg in legs:
        trip = leg.trip

        # 1. Sumar Kilómetros
        kms = trip.tariff.distancia_km if trip and trip.tariff else 0
        total_kms += kms

        # 2. Candado de Combustible (Regla Gustavo)
        if not leg.fuel_logs:
            alertas.append(
                f"⚠️ El viaje {trip.public_id or trip.id} ({trip.origin} a {trip.destination}) NO tiene vales de combustible registrados."
            )

        # 3. Sumar Vales
        for f in leg.fuel_logs:
            total_real_liters += f.litros
            total_fuel_cost += f.litros * f.precio_por_litro

    # 4. Matemáticas de Rendimiento
    RENDIMIENTO_ESPERADO = 3.2  # km por litro (puedes ajustarlo o traerlo de BD)
    consumo_esperado = total_kms / RENDIMIENTO_ESPERADO if total_kms > 0 else 0.0

    precio_promedio = (
        (total_fuel_cost / total_real_liters) if total_real_liters > 0 else 24.50
    )

    diferencia = total_real_liters - consumo_esperado
    deduccion = 0.0

    # Tolerancia del 5% (Si gasta 5% más de lo esperado, se le cobra)
    TOLERANCIA_PCT = 0.05
    if diferencia > (consumo_esperado * TOLERANCIA_PCT):
        deduccion = diferencia * precio_promedio

    return {
        "total_kms": round(total_kms, 2),
        "consumo_esperado": round(consumo_esperado, 2),
        "consumo_real": round(total_real_liters, 2),
        "diferencia_litros": round(diferencia, 2),
        "precio_promedio": round(precio_promedio, 2),
        "deduccion_combustible": round(deduccion, 2),
        "alertas": alertas,
    }


def undo_last_leg(db: Session, trip_id: str):
    """
    Elimina el tramo (leg) actual que se creó por error y reabre el tramo anterior.
    """
    tid = int(trip_id)
    trip = db.query(models.Trip).filter(models.Trip.id == tid).first()

    if not trip or len(trip.legs) <= 1:
        # No se puede deshacer si solo hay un tramo original
        return False

    current_leg = trip.legs[-1]
    previous_leg = trip.legs[-2]

    # 1. Liberamos camión/chofer del tramo actual (que fue un error)
    if current_leg.unit_id:
        u = db.query(models.Unit).filter(models.Unit.id == current_leg.unit_id).first()
        if u:
            u.status = models.UnitStatus.DISPONIBLE
    if current_leg.operator_id:
        o = (
            db.query(models.Operator)
            .filter(models.Operator.id == current_leg.operator_id)
            .first()
        )
        if o:
            o.status = models.OperatorStatus.ACTIVO

    # 2. Borramos el tramo erróneo
    db.delete(current_leg)

    # 3. Restauramos el tramo anterior a "En Tránsito"
    previous_leg.status = models.TripStatus.EN_TRANSITO
    previous_leg.actual_arrival = None

    # Bloqueamos de nuevo al chofer/unidad anterior
    if previous_leg.unit_id:
        pu = (
            db.query(models.Unit).filter(models.Unit.id == previous_leg.unit_id).first()
        )
        if pu:
            pu.status = models.UnitStatus.EN_RUTA
    if previous_leg.operator_id:
        po = (
            db.query(models.Operator)
            .filter(models.Operator.id == previous_leg.operator_id)
            .first()
        )
        if po:
            po.status = models.OperatorStatus.EN_RUTA

    # 4. Actualizamos viaje general
    trip.status = models.TripStatus.EN_TRANSITO
    trip.closed_at = None

    db.commit()
    return trip
