import os
import time  # <-- NUEVO: Para el sleep de la sincronización masiva
import uuid
import datetime
from datetime import date, timedelta, datetime as dt_utcnow
from pathlib import Path
from typing import List, Optional
import requests  # <-- NUEVO: Para la API de mapas OSRM
import traceback  # <-- PARA IMPRIMIR EL ERROR EXACTO EN CONSOLA

from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from fastapi.responses import Response
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, or_  # <-- NUEVO: Agregado or_ para la consulta masiva
from jinja2 import Environment, FileSystemLoader

from app.db.database import get_db
from app.models import models
from app.models.models import SystemConfig, RecordStatus

# importacion LOCAL (FSD): Solo busca en la misma carpeta "logistics"
from . import schemas

# Autenticación
from app.modules.auth.router import get_current_user

try:
    from weasyprint import HTML
except Exception as e:
    print(f" Advertencia: WeasyPrint no se cargó correctamente ({e})")
    HTML = None

import logging

logger = logging.getLogger("logistics.crud")

# =====================================================================
# FUNCIONES HELPER
# =====================================================================


def get_osrm_distance(origen: str, destino: str) -> float:
    """
    Calcula la distancia real en carretera usando la API gratuita de OpenStreetMap / OSRM.
    """
    try:
        headers = {"User-Agent": "TMS-Rapidos3T/1.0 (contacto@tuempresa.com)"}

        res_orig = requests.get(
            f"https://nominatim.openstreetmap.org/search?q={origen}, Mexico&format=json&limit=1",
            headers=headers,
            timeout=5,
        ).json()

        res_dest = requests.get(
            f"https://nominatim.openstreetmap.org/search?q={destino}, Mexico&format=json&limit=1",
            headers=headers,
            timeout=5,
        ).json()

        if res_orig and res_dest:
            lon1, lat1 = res_orig[0]["lon"], res_orig[0]["lat"]
            lon2, lat2 = res_dest[0]["lon"], res_dest[0]["lat"]

            osrm_url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
            route_res = requests.get(osrm_url, timeout=5).json()

            if route_res.get("code") == "Ok":
                distancia_metros = route_res["routes"][0]["distance"]
                return round(distancia_metros / 1000.0, 2)
    except Exception as e:
        print(f"⚠️ Advertencia silenciosa calculando distancia OSRM: {e}")
    return 0.0


# =====================================================================
# CRUD TRIPS (GET, CREATE, UPDATE, DELETE)
# =====================================================================


