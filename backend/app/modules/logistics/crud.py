from datetime import datetime
import uuid
import traceback

from sqlalchemy.orm import Session, joinedload, selectinload, contains_eager
from sqlalchemy import func, and_, or_
from datetime import date, timedelta

from app.models import models
from app.models.models import RecordStatus, TripStatus, TripLegType
from . import schemas
import logging

logger = logging.getLogger("logistics.crud")


def get_trips(db: Session, skip: int = 0, limit: int = 100):
    """
    FIX: selectinload evita el producto cartesiano y arregla la paginación.
    Soluciona la duplicidad de casetas en el historial.
    Añadido: selectinload para traer los vales de combustible (fuel_logs) de cada tramo.
    """
    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.tariff),
            joinedload(models.Trip.remolque_1),
            joinedload(models.Trip.dolly),
            joinedload(models.Trip.remolque_2),
            selectinload(models.Trip.legs).joinedload(models.TripLeg.unit),
            selectinload(models.Trip.legs).joinedload(models.TripLeg.operator),
            selectinload(models.Trip.legs).selectinload(models.TripLeg.fuel_logs),
        )
        .filter(models.Trip.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Trip.id.desc())  # Mejor ordenar por los más recientes
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_trip(db: Session, trip_id: str):
    try:
        tid = int(trip_id)
    except (TypeError, ValueError):
        return None

    return (
        db.query(models.Trip)
        .options(
            joinedload(models.Trip.client),
            joinedload(models.Trip.tariff),
            joinedload(models.Trip.remolque_1),
            selectinload(models.Trip.legs).joinedload(models.TripLeg.unit),
            selectinload(models.Trip.legs).joinedload(models.TripLeg.operator),
            selectinload(models.Trip.legs).joinedload(models.TripLeg.timeline_events),
            selectinload(models.Trip.legs).selectinload(models.TripLeg.fuel_logs),
        )
        .filter(
            models.Trip.id == tid,
            models.Trip.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_trip(db: Session, trip: schemas.TripCreate):
    """
    1. Crea el Viaje Padre desempaquetando el esquema (omitiendo campos lógicos Pydantic).
    2. Si trae un Tramo Inicial, crea el TripLeg y bloquea recursos.
    3. Si el Motor Dual está activo y trae un Tramo Final, lo crea como segundo Leg.
    """
    try:
        # 🚀 BLINDAJE: Excluimos todos los campos lógicos de Pydantic que NO están en la base de datos
        trip_data = trip.model_dump(
            exclude={
                "initial_leg",
                "final_leg",
                "conoce_ruta_completa",
                "ocultar_montos_pdf",
                "is_dummy_stamping",
            }
        )

        db_trip = models.Trip(**trip_data)
        db.add(db_trip)
        db.flush()

        unit_ids_to_block = []
        operator_ids_to_block = []

        # ==========================================
        # CREACIÓN DEL TRAMO 1 (PIERNA INICIAL)
        # ==========================================
        if trip.initial_leg:
            leg_data = trip.initial_leg

            if not leg_data.odometro_inicial or leg_data.odometro_inicial == 0:
                leg_data.odometro_inicial = get_last_unit_odometer(db, leg_data.unit_id)

            monto_pagar = (trip.tarifa_base or 0) - (
                (leg_data.anticipo_casetas or 0)
                + (leg_data.anticipo_viaticos or 0)
                + (leg_data.anticipo_combustible or 0)
            )

            db_leg_1 = models.TripLeg(
                trip_id=db_trip.id,
                leg_type=leg_data.leg_type,
                status=db_trip.status,  # Hereda status del viaje padre (ej. en_transito o creado)
                unit_id=leg_data.unit_id,
                operator_id=leg_data.operator_id,
                anticipo_casetas=leg_data.anticipo_casetas,
                anticipo_viaticos=leg_data.anticipo_viaticos,
                anticipo_combustible=leg_data.anticipo_combustible,
                monto_neto_pagado=monto_pagar,
                odometro_inicial=leg_data.odometro_inicial,
                nivel_tanque_inicial=leg_data.nivel_tanque_inicial,
                start_date=db_trip.start_date,
            )
            db.add(db_leg_1)

            # Acumulamos recursos para bloquear solo si el viaje ya arrancó ("en_transito")
            if db_trip.status == "en_transito":
                unit_ids_to_block.extend(
                    [
                        leg_data.unit_id,
                        db_trip.remolque_1_id,
                        db_trip.dolly_id,
                        db_trip.remolque_2_id,
                    ]
                )
                operator_ids_to_block.append(leg_data.operator_id)

        # ==========================================
        # CREACIÓN DEL TRAMO 2 (MOTOR DUAL - OPCIONAL)
        # ==========================================
        # Verificamos que conozca la ruta completa y que el payload traiga final_leg
        if getattr(trip, "conoce_ruta_completa", False) and getattr(
            trip, "final_leg", None
        ):
            leg_final = trip.final_leg

            # El tramo 2 SIEMPRE nace en status 'creado' porque el chofer 2 está esperando en patio
            db_leg_2 = models.TripLeg(
                trip_id=db_trip.id,
                leg_type=leg_final.leg_type or "ruta_carretera",
                status="creado",
                unit_id=leg_final.unit_id,
                operator_id=leg_final.operator_id,
                # Inicializamos anticipos en 0 para la pierna 2 (se le asignarán después cuando despache)
                anticipo_casetas=0.0,
                anticipo_viaticos=0.0,
                anticipo_combustible=0.0,
                monto_neto_pagado=0.0,
                start_date=db_trip.start_date,
            )
            db.add(db_leg_2)

            # Nota: Los recursos del Tramo 2 (Tracto 2 y Chofer 2) NO se bloquean como "EN_RUTA"
            # todavía, porque ellos físicamente aún no están operando.

        # ==========================================
        # BLOQUEO FÍSICO DE RECURSOS
        # ==========================================
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

        valid_operator_ids = [oid for oid in operator_ids_to_block if oid is not None]
        if valid_operator_ids:
            operators = (
                db.query(models.Operator)
                .filter(models.Operator.id.in_(valid_operator_ids))
                .all()
            )
            for o in operators:
                o.status = models.OperatorStatus.EN_RUTA
                db.add(o)

        db.commit()
        db.refresh(db_trip)
        return db_trip

    except Exception as e:
        db.rollback()
        logger.error(f"Error Crítico en create_trip: {str(e)}")
        logger.error(traceback.format_exc())
        raise e


def update_trip_status(
    db: Session, trip_id: str, status: str, location: str | None = None
):
    trip = get_trip(db, trip_id)
    if not trip:
        return None
    # Si el viaje ya está cerrado o liquidado, NO permitimos que cambie a "en_transito" o "detenido"
    estados_finales = [
        models.TripStatus.ENTREGADO,
        models.TripStatus.CERRADO,
        "liquidado",
    ]
    if trip.status in estados_finales and status not in estados_finales:
        # Se aborta silenciosamente el cambio de estatus, protegiendo el viaje
        return trip

    active_leg = None
    if trip.legs:
        active_leg = trip.legs[-1]

    #  PROTECCIÓN DE FASE 2: Misma lógica, mantener vivo el viaje padre
    if status == models.TripStatus.ENTREGADO:
        is_last_leg = False
        if trip.legs:
            is_last_leg = active_leg.id == trip.legs[-1].id

        # Si es entrega de vacío O es la última fase del viaje, cerramos el viaje padre.
        if (active_leg and active_leg.leg_type == "entrega_vacio") or is_last_leg:
            trip.status = status
        else:
            trip.status = models.TripStatus.EN_TRANSITO
    else:
        trip.status = status

    trip.last_update = datetime.utcnow()

    if active_leg:
        if active_leg.status in estados_finales and status not in estados_finales:
            pass  # No regresamos el estatus del tramo
        else:
            active_leg.status = status
        active_leg.last_update = datetime.utcnow()
        if location:
            active_leg.last_location = location

    if status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
        if active_leg:
            active_leg.actual_arrival = datetime.utcnow()

        # Solo registrar llegada total si el viaje padre realmente se entregó o cerró
        if trip.status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
            trip.actual_arrival = datetime.utcnow()

        #  LIBERACIÓN DE UNIDADES INTELIGENTE
        # Solo liberamos chasis y dolly si el viaje se terminó (fase vacía completada)
        if trip.status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
            unit_ids_to_free = [
                active_leg.unit_id if active_leg else None,
                trip.remolque_1_id,
                trip.dolly_id,
                trip.remolque_2_id,
            ]
        else:
            # Si el viaje maestro sigue en tránsito (ej. solo terminó la fase carretera),
            # SOLO liberamos el tractocamión. ¡Los remolques siguen amarrados al viaje!
            unit_ids_to_free = [active_leg.unit_id if active_leg else None]

        valid_unit_ids = [uid for uid in unit_ids_to_free if uid is not None]

        if valid_unit_ids:
            units = (
                db.query(models.Unit).filter(models.Unit.id.in_(valid_unit_ids)).all()
            )
            for u in units:
                u.status = models.UnitStatus.DISPONIBLE
                db.add(u)

        if active_leg and active_leg.operator:
            active_leg.operator.status = models.OperatorStatus.ACTIVO
            db.add(active_leg.operator)

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


def update_trip(db: Session, trip_id: int, trip_update_data: dict):
    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not db_trip:
        return None

    # 1. Asignamos los datos (Remolques, Booking, Pesos, etc.) al Viaje Maestro
    for key, value in trip_update_data.items():
        if hasattr(db_trip, key):
            setattr(db_trip, key, value)

    # 2.  LA PIEZA FALTANTE: Bloquear los remolques que se acaban de asignar
    unit_ids_to_block = []
    if "remolque_1_id" in trip_update_data and trip_update_data["remolque_1_id"]:
        unit_ids_to_block.append(trip_update_data["remolque_1_id"])
    if "dolly_id" in trip_update_data and trip_update_data["dolly_id"]:
        unit_ids_to_block.append(trip_update_data["dolly_id"])
    if "remolque_2_id" in trip_update_data and trip_update_data["remolque_2_id"]:
        unit_ids_to_block.append(trip_update_data["remolque_2_id"])

    # Si vienen IDs en el payload, los pasamos a EN_RUTA
    if unit_ids_to_block:
        db.query(models.Unit).filter(
            models.Unit.id.in_(unit_ids_to_block),
            models.Unit.record_status != RecordStatus.ELIMINADO,
        ).update({"status": models.UnitStatus.EN_RUTA}, synchronize_session=False)

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
        .options(joinedload(models.Trip.legs))
        .filter(
            models.Trip.id == tid, models.Trip.record_status != RecordStatus.ELIMINADO
        )
        .first()
    )
    if not trip:
        return False

    unit_ids_to_free = [trip.remolque_1_id, trip.dolly_id, trip.remolque_2_id]
    operator_ids_to_free = []

    for leg in trip.legs:
        if leg.unit_id:
            unit_ids_to_free.append(leg.unit_id)
        if leg.operator_id:
            operator_ids_to_free.append(leg.operator_id)

    unit_ids_to_free = list(set([uid for uid in unit_ids_to_free if uid is not None]))
    operator_ids_to_free = list(
        set([oid for oid in operator_ids_to_free if oid is not None])
    )

    if unit_ids_to_free:
        db.query(models.Unit).filter(models.Unit.id.in_(unit_ids_to_free)).update(
            {"status": models.UnitStatus.DISPONIBLE}, synchronize_session=False
        )

    if operator_ids_to_free:
        db.query(models.Operator).filter(
            models.Operator.id.in_(operator_ids_to_free)
        ).update({"status": models.OperatorStatus.ACTIVO}, synchronize_session=False)

    trip.record_status = RecordStatus.ELIMINADO
    for leg in trip.legs:
        leg.record_status = RecordStatus.ELIMINADO

    db.add(trip)
    db.commit()
    return True


def add_timeline_event(
    db: Session, trip_id: int, payload: schemas.TripTimelineEventCreatePayload
):
    trip = get_trip(db, str(trip_id))
    if not trip:
        return None

    active_leg = None

    # 1. NUEVA LÓGICA: Si React mandó el ID exacto del tramo (Ej. el de Juan), lo buscamos y usamos ese.
    if getattr(payload, "trip_leg_id", None):
        active_leg = next(
            (leg for leg in trip.legs if leg.id == payload.trip_leg_id), None
        )

    # 2. LÓGICA ANTERIOR (Respaldo): Si React no mandó nada, buscamos el último tramo activo.
    if not active_leg:
        active_leg = next(
            (
                leg
                for leg in reversed(trip.legs)
                if leg.status not in ["entregado", "cerrado", "liquidado"]
            ),
            trip.legs[-1] if trip.legs else None,
        )

    #  MAPEO SEGURO DE ESTADOS (Frontend -> ENUM PostgreSQL)
    status_db_validos = ["detenido", "retraso", "accidente", "bloqueado", "entregado"]
    mapped_status = (
        payload.status if payload.status in status_db_validos else "en_transito"
    )

    if payload.status == "entregado":
        is_last_leg = True
        if trip.legs:
            is_last_leg = active_leg.id == trip.legs[-1].id

        # Si es entrega_vacio o es la última fase del viaje, cerramos el viaje.
        if (active_leg and active_leg.leg_type == "entrega_vacio") or is_last_leg:
            trip.status = "entregado"

            #  LIBERAR UNIDADES AUTOMÁTICAMENTE PARA QUE NO QUEDEN "EN TRÁNSITO"
            unit_ids_to_free = [
                active_leg.unit_id if active_leg else None,
                trip.remolque_1_id,
                trip.dolly_id,
                trip.remolque_2_id,
            ]
            valid_unit_ids = [uid for uid in unit_ids_to_free if uid is not None]
            if valid_unit_ids:
                db.query(models.Unit).filter(models.Unit.id.in_(valid_unit_ids)).update(
                    {"status": "disponible"}, synchronize_session=False
                )

            if active_leg and active_leg.operator_id:
                db.query(models.Operator).filter(
                    models.Operator.id == active_leg.operator_id
                ).update({"status": "activo"}, synchronize_session=False)
        else:
            trip.status = "en_transito"
    else:
        trip.status = mapped_status

    trip.last_update = datetime.utcnow()

    if hasattr(payload, "terminal_entrega_vacio") and payload.terminal_entrega_vacio:
        trip.terminal_entrega_vacio = payload.terminal_entrega_vacio

    if active_leg:
        if payload.status == "entregado":
            active_leg.status = "entregado"
        else:
            active_leg.status = mapped_status

        active_leg.last_update = datetime.utcnow()
        active_leg.last_location = payload.location

        # Guardar la hora real de llegada a esta fase
        if payload.status == "entregado":
            active_leg.actual_arrival = datetime.utcnow()

        if active_leg.unit:
            unidad = active_leg.unit
            if payload.odometro:
                active_leg.odometro_final = payload.odometro
                if hasattr(unidad, "odometro"):
                    unidad.odometro = payload.odometro
            if payload.combustible_porcentaje is not None:
                if hasattr(unidad, "nivel_combustible_porcentaje"):
                    unidad.nivel_combustible_porcentaje = payload.combustible_porcentaje
            if payload.combustible_litros is not None:
                if hasattr(unidad, "nivel_combustible_litros"):
                    unidad.nivel_combustible_litros = payload.combustible_litros

        # 🚀 LÓGICA INCORPORADA: ATRAPAMOS EL MONTO DE PENALIZACIÓN DICTAMINADO POR LA AUDITORÍA
        if getattr(payload, "penalizacion_monto", None) is not None:
            active_leg.monto_penalizaciones = payload.penalizacion_monto

        # ---------------------------------------------------------
        # NUEVO BLOQUE SEGURO: MARCAR VALES COMO CONCILIADOS
        # Solo se ejecuta si el evento viene de la conciliación
        # ---------------------------------------------------------
        if payload.location == "Conciliación de Combustible":
            db.query(models.FuelLog).filter(
                models.FuelLog.trip_leg_id == active_leg.id,
                models.FuelLog.record_status == "A",
                models.FuelLog.is_conciliated == False,
            ).update({"is_conciliated": True}, synchronize_session=False)
        # ---------------------------------------------------------

        #  LA BITÁCORA SÍ GUARDA EL TEXTO ORIGINAL DEL EVENTO PARA EL HISTORIAL
        db_event = models.TripTimelineEvent(
            trip_leg_id=active_leg.id,
            time=datetime.utcnow(),
            event=f"{payload.status.replace('_', ' ').title()} en {payload.location}",
            event_type=payload.status,
            location=payload.location,
            lat=payload.lat,
            lng=payload.lng,
            comments=payload.comments,
        )
        db.add(db_event)

    db.add(trip)
    if hasattr(payload, "notifyClient") and payload.notifyClient:
        from app.integrations.email.email_service import EmailService

        fecha_str = datetime.utcnow().strftime("%d/%m/%Y %H:%M")

        email_svc = EmailService(db)
        email_svc.send_status_update(
            trip=trip,
            status=payload.status,
            location=payload.location,
            event_time=fecha_str,
        )

    db.commit()
    db.refresh(trip)
    return trip


def get_trip_settlement(db: Session, trip_leg_id: int):
    """
    FASE 4: Liquidación adaptada para Movimientos de Patio y Vacío
    (Modificado: Cálculo dinámico de combustible con 5% de Tolerancia)
    """
    import uuid
    from . import schemas

    leg = (
        db.query(models.TripLeg)
        .options(joinedload(models.TripLeg.trip))
        .filter(
            models.TripLeg.id == trip_leg_id,
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not leg or not leg.trip:
        return None

    trip = leg.trip
    fecha_viaje = leg.start_date.strftime("%Y-%m-%d") if leg.start_date else "N/A"

    # Banderas operativas
    is_ruta = leg.leg_type == models.TripLegType.RUTA
    is_full = (trip.dolly_id is not None) or (trip.remolque_2_id is not None)

    # 1. CÁLCULO DE DISTANCIA REAL VS ESTIMADA
    if (
        leg.odometro_final
        and leg.odometro_inicial
        and leg.odometro_final > leg.odometro_inicial
    ):
        kms_recorridos = float(leg.odometro_final - leg.odometro_inicial)
    else:
        kms_recorridos = float(
            trip.tariff.distancia_km if trip.tariff and trip.tariff.distancia_km else 0
        )

    # Filtramos solo los vales activos asignados a este tramo específico
    fuel_logs = (
        db.query(models.FuelLog)
        .filter(
            models.FuelLog.trip_leg_id == trip_leg_id,
            models.FuelLog.record_status == "A",
        )
        .all()
    )

    # Solo exige combustible si es un viaje de Carretera
    if is_ruta and not fuel_logs:
        raise ValueError("BLOCKED_NO_FUEL")

    consumo_real_litros = 0.0
    precio_promedio_litro = 24.50
    consumo_esperado = 0.0
    diferencia_litros = 0.0
    deduccion_combustible = 0.0

    conceptos = []

    # 2. JALAR SUELDO FIJO PACTADO COMO INGRESO
    sueldo_fijo = 0.0
    if trip.sueldo_operador and float(trip.sueldo_operador) > 0:
        sueldo_fijo = float(trip.sueldo_operador)
    elif (
        trip.tariff
        and trip.tariff.sueldo_operador
        and float(trip.tariff.sueldo_operador) > 0
    ):
        sueldo_fijo = float(trip.tariff.sueldo_operador)

    if sueldo_fijo > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="ingreso",
                categoria="tarifa",
                descripcion="Sueldo Base Pactado",
                monto=sueldo_fijo,
                esAutomatico=True,
            )
        )

    # 3. LÓGICA DE COMBUSTIBLE (CARRETERA) CON TOLERANCIA DEL 5%
    if is_ruta:
        vales_diesel = [f for f in fuel_logs if f.tipo_combustible == "diesel"]
        consumo_real_litros = sum(f.litros for f in vales_diesel)

        # Calculamos consumo esperado usando el rendimiento esperado del motor (ECM)
        rendimiento_esperado = getattr(leg.unit, "rendimiento_ecm_esperado", 3.2) or 3.2
        consumo_esperado = (
            (kms_recorridos / rendimiento_esperado) if kms_recorridos > 0 else 0.0
        )

        if vales_diesel:
            precio_promedio_litro = sum(f.precio_por_litro for f in vales_diesel) / len(
                vales_diesel
            )

        # Diferencia de litros = Lo que cargó (real) - Lo que debió gastar (esperado)
        diferencia_cruda = consumo_real_litros - consumo_esperado
        diferencia_litros = diferencia_cruda if diferencia_cruda > 0 else 0.0

        # REGLA GUSTAVO / UI: Aplicar tolerancia del 5% del consumo esperado
        tolerancia = consumo_esperado * 0.05

        # Si el operador se pasa de la tolerancia, cobramos TODO el exceso
        if diferencia_litros > tolerancia:
            deduccion_combustible = diferencia_litros * precio_promedio_litro

            conceptos.append(
                schemas.ConceptoPago(
                    id=str(uuid.uuid4())[:8],
                    tipo="deduccion",
                    categoria="combustible",
                    descripcion=f"Exceso Diésel Detectado ({diferencia_litros:.1f} L)",
                    monto=deduccion_combustible,
                    esAutomatico=True,
                )
            )

    # 4. LÓGICA DE MOVIMIENTO LOCAL (Patio o Vacío)
    else:
        # Si NO hay sueldo fijo en catálogo, aplicamos la regla genérica
        if sueldo_fijo == 0:
            bono_movimiento = 300.0 if is_full else 200.0
            tipo_mov_str = (
                "Mov. Patio"
                if leg.leg_type == models.TripLegType.CARGA
                else "Retorno Vacío"
            )
            config_str = "FULL" if is_full else "SENCILLO"

            conceptos.append(
                schemas.ConceptoPago(
                    id=str(uuid.uuid4())[:8],
                    tipo="ingreso",
                    categoria="bono",
                    descripcion=f"Bono {tipo_mov_str} ({config_str})",
                    monto=bono_movimiento,
                    esAutomatico=True,
                )
            )

    # 5. DEDUCCIONES FIJAS (ANTICIPOS DEL TRAMO)
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
        total_ingresos=total_ingresos,
        total_deducciones=total_deducciones,
        neto_a_pagar=neto_pagar,
        consumoEsperadoLitros=round(consumo_esperado, 2),
        consumoRealLitros=round(consumo_real_litros, 2),
        diferenciaLitros=round(diferencia_litros, 2),
        precioPorLitro=round(precio_promedio_litro, 2),
        deduccionCombustible=round(deduccion_combustible, 2),
    )


def close_trip_settlement(
    db: Session, trip_leg_id: int, payload: schemas.CloseSettlementPayload
):
    leg = (
        db.query(models.TripLeg)
        .filter(
            models.TripLeg.id == trip_leg_id,
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not leg:
        return None

    leg.status = models.TripStatus.CERRADO
    leg.saldo_operador = payload.neto_a_pagar
    leg.actual_arrival = datetime.utcnow()

    #  NUEVO: Guardar el odómetro en el tramo y en el camión
    if payload.odometro_final:
        leg.odometro_final = payload.odometro_final
        if leg.unit:
            leg.unit.odometro = payload.odometro_final

    event = models.TripTimelineEvent(
        trip_leg_id=leg.id,
        time=datetime.utcnow(),
        event=f"Tramo Liquidado y Cerrado. Saldo pagado: ${payload.neto_a_pagar:,.2f}",
        event_type="success",
    )
    db.add(event)

    if leg.trip:
        leg.trip.status = models.TripStatus.CERRADO
        leg.trip.closed_at = datetime.utcnow()
        db.add(leg.trip)

    db.add(leg)
    db.commit()
    db.refresh(leg)
    return leg.trip


def create_next_leg(db: Session, trip_id: str, payload: schemas.TripLegCreate):
    tid = int(trip_id)
    trip = (
        db.query(models.Trip)
        .filter(
            models.Trip.id == tid, models.Trip.record_status != RecordStatus.ELIMINADO
        )
        .first()
    )

    if not trip:
        return None

    if trip.legs:
        last_leg = trip.legs[-1]

        if last_leg.status not in [
            models.TripStatus.ENTREGADO,
            models.TripStatus.CERRADO,
        ]:
            last_leg.status = models.TripStatus.ENTREGADO
            last_leg.actual_arrival = datetime.utcnow()
            last_leg.last_update = datetime.utcnow()

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

            db_event = models.TripTimelineEvent(
                trip_leg_id=last_leg.id,
                time=datetime.utcnow(),
                event="Tramo concluido por Desenganche / Cambio de operador.",
                event_type="info",
            )
            db.add(db_event)
            db.add(last_leg)

        if not payload.odometro_inicial or payload.odometro_inicial == 0:
            payload.odometro_inicial = get_last_unit_odometer(db, payload.unit_id)

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
    db.flush()

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

    trip.status = models.TripStatus.EN_TRANSITO
    trip.last_update = datetime.utcnow()
    db.add(trip)

    db.commit()
    db.refresh(trip)
    return trip


# =========================================================
#  LA VERDADERA MAGIA (LIQUIDACIÓN POR LOTE ACTUALIZADA)
# =========================================================


def settle_trip_legs_batch(db: Session, payload: schemas.BatchSettlementPayload):
    legs = (
        db.query(models.TripLeg)
        .filter(
            models.TripLeg.id.in_(payload.leg_ids),
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .all()
    )
    if not legs:
        return None

    # INICIO DEL BLINDAJE DE TRANSACCIÓN
    try:
        trips_to_check = set()
        num_legs = len(legs)

        # Juntamos los conceptos manuales enviados desde el borrador dinámico en React
        conceptos_json = (
            [c.model_dump() for c in payload.conceptos_extra]
            if payload.conceptos_extra
            else []
        )

        # Inyectamos el Sueldo Base como ingreso automático si es mayor a 0
        if payload.monto_sueldo > 0:
            conceptos_json.append(
                {
                    "id": str(uuid.uuid4())[:8],
                    "tipo": "ingreso",
                    "categoria": "tarifa",
                    "descripcion": "Sueldo Base Pactado",
                    "monto": payload.monto_sueldo / num_legs,
                    "esAutomatico": True,
                }
            )

        # Inyectamos la Penalización de Combustible desmenuzada si existe
        if payload.monto_penalizaciones > 0:
            conceptos_json.append(
                {
                    "id": str(uuid.uuid4())[:8],
                    "tipo": "deduccion",
                    "categoria": "combustible",
                    "descripcion": "Cargo por Diésel (Monto excedente de tolerancia permitida)",
                    "monto": payload.monto_penalizaciones / num_legs,
                    "esAutomatico": True,
                }
            )

        for leg in legs:
            leg.status = "liquidado"

            # Desglose financiero para los reportes (Dividido equitativamente)
            leg.monto_sueldo = payload.monto_sueldo / num_legs
            leg.monto_bonos = payload.monto_bonos / num_legs
            leg.monto_maniobras = payload.monto_maniobras / num_legs
            leg.monto_penalizaciones = payload.monto_penalizaciones / num_legs

            leg.saldo_operador = payload.neto_a_pagar / num_legs
            leg.monto_neto_pagado = payload.neto_a_pagar / num_legs
            leg.desglose_conceptos = conceptos_json
            leg.actual_arrival = datetime.utcnow()

            event = models.TripTimelineEvent(
                trip_leg_id=leg.id,
                time=datetime.utcnow(),
                event=f"Tramo Liquidado en Lote. Saldo acreditado: ${(payload.neto_a_pagar/num_legs):,.2f} (Desc. Registro de detalles: ${(payload.monto_penalizaciones/num_legs):,.2f})",
                event_type="success",
            )
            db.add(event)
            trips_to_check.add(leg.trip)

        cxc_creadas = 0

        for trip in trips_to_check:
            all_completed = all(
                l.status in ["entregado", "cerrado", "liquidado"] for l in trip.legs
            )

            if all_completed and trip.status not in ["cerrado", "liquidado"]:
                trip.status = "cerrado"
                trip.closed_at = func.now()

                #  LIBERAR RECURSOS (UNIDADES Y OPERADORES) AL TERMINAR EL VIAJE
                unit_ids_to_free = [
                    trip.remolque_1_id,
                    trip.dolly_id,
                    trip.remolque_2_id,
                ]
                operator_ids_to_free = []

                for l in trip.legs:
                    if l.unit_id:
                        unit_ids_to_free.append(l.unit_id)
                    if l.operator_id:
                        operator_ids_to_free.append(l.operator_id)

                unit_ids_to_free = list(
                    set([uid for uid in unit_ids_to_free if uid is not None])
                )
                operator_ids_to_free = list(
                    set([oid for oid in operator_ids_to_free if oid is not None])
                )

                if unit_ids_to_free:
                    db.query(models.Unit).filter(
                        models.Unit.id.in_(unit_ids_to_free)
                    ).update({"status": "disponible"}, synchronize_session=False)

                if operator_ids_to_free:
                    db.query(models.Operator).filter(
                        models.Operator.id.in_(operator_ids_to_free)
                    ).update({"status": "activo"}, synchronize_session=False)

                #  CREACIÓN DE CXC
                existing_cxc = (
                    db.query(models.ReceivableInvoice)
                    .filter(
                        models.ReceivableInvoice.viaje_id == trip.id,
                        models.ReceivableInvoice.record_status
                        != RecordStatus.ELIMINADO,
                    )
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
                        metodo_pago="PPD",
                        tipo_comprobante="I",
                    )
                    db.add(nueva_cxc)
                    cxc_creadas += 1

        db.commit()
        return {
            "message": "Liquidación completada y Recursos Liberados",
            "legs_procesados": len(legs),
            "cxc_generadas": cxc_creadas,
        }

    except Exception as e:
        # SI ALGO FALLA: Deshacemos todo lo que intentó guardar en la memoria
        db.rollback()
        logger.error(f"Falla crítica al liquidar lote: {str(e)}")
        # Levantamos el error para que el Frontend reciba un 500 y no un falso "éxito"
        raise e


def preview_batch_settlement(db: Session, leg_ids: list[int]):
    legs = (
        db.query(models.TripLeg)
        .options(
            joinedload(models.TripLeg.trip).joinedload(models.Trip.tariff),
            joinedload(models.TripLeg.unit),
            joinedload(models.TripLeg.fuel_logs),
        )
        .filter(
            models.TripLeg.id.in_(leg_ids),
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .all()
    )

    if not legs:
        return None

    total_kms_reales = 0.0
    total_real_liters = 0.0
    total_fuel_cost = 0.0
    total_consumo_esperado = 0.0
    alertas = []
    legs_sin_ticket = []

    for leg in legs:
        distancia = 0.0
        is_ruta = leg.leg_type == models.TripLegType.RUTA

        if (
            leg.odometro_final
            and leg.odometro_inicial
            and leg.odometro_final >= leg.odometro_inicial
        ):
            distancia = float(leg.odometro_final - leg.odometro_inicial)
        else:
            distancia = float(
                leg.trip.tariff.distancia_km if leg.trip and leg.trip.tariff else 0.0
            )
            if is_ruta:
                alertas.append(
                    f"Tramo #{leg.id}: Usando distancia teórica (Faltan odómetros en auditoría)."
                )

        if is_ruta:
            total_kms_reales += distancia
            rendimiento = getattr(leg.unit, "rendimiento_ecm_esperado", 3.2) or 3.2
            total_consumo_esperado += (
                (distancia / rendimiento) if distancia > 0 else 0.0
            )

            fuel_logs_activos = [
                f
                for f in leg.fuel_logs
                if f.record_status == "A" and f.tipo_combustible == "diesel"
            ]

            if not fuel_logs_activos:
                legs_sin_ticket.append(leg.id)

            for f in fuel_logs_activos:
                total_real_liters += f.litros
                total_fuel_cost += f.litros * f.precio_por_litro

    # Calculamos el precio promedio
    precio_promedio = (
        (total_fuel_cost / total_real_liters) if total_real_liters > 0 else 24.50
    )

    # =========================================================================
    # LÓGICA NUEVA: DEDUCCIÓN DE COMBUSTIBLE DICTAMINADA POR AUDITORÍA (FRONTEND)
    # =========================================================================
    diferencia_litros_total = 0.0
    deduccion_combustible = 0.0

    for leg in legs:
        # Tomamos directamente lo que la auditoría dictaminó y guardó en la BD
        if getattr(leg, "monto_penalizaciones", 0.0) > 0:
            deduccion_combustible += leg.monto_penalizaciones

        # Para mostrar cuántos litros faltaron (meramente visual para la pre-liquidación)
        vales = [
            f
            for f in leg.fuel_logs
            if f.record_status == "A" and f.tipo_combustible == "diesel"
        ]
        for vale in vales:
            is_conciliated = getattr(vale, "is_conciliated", False)
            diferencia = getattr(vale, "diferencia_litros", 0.0)

            # Sumamos la diferencia si el vale ya fue conciliado (si tienes este flujo activo)
            if is_conciliated and diferencia > 0:
                diferencia_litros_total += diferencia
    # =========================================================================

    # JALAR SUELDO FIJO
    sueldo_operador_pactado = 0.0
    if legs and legs[0].trip:
        trip_padre = legs[0].trip
        # Priorizamos el sueldo congelado en el viaje, si no, el del catálogo
        sueldo_operador_pactado = (
            float(trip_padre.sueldo_operador)
            if trip_padre.sueldo_operador
            else (
                float(trip_padre.tariff.sueldo_operador) if trip_padre.tariff else 0.0
            )
        )

    return {
        "total_kms": round(total_kms_reales, 2),
        "consumo_esperado": round(total_consumo_esperado, 2),
        "consumo_real": round(total_real_liters, 2),
        "diferencia_litros": round(diferencia_litros_total, 2),
        "precio_promedio": round(precio_promedio, 2),
        "deduccion_combustible": round(deduccion_combustible, 2),
        "sueldo_operador_pactado": sueldo_operador_pactado,
        "alertas": alertas,
        "legs_sin_ticket": legs_sin_ticket,
    }


def get_last_unit_odometer(db: Session, unit_id: int) -> int:
    last_leg = (
        db.query(models.TripLeg)
        .filter(
            models.TripLeg.unit_id == unit_id,
            models.TripLeg.odometro_final != None,
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .order_by(models.TripLeg.id.desc())
        .first()
    )

    if last_leg:
        return last_leg.odometro_final

    last_fuel = (
        db.query(models.FuelLog)
        .filter(
            models.FuelLog.unit_id == unit_id,
            models.FuelLog.record_status != RecordStatus.ELIMINADO,
        )
        .order_by(models.FuelLog.odometro.desc())
        .first()
    )

    return last_fuel.odometro if last_fuel else 0


def undo_last_leg(db: Session, trip_id: str):
    tid = int(trip_id)
    trip = (
        db.query(models.Trip)
        .filter(
            models.Trip.id == tid, models.Trip.record_status != RecordStatus.ELIMINADO
        )
        .first()
    )

    if not trip or not trip.legs:
        return False

    current_leg = trip.legs[-1]

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

    db.delete(current_leg)

    if len(trip.legs) > 1:
        previous_leg = trip.legs[-2]
        previous_leg.status = models.TripStatus.EN_TRANSITO
        previous_leg.actual_arrival = None

        if previous_leg.unit_id:
            pu = (
                db.query(models.Unit)
                .filter(models.Unit.id == previous_leg.unit_id)
                .first()
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

        trip.status = models.TripStatus.EN_TRANSITO
    else:
        trip.status = models.TripStatus.CREADO

    trip.closed_at = None
    db.commit()

    db.refresh(trip)
    return trip


def reset_leg_audit(db: Session, leg_id: int):
    leg = (
        db.query(models.TripLeg)
        .filter(
            models.TripLeg.id == leg_id,
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not leg:
        return None

    # Limpiamos el odómetro final para que la fase vuelva a pedir auditoría
    leg.odometro_final = None

    # Registramos en la bitácora que la auditoría fue anulada
    event = models.TripTimelineEvent(
        trip_leg_id=leg.id,
        time=datetime.utcnow(),
        event="Registro de detalles de combustible revertida por el usuario. Fase pendiente de conciliación.",
        event_type="info",
    )
    db.add(event)

    db.commit()
    db.refresh(leg)
    return leg


def unhook_in_yard(db: Session, trip_id: str):
    tid = int(trip_id)
    trip = (
        db.query(models.Trip)
        .filter(
            models.Trip.id == tid, models.Trip.record_status != RecordStatus.ELIMINADO
        )
        .first()
    )

    if not trip or not trip.legs:
        return None

    # Obtenemos la fase activa
    active_leg = trip.legs[-1]

    if active_leg.status in ["entregado", "cerrado", "liquidado"]:
        raise ValueError("Este tramo ya está cerrado o entregado.")

    # REGLA DE GUSTAVO: Solo se puede desenganchar en la Fase 1 (Carga Patio/Muelle)
    if active_leg.leg_type != "carga_muelle":
        raise ValueError(
            "Solo se permite desenganchar viajes que están en fase de Carga en Patio/Muelle."
        )

    # 1. Liberamos SOLO Tractocamión y Operador.
    # (El Remolque 1, Dolly y Remolque 2 siguen atados al `Trip` maestro)
    if active_leg.unit_id:
        tracto = (
            db.query(models.Unit).filter(models.Unit.id == active_leg.unit_id).first()
        )
        if tracto:
            tracto.status = models.UnitStatus.DISPONIBLE

    if active_leg.operator_id:
        op = (
            db.query(models.Operator)
            .filter(models.Operator.id == active_leg.operator_id)
            .first()
        )
        if op:
            op.status = models.OperatorStatus.ACTIVO

    # 2. Marcamos el tramo local como completado
    active_leg.status = models.TripStatus.ENTREGADO
    active_leg.actual_arrival = datetime.utcnow()
    active_leg.last_update = datetime.utcnow()

    # 3. Ponemos el Viaje en estado DETENIDO (o un estado custom) para que el despachador
    # sepa que está en patio esperando asignación de carretera
    trip.status = models.TripStatus.DETENIDO
    trip.last_update = datetime.utcnow()

    # 4. Dejamos el registro en la Bitácora
    db_event = models.TripTimelineEvent(
        trip_leg_id=active_leg.id,
        time=datetime.utcnow(),
        event="Desenganche en patio. Operador y Tractocamión liberados. Carga en espera de asignación de carretera.",
        event_type="info",
        location="Patio de Operaciones",
    )
    db.add(db_event)

    db.commit()
    db.refresh(trip)
    return trip