def get_trips(db: Session, skip: int = 0, limit: int = 100):
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
        .order_by(models.Trip.id.desc())
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
    try:
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
                status=db_trip.status,
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

        if getattr(trip, "conoce_ruta_completa", False) and getattr(
            trip, "final_leg", None
        ):
            leg_final = trip.final_leg
            db_leg_2 = models.TripLeg(
                trip_id=db_trip.id,
                leg_type=leg_final.leg_type or "ruta_carretera",
                status="creado",
                unit_id=leg_final.unit_id,
                operator_id=leg_final.operator_id,
                anticipo_casetas=0.0,
                anticipo_viaticos=0.0,
                anticipo_combustible=0.0,
                monto_neto_pagado=0.0,
                start_date=db_trip.start_date,
            )
            db.add(db_leg_2)

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

    estados_finales = [
        models.TripStatus.ENTREGADO,
        models.TripStatus.CERRADO,
        "liquidado",
    ]
    if trip.status in estados_finales and status not in estados_finales:
        return trip

    active_leg = None
    if trip.legs:
        active_leg = trip.legs[-1]

    if status == models.TripStatus.ENTREGADO:
        is_last_leg = False
        if trip.legs:
            is_last_leg = active_leg.id == trip.legs[-1].id

        if (active_leg and active_leg.leg_type == "entrega_vacio") or is_last_leg:
            trip.status = status
        else:
            trip.status = models.TripStatus.EN_TRANSITO
    else:
        trip.status = status

    trip.last_update = dt_utcnow.utcnow()

    if active_leg:
        if active_leg.status in estados_finales and status not in estados_finales:
            pass
        else:
            active_leg.status = status
        active_leg.last_update = dt_utcnow.utcnow()
        if location:
            active_leg.last_location = location

    if status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
        if active_leg:
            active_leg.actual_arrival = dt_utcnow.utcnow()
        if trip.status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
            trip.actual_arrival = dt_utcnow.utcnow()

    if active_leg:
        event = models.TripTimelineEvent(
            trip_leg_id=active_leg.id,
            time=dt_utcnow.utcnow(),
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

    for key, value in trip_update_data.items():
        if hasattr(db_trip, key):
            setattr(db_trip, key, value)

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

    if getattr(payload, "trip_leg_id", None):
        active_leg = next(
            (leg for leg in trip.legs if leg.id == payload.trip_leg_id), None
        )

    if not active_leg:
        active_leg = next(
            (
                leg
                for leg in reversed(trip.legs)
                if leg.status not in ["entregado", "cerrado", "liquidado"]
            ),
            trip.legs[-1] if trip.legs else None,
        )

    status_db_validos = ["detenido", "retraso", "accidente", "bloqueado", "entregado"]
    mapped_status = (
        payload.status if payload.status in status_db_validos else "en_transito"
    )

    if payload.status == "entregado":
        is_last_leg = True
        if trip.legs:
            is_last_leg = active_leg.id == trip.legs[-1].id

        if (active_leg and active_leg.leg_type == "entrega_vacio") or is_last_leg:
            trip.status = "entregado"
        else:
            trip.status = "en_transito"
    else:
        trip.status = mapped_status

    trip.last_update = dt_utcnow.utcnow()

    if hasattr(payload, "terminal_entrega_vacio") and payload.terminal_entrega_vacio:
        trip.terminal_entrega_vacio = payload.terminal_entrega_vacio

    if active_leg:
        if payload.status == "entregado":
            active_leg.status = "entregado"
        else:
            active_leg.status = mapped_status

        active_leg.last_update = dt_utcnow.utcnow()
        active_leg.last_location = payload.location

        if payload.status == "entregado":
            active_leg.actual_arrival = dt_utcnow.utcnow()

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

        if getattr(payload, "penalizacion_monto", None) is not None:
            active_leg.monto_penalizaciones = payload.penalizacion_monto

        if payload.location == "Conciliación de Combustible":
            db.query(models.FuelLog).filter(
                models.FuelLog.trip_leg_id == active_leg.id,
                models.FuelLog.record_status == "A",
                models.FuelLog.is_conciliated == False,
            ).update({"is_conciliated": True}, synchronize_session=False)

        db_event = models.TripTimelineEvent(
            trip_leg_id=active_leg.id,
            time=dt_utcnow.utcnow(),
            event=f"{payload.status.replace('_', ' ').title()} en {payload.location}",
            event_type=payload.status,
            location=payload.location,
            lat=payload.lat,
            lng=payload.lng,
            comments=payload.comments,
        )
        db.add(db_event)

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


# =====================================================================
# 🚀 LA VERDADERA MAGIA: LIQUIDACIÓN POR LOTE BLINDADA Y CON RASTREO
# =====================================================================


def settle_trip_legs_batch(db: Session, payload: schemas.BatchSettlementPayload):
    logger.info(
        f"🟢 [1] INICIANDO liquidación de lote para {len(payload.leg_ids)} tramos."
    )

    legs = (
        db.query(models.TripLeg)
        .filter(
            models.TripLeg.id.in_(payload.leg_ids),
            models.TripLeg.record_status != RecordStatus.ELIMINADO,
        )
        .all()
    )
    if not legs:
        logger.warning("🟡 [1] No se encontraron tramos válidos para liquidar.")
        return None

    try:
        trips_to_check = set()
        num_legs = len(legs)

        logger.info("🟢 [2] Juntando conceptos extra...")
        conceptos_json = (
            [
                c.model_dump() if hasattr(c, "model_dump") else dict(c)
                for c in payload.conceptos_extra
            ]
            if payload.conceptos_extra
            else []
        )

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

        if payload.monto_penalizaciones > 0:
            conceptos_json.append(
                {
                    "id": str(uuid.uuid4())[:8],
                    "tipo": "deduccion",
                    "categoria": "combustible",
                    "descripcion": "Cargo por Diésel (Monto excedente)",
                    "monto": payload.monto_penalizaciones / num_legs,
                    "esAutomatico": True,
                }
            )

        logger.info("🟢 [3] Actualizando cada tramo...")
        for leg in legs:
            leg.status = "liquidado"
            leg.monto_sueldo = payload.monto_sueldo / num_legs
            leg.monto_bonos = payload.monto_bonos / num_legs
            leg.monto_maniobras = payload.monto_maniobras / num_legs
            leg.monto_penalizaciones = payload.monto_penalizaciones / num_legs
            leg.saldo_operador = payload.neto_a_pagar / num_legs
            leg.monto_neto_pagado = payload.neto_a_pagar / num_legs
            leg.desglose_conceptos = conceptos_json
            leg.actual_arrival = dt_utcnow.utcnow()

            event = models.TripTimelineEvent(
                trip_leg_id=leg.id,
                time=dt_utcnow.utcnow(),
                event=f"Tramo Liquidado en Lote. Saldo acreditado: ${(payload.neto_a_pagar/num_legs):,.2f}",
                event_type="success",
            )
            db.add(event)
            trips_to_check.add(leg.trip)

        cxc_creadas = 0

        logger.info(
            f"🟢 [4] Verificando cierres de viaje para {len(trips_to_check)} viaje(s)."
        )
        for trip in trips_to_check:
            all_completed = all(
                l.status in ["entregado", "cerrado", "liquidado"] for l in trip.legs
            )

            if all_completed and trip.status not in ["cerrado", "liquidado"]:
                logger.info(f"🟢 [4.1] Cerrando viaje ID {trip.id} por completo.")
                trip.status = "cerrado"
                trip.closed_at = dt_utcnow.utcnow()

            carretera_liquidada = any(
                (
                    l.leg_type == "ruta_carretera"
                    or l.leg_type == getattr(models, "TripLegType", None)
                    and l.leg_type == models.TripLegType.RUTA
                )
                and l.status in ["liquidado", "cerrado"]
                for l in trip.legs
            )

            if carretera_liquidada:
                logger.info(f"🟢 [5] Evaluando creación de CXC para viaje ID {trip.id}")
                existing_cxc = (
                    db.query(models.ReceivableInvoice)
                    .filter(
                        models.ReceivableInvoice.viaje_id == trip.id,
                        models.ReceivableInvoice.record_status
                        != RecordStatus.ELIMINADO,
                        models.ReceivableInvoice.is_nominal == False,
                    )
                    .first()
                )

                if not existing_cxc:
                    logger.info(
                        "🟢 [5.1] No existe CXC definitiva. Procediendo a crearla..."
                    )
                    base = float(trip.tarifa_base or 0.0)
                    subtotal = base

                    iva = subtotal * 0.16
                    retencion = subtotal * 0.04
                    monto_total = subtotal + iva - retencion

                    dias_credito = 15
                    if trip.client and trip.client.dias_credito:
                        dias_credito = trip.client.dias_credito

                    logger.info(
                        "🟢 [5.2] Buscando Carta Porte nominal para relación 04..."
                    )
                    cp_nominal = (
                        db.query(models.ReceivableInvoice)
                        .filter(
                            models.ReceivableInvoice.viaje_id == trip.id,
                            models.ReceivableInvoice.is_nominal == True,
                            models.ReceivableInvoice.status_sat == "TIMBRADA",
                        )
                        .first()
                    )

                    uuid_relacionado = None
                    if cp_nominal and cp_nominal.uuid:
                        uuid_relacionado = cp_nominal.uuid
                        cp_nominal.status_sat = "PENDIENTE_CANCELAR_SAT"
                        cp_nominal.motivo_cancelacion = "01"
                        db.add(cp_nominal)

                    logger.info("🟢 [5.3] Insertando registro de CXC...")
                    nueva_cxc = models.ReceivableInvoice(
                        client_id=trip.client_id,
                        sub_client_id=trip.sub_client_id,
                        viaje_id=trip.id,
                        folio_interno=f"CXC-TRP-{trip.public_id or trip.id}",
                        concepto=f"Servicio de Flete: {trip.origin} a {trip.destination}",
                        subtotal=subtotal,
                        iva=iva,
                        retenciones=retencion,
                        monto_total=monto_total,
                        saldo_pendiente=monto_total,
                        fecha_emision=date.today(),
                        fecha_vencimiento=date.today() + timedelta(days=dias_credito),
                        estatus="pendiente",
                        metodo_pago="PPD",
                        tipo_comprobante="I",
                        is_nominal=False,
                        uuid_relacionado=uuid_relacionado,
                        status_sat="PROVISIONAL",
                    )
                    db.add(nueva_cxc)
                    db.flush()
                    cxc_creadas += 1
                else:
                    logger.info(
                        f"🟡 [5.1] La CXC ya existe (ID: {existing_cxc.id}). Saltando creación."
                    )

        logger.info("🟢 [6] Guardando todos los cambios en la BD...")
        db.commit()
        return {
            "message": "Liquidación completada y Recursos Liberados",
            "legs_procesados": len(legs),
            "cxc_generadas": cxc_creadas,
        }

    except Exception as e:
        db.rollback()
        logger.error("❌ ERROR CRÍTICO 500 EN LIQUIDACIÓN ❌")
        logger.error(f"Mensaje: {str(e)}")
        logger.error(traceback.format_exc())
        raise e


# =====================================================================
# RESTO DE TUS FUNCIONES (get_trip_settlement, close_trip_settlement, etc.)
# =====================================================================


def get_trip_settlement(db: Session, trip_leg_id: int):
    import uuid
    from sqlalchemy.orm import joinedload
    from app.models import models
    from app.models.models import RecordStatus
    from . import schemas

    # 1. Cargar el tramo con todas sus relaciones (Viaje, Cliente, Unidad, Operador)
    leg = (
        db.query(models.TripLeg)
        .options(
            joinedload(models.TripLeg.trip).joinedload(models.Trip.client),
            joinedload(models.TripLeg.unit),
            joinedload(models.TripLeg.operator),
        )
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

    # Manejo seguro de Enums
    is_ruta = getattr(leg, "leg_type", "") == getattr(
        models.TripLegType, "RUTA", "ruta_carretera"
    )
    is_full = (trip.dolly_id is not None) or (trip.remolque_2_id is not None)

    # =========================================================
    # CÁLCULO DE DISTANCIA
    # =========================================================
    if (
        leg.odometro_final
        and leg.odometro_inicial
        and leg.odometro_final > leg.odometro_inicial
    ):
        kms_recorridos = float(leg.odometro_final - leg.odometro_inicial)
    else:
        kms_recorridos = float(
            trip.tariff.distancia_km
            if getattr(trip, "tariff", None) and trip.tariff.distancia_km
            else 0
        )

    # =========================================================
    # AUDITORÍA DE DIÉSEL
    # =========================================================
    fuel_logs = (
        db.query(models.FuelLog)
        .filter(
            models.FuelLog.trip_leg_id == trip_leg_id,
            models.FuelLog.record_status == "A",
        )
        .all()
    )

    if is_ruta and not fuel_logs:
        raise ValueError("BLOCKED_NO_FUEL")

    consumo_real_litros = 0.0
    precio_promedio_litro = 24.50
    consumo_esperado = 0.0
    diferencia_litros = 0.0
    deduccion_combustible = 0.0
    conceptos = []

    # =========================================================
    # 🚀 TICKET 1: DATOS DE TRANSPARENCIA PARA EL OPERADOR
    # =========================================================
    cliente_nombre = (
        trip.client.razon_social if getattr(trip, "client", None) else "Cliente General"
    )
    contenedor_info = (
        trip.contenedor_1 if getattr(trip, "contenedor_1", None) else "Carga Suelta"
    )
    referencia_operativa = f"{cliente_nombre} | Cont: {contenedor_info}"

    # =========================================================
    # 1. PERCEPCIONES: SUELDO BASE (RUTAS FORÁNEAS)
    # =========================================================
    sueldo_fijo = 0.0
    if getattr(trip, "sueldo_operador", None) and float(trip.sueldo_operador) > 0:
        sueldo_fijo = float(trip.sueldo_operador)
    elif (
        getattr(trip, "tariff", None)
        and getattr(trip.tariff, "sueldo_operador", None)
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
                referencia=f"Ruta: {trip.origin} a {trip.destination}",  # 🚀 TICKET 1
                monto=sueldo_fijo,
                esAutomatico=True,
            )
        )

    # =========================================================
    # 2. EVALUACIÓN Y PENALIZACIÓN DE COMBUSTIBLE
    # =========================================================
    if is_ruta:
        vales_diesel = [
            f
            for f in fuel_logs
            if getattr(f, "tipo_combustible", "diesel").lower() == "diesel"
        ]
        consumo_real_litros = sum(getattr(f, "litros", 0) for f in vales_diesel)

        rendimiento_esperado = getattr(leg.unit, "rendimiento_ecm_esperado", 3.2) or 3.2
        consumo_esperado = (
            (kms_recorridos / rendimiento_esperado) if kms_recorridos > 0 else 0.0
        )

        if vales_diesel:
            precio_promedio_litro = sum(
                getattr(f, "precio_por_litro", 0) for f in vales_diesel
            ) / len(vales_diesel)

        diferencia_cruda = consumo_real_litros - consumo_esperado
        diferencia_litros = diferencia_cruda if diferencia_cruda > 0 else 0.0

        deduccion_combustible = float(getattr(leg, "monto_penalizaciones", 0.0) or 0.0)

        if deduccion_combustible > 0:
            conceptos.append(
                schemas.ConceptoPago(
                    id=str(uuid.uuid4())[:8],
                    tipo="deduccion",
                    categoria="combustible",
                    descripcion="Cargo Exceso Diésel (Auditoría)",
                    referencia=f"Excedente de {round(diferencia_litros, 1)} Lts",  # 🚀 TICKET 1
                    monto=deduccion_combustible,
                    esAutomatico=True,
                )
            )

    # =========================================================
    # 3. PERCEPCIONES: BONOS DE PATIO (LOCALES)
    # =========================================================
    else:
        if sueldo_fijo == 0:
            bono_movimiento = 300.0 if is_full else 200.0

            # Etiquetado inteligente del tipo de movimiento
            leg_type_str = getattr(leg, "leg_type", "")
            if leg_type_str == getattr(models.TripLegType, "CARGA", "carga"):
                tipo_mov_str = "Carga en Muelle"
            elif leg_type_str == getattr(models.TripLegType, "DESCARGA", "descarga"):
                tipo_mov_str = "Descarga en Muelle"
            elif leg_type_str == getattr(
                models.TripLegType, "RETORNO_VACIO", "retorno_vacio"
            ):
                tipo_mov_str = "Retorno de Vacío"
            else:
                tipo_mov_str = "Movimiento Local"

            config_str = "FULL" if is_full else "SENCILLO"

            conceptos.append(
                schemas.ConceptoPago(
                    id=str(uuid.uuid4())[:8],
                    tipo="ingreso",
                    categoria="bono",
                    descripcion=f"{tipo_mov_str} ({config_str})",
                    referencia=referencia_operativa,  # 🚀 TICKET 1: Aquí va el cliente y contenedor
                    monto=bono_movimiento,
                    esAutomatico=True,
                )
            )

    # =========================================================
    # 4. DEDUCCIONES: ANTICIPOS (VIÁTICOS Y EFECTIVO)
    # =========================================================
    if getattr(leg, "anticipo_viaticos", 0) > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Viáticos",
                referencia="Efectivo/Tarjeta",
                monto=leg.anticipo_viaticos,
                esAutomatico=True,
            )
        )
    if getattr(leg, "anticipo_combustible", 0) > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Anticipo Diésel",
                referencia="Carga en Ruta",
                monto=leg.anticipo_combustible,
                esAutomatico=True,
            )
        )
    if getattr(leg, "otros_anticipos", 0) > 0:
        conceptos.append(
            schemas.ConceptoPago(
                id=str(uuid.uuid4())[:8],
                tipo="deduccion",
                categoria="anticipo",
                descripcion="Otros Anticipos",
                referencia="Adelanto Operativo",
                monto=leg.otros_anticipos,
                esAutomatico=True,
            )
        )

    # =========================================================
    # 5. TOTALES FINALES
    # =========================================================
    total_ingresos = sum(c.monto for c in conceptos if c.tipo == "ingreso")
    total_deducciones = sum(c.monto for c in conceptos if c.tipo == "deduccion")
    neto_pagar = total_ingresos - total_deducciones

    # Armado final del Response respetando el Schema de Pydantic
    return schemas.TripSettlementResponse(
        viajeId=trip.public_id or f"VIAJE-{trip.id}",
        legId=leg.id,
        operadorNombre=leg.operator.name if getattr(leg, "operator", None) else "N/A",
        unidadNumero=leg.unit.numero_economico if getattr(leg, "unit", None) else "N/A",
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
    leg.actual_arrival = dt_utcnow.utcnow()

    if payload.odometro_final:
        leg.odometro_final = payload.odometro_final
        if leg.unit:
            leg.unit.odometro = payload.odometro_final

    event = models.TripTimelineEvent(
        trip_leg_id=leg.id,
        time=dt_utcnow.utcnow(),
        event=f"Tramo Liquidado y Cerrado. Saldo pagado: ${payload.neto_a_pagar:,.2f}",
        event_type="success",
    )
    db.add(event)

    if leg.trip:
        leg.trip.status = models.TripStatus.CERRADO
        leg.trip.closed_at = dt_utcnow.utcnow()
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
            last_leg.actual_arrival = dt_utcnow.utcnow()
            last_leg.last_update = dt_utcnow.utcnow()

            db_event = models.TripTimelineEvent(
                trip_leg_id=last_leg.id,
                time=dt_utcnow.utcnow(),
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
        start_date=dt_utcnow.utcnow(),
    )
    db.add(new_leg)
    db.flush()

    trip.status = models.TripStatus.EN_TRANSITO
    trip.last_update = dt_utcnow.utcnow()
    db.add(trip)

    db.commit()
    db.refresh(trip)
    return trip


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
        is_ruta = "ruta" in str(leg.leg_type).lower()

        if (
            leg.odometro_final
            and leg.odometro_inicial
            and leg.odometro_final >= leg.odometro_inicial
        ):
            distancia = float(leg.odometro_final - leg.odometro_inicial)
        else:
            dist_tarifa = (
                leg.trip.tariff.distancia_km if leg.trip and leg.trip.tariff else 0.0
            )
            distancia = float(dist_tarifa or 0.0)
            if is_ruta:
                alertas.append(
                    f"Tramo #{leg.id}: Usando distancia teórica (Faltan odómetros en auditoría)."
                )

        if is_ruta:
            total_kms_reales += distancia
            rend_ecm = getattr(leg.unit, "rendimiento_ecm_esperado", 3.2)
            rendimiento = float(rend_ecm or 3.2)
            total_consumo_esperado += (
                (distancia / rendimiento) if distancia > 0 else 0.0
            )

            fuel_logs_activos = [
                f
                for f in leg.fuel_logs
                if f.record_status == "A"
                and str(f.tipo_combustible).lower() == "diesel"
            ]

            if not fuel_logs_activos:
                legs_sin_ticket.append(leg.id)

            for f in fuel_logs_activos:
                lts = float(f.litros or 0.0)
                precio = float(f.precio_por_litro or 24.50)
                total_real_liters += lts
                total_fuel_cost += lts * precio

    precio_promedio = (
        (total_fuel_cost / total_real_liters) if total_real_liters > 0 else 24.50
    )

    diferencia_litros_total = 0.0
    deduccion_combustible = 0.0

    for leg in legs:
        penalizacion = getattr(leg, "monto_penalizaciones", 0.0)
        if penalizacion and float(penalizacion) > 0:
            deduccion_combustible += float(penalizacion)

        vales = [
            f
            for f in leg.fuel_logs
            if f.record_status == "A" and str(f.tipo_combustible).lower() == "diesel"
        ]
        for vale in vales:
            is_conciliated = getattr(vale, "is_conciliated", False)
            diferencia = getattr(vale, "diferencia_litros", 0.0)

            if is_conciliated and diferencia and float(diferencia) > 0:
                diferencia_litros_total += float(diferencia)

    sueldo_operador_pactado = 0.0
    if legs and legs[0].trip:
        trip_padre = legs[0].trip
        sueldo_viaje = trip_padre.sueldo_operador
        sueldo_tarifa = trip_padre.tariff.sueldo_operador if trip_padre.tariff else 0.0
        sueldo_operador_pactado = float(sueldo_viaje or sueldo_tarifa or 0.0)

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

    current_leg.record_status = RecordStatus.ELIMINADO
    db.add(current_leg)

    if len(trip.legs) > 1:
        previous_leg = trip.legs[-2]
        previous_leg.status = models.TripStatus.EN_TRANSITO
        previous_leg.actual_arrival = None
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

    leg.odometro_final = None
    leg.monto_penalizaciones = 0.0

    db.query(models.FuelLog).filter(models.FuelLog.trip_leg_id == leg.id).update(
        {"is_conciliated": False}, synchronize_session=False
    )

    event = models.TripTimelineEvent(
        trip_leg_id=leg.id,
        time=dt_utcnow.utcnow(),
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

    active_leg = trip.legs[-1]

    if active_leg.status in ["entregado", "cerrado", "liquidado"]:
        raise ValueError("Este tramo ya está cerrado o entregado.")

    if active_leg.leg_type != "carga_muelle":
        raise ValueError(
            "Solo se permite desenganchar viajes que están en fase de Carga en Patio/Muelle."
        )

    active_leg.status = models.TripStatus.ENTREGADO
    active_leg.actual_arrival = dt_utcnow.utcnow()
    active_leg.last_update = dt_utcnow.utcnow()

    trip.status = models.TripStatus.DETENIDO
    trip.last_update = dt_utcnow.utcnow()

    db_event = models.TripTimelineEvent(
        trip_leg_id=active_leg.id,
        time=dt_utcnow.utcnow(),
        event="Desenganche en patio. Carga en espera de asignación de carretera.",
        event_type="info",
        location="Patio de Operaciones",
    )
    db.add(db_event)

    db.commit()
    db.refresh(trip)
    return trip
