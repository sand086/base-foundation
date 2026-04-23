import os
import time  # <-- NUEVO: Para el sleep de la sincronización masiva
import datetime
from datetime import date, timedelta
from pathlib import Path
from typing import List, Optional
import requests  # <-- NUEVO: Para la API de mapas OSRM

from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from fastapi.responses import Response
from sqlalchemy.orm import Session, contains_eager, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, or_  # <-- NUEVO: Agregado or_ para la consulta masiva
from jinja2 import Environment, FileSystemLoader

from app.db.database import get_db
from app.models import models
from app.models.models import SystemConfig

# importacion LOCAL (FSD): Solo busca en la misma carpeta "logistics"
from . import schemas, crud

# Autenticación
from app.modules.auth.router import get_current_user

try:
    from weasyprint import HTML
except Exception as e:
    print(f" Advertencia: WeasyPrint no se cargó correctamente ({e})")
    HTML = None

# ÚNICA INSTANCIA DEL ROUTER
router = APIRouter(tags=["Logistics"])

# Configuración de Plantillas para PDFs
TEMPLATE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "../../templates"
)
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


# =====================================================================
# FUNCIONES HELPER (NUEVO)
# =====================================================================


def get_osrm_distance(origen: str, destino: str) -> float:
    """
    Calcula la distancia real en carretera usando la API gratuita de OpenStreetMap / OSRM.
    """
    try:
        # Se agrega un correo ficticio al User-Agent para cumplir las políticas de Nominatim y evitar bloqueos
        headers = {"User-Agent": "TMS-Rapidos3T/1.0 (contacto@tuempresa.com)"}

        # 1. Convertimos Origen a Coordenadas
        res_orig = requests.get(
            f"https://nominatim.openstreetmap.org/search?q={origen}, Mexico&format=json&limit=1",
            headers=headers,
            timeout=5,
        ).json()
        # 2. Convertimos Destino a Coordenadas
        res_dest = requests.get(
            f"https://nominatim.openstreetmap.org/search?q={destino}, Mexico&format=json&limit=1",
            headers=headers,
            timeout=5,
        ).json()

        if res_orig and res_dest:
            lon1, lat1 = res_orig[0]["lon"], res_orig[0]["lat"]
            lon2, lat2 = res_dest[0]["lon"], res_dest[0]["lat"]

            # 3. Pedimos la ruta en carretera a OSRM
            osrm_url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
            route_res = requests.get(osrm_url, timeout=5).json()

            if route_res.get("code") == "Ok":
                distancia_metros = route_res["routes"][0]["distance"]
                return round(distancia_metros / 1000.0, 2)
    except Exception as e:
        print(f"⚠️ Advertencia silenciosa calculando distancia OSRM: {e}")
    return 0.0


# =====================================================================
# CASETAS (TOLL BOOTHS)
# =====================================================================


@router.get("/tolls", response_model=List[schemas.TollBoothResponse])
def list_tolls(search: str = "", db: Session = Depends(get_db)):
    query = db.query(models.TollBooth).filter(models.TollBooth.record_status == "A")
    if search:
        query = query.filter(
            models.TollBooth.nombre.ilike(f"%{search}%")
            | models.TollBooth.tramo.ilike(f"%{search}%")
        )
    return query.all()


@router.post("/tolls", response_model=schemas.TollBoothResponse)
def create_toll(
    toll: schemas.TollBoothCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_toll = models.TollBooth(**toll.model_dump(), created_by_id=user.id)
    db.add(db_toll)

    try:
        db.commit()
        db.refresh(db_toll)
        return db_toll
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una caseta registrada con ese mismo Nombre y Tramo.",
        )


@router.put("/tolls/{toll_id}", response_model=schemas.TollBoothResponse)
def update_toll(
    toll_id: int,
    toll: schemas.TollBoothUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_toll = db.query(models.TollBooth).get(toll_id)
    if not db_toll:
        raise HTTPException(status_code=404, detail="Caseta no encontrada")

    for k, v in toll.model_dump(exclude_unset=True).items():
        setattr(db_toll, k, v)
    db_toll.updated_by_id = user.id
    db.flush()

    segments = (
        db.query(models.RateSegment)
        .filter(
            models.RateSegment.toll_booth_id == toll_id,
            models.RateSegment.record_status == "A",
        )
        .all()
    )

    templates_to_update = set()
    for seg in segments:
        seg.costo_momento_sencillo = db_toll.costo_5_ejes_sencillo
        seg.costo_momento_full = db_toll.costo_9_ejes_full
        if seg.template:
            templates_to_update.add(seg.template)

    db.flush()

    for template in templates_to_update:
        active_segments = (
            db.query(models.RateSegment)
            .filter(
                models.RateSegment.rate_template_id == template.id,
                models.RateSegment.record_status == "A",
            )
            .all()
        )

        template.costo_total_sencillo = sum(
            (s.costo_momento_sencillo or 0.0) for s in active_segments
        )
        template.costo_total_full = sum(
            (s.costo_momento_full or 0.0) for s in active_segments
        )

        client_tariffs = (
            db.query(models.Tariff)
            .filter(
                models.Tariff.rate_template_id == template.id,
                models.Tariff.record_status == "A",
            )
            .all()
        )

        for ct in client_tariffs:
            es_full = (
                "full" in (ct.tipo_unidad or "").lower()
                or "9" in (ct.tipo_unidad or "").lower()
            )
            ct.costo_casetas = (
                template.costo_total_full if es_full else template.costo_total_sencillo
            )

    try:
        db.commit()
        db.refresh(db_toll)
        return db_toll
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe otra caseta registrada con ese mismo Nombre y Tramo.",
        )


@router.get("/tolls/{toll_id}/dependencies")
def check_toll_dependencies(toll_id: int, db: Session = Depends(get_db)):
    rutas_count = (
        db.query(models.RateSegment)
        .filter(
            models.RateSegment.toll_booth_id == toll_id,
            models.RateSegment.record_status == "A",
        )
        .count()
    )
    return {"in_use": rutas_count > 0, "rutas_count": rutas_count}


@router.delete("/tolls/{toll_id}")
def delete_toll(
    toll_id: int, remove_from_routes: bool = Query(False), db: Session = Depends(get_db)
):
    db_toll = db.query(models.TollBooth).get(toll_id)
    if not db_toll:
        raise HTTPException(status_code=404, detail="Caseta no encontrada")

    segments = (
        db.query(models.RateSegment)
        .filter(
            models.RateSegment.toll_booth_id == toll_id,
            models.RateSegment.record_status == "A",
        )
        .all()
    )

    if segments:
        if remove_from_routes:
            templates_to_update = set()

            for seg in segments:
                if seg.template:
                    templates_to_update.add(seg.template)
                seg.record_status = "E"
                db.add(seg)

            db.flush()

            for template in templates_to_update:
                active_segments = (
                    db.query(models.RateSegment)
                    .filter(
                        models.RateSegment.rate_template_id == template.id,
                        models.RateSegment.record_status == "A",
                    )
                    .all()
                )

                total_s = sum(
                    (s.costo_momento_sencillo or 0.0) for s in active_segments
                )
                total_f = sum((s.costo_momento_full or 0.0) for s in active_segments)
                total_km = sum((s.distancia_km or 0.0) for s in active_segments)
                total_min = sum((s.tiempo_minutos or 0) for s in active_segments)

                template.costo_total_sencillo = total_s
                template.costo_total_full = total_f
                template.distancia_total_km = total_km
                template.tiempo_total_minutos = total_min

        db_toll.record_status = "I"
        msg = "Caseta inactivada y sus tramos marcados como eliminados en las rutas (Borrado lógico)."
    else:
        db_toll.record_status = "E"
        msg = "Caseta eliminada permanentemente del sistema."

    db.commit()
    return {"status": "success", "message": msg}


# =====================================================================
# RUTAS ARMADAS (RATE TEMPLATES)
# =====================================================================


@router.get("/rate-templates", response_model=List[schemas.RateTemplateResponse])
def list_templates(
    search: str = "",
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.RateTemplate)
        .options(
            joinedload(models.RateTemplate.segments),
            joinedload(models.RateTemplate.client),
        )
        .filter(models.RateTemplate.record_status == "A")
    )

    if search:
        query = query.filter(
            models.RateTemplate.origen.ilike(f"%{search}%")
            | models.RateTemplate.destino.ilike(f"%{search}%")
        )

    if client_id:
        query = query.filter(models.RateTemplate.client_id == client_id)

    templates = query.order_by(models.RateTemplate.id.desc()).limit(50).all()

    for template in templates:
        template.segments = [
            seg
            for seg in template.segments
            if getattr(seg, "record_status", "A") == "A"
        ]

    return templates


@router.post("/rate-templates", response_model=schemas.RateTemplateResponse)
def create_template(
    data: schemas.RateTemplateCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    existing_route = (
        db.query(models.RateTemplate)
        .filter(
            models.RateTemplate.origen == data.origen,
            models.RateTemplate.destino == data.destino,
            models.RateTemplate.client_id == data.client_id,
            models.RateTemplate.tipo_unidad == data.tipo_unidad,
            models.RateTemplate.record_status == "A",
        )
        .first()
    )

    if existing_route:
        config_name = (
            "FULL (9 Ejes)" if data.tipo_unidad == "9ejes" else "SENCILLO (5 Ejes)"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una ruta ACTIVA con este mismo origen y destino para la configuración {config_name}.",
        )

    new_template = models.RateTemplate(
        client_id=data.client_id,
        origen=data.origen,
        destino=data.destino,
        tipo_unidad=data.tipo_unidad,
        created_by_id=user.id,
    )
    db.add(new_template)
    db.flush()

    total_s, total_f, total_km, total_min = 0.0, 0.0, 0.0, 0

    for seg_data in data.segments:
        cost_s, cost_f = 0.0, 0.0

        if seg_data.toll_booth_id:
            toll = db.query(models.TollBooth).get(seg_data.toll_booth_id)
            if toll:
                cost_s = toll.costo_5_ejes_sencillo
                cost_f = toll.costo_9_ejes_full

        segment = models.RateSegment(
            rate_template_id=new_template.id,
            **seg_data.model_dump(
                exclude={
                    "toll_booth_id",
                    "rate_template_id",
                    "costo_momento_sencillo",
                    "costo_momento_full",
                }
            ),
            toll_booth_id=seg_data.toll_booth_id,
            costo_momento_sencillo=cost_s,
            costo_momento_full=cost_f,
            record_status="A",
        )
        db.add(segment)

        total_s += cost_s
        total_f += cost_f
        total_km += seg_data.distancia_km
        total_min += seg_data.tiempo_minutos

    new_template.costo_total_sencillo = total_s
    new_template.costo_total_full = total_f
    new_template.distancia_total_km = total_km
    new_template.tiempo_total_minutos = total_min

    db.commit()
    db.refresh(new_template)
    return new_template


@router.put(
    "/rate-templates/{template_id}", response_model=schemas.RateTemplateResponse
)
def update_template(
    template_id: int,
    data: schemas.RateTemplateUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_template = (
        db.query(models.RateTemplate)
        .filter(models.RateTemplate.id == template_id)
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    update_data = data.model_dump(exclude={"segments"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    db_template.updated_by_id = user.id

    if data.segments is not None:
        db_template.segments = []
        db.query(models.RateSegment).filter(
            models.RateSegment.rate_template_id == template_id
        ).delete(synchronize_session="fetch")

        db.flush()

        total_s, total_f, total_km, total_min = 0.0, 0.0, 0.0, 0

        for seg_data in data.segments:
            cost_s, cost_f = 0.0, 0.0
            if seg_data.toll_booth_id:
                toll = db.query(models.TollBooth).get(seg_data.toll_booth_id)
                if toll:
                    cost_s = toll.costo_5_ejes_sencillo
                    cost_f = toll.costo_9_ejes_full

            new_seg = models.RateSegment(
                rate_template_id=template_id,
                **seg_data.model_dump(
                    exclude={
                        "rate_template_id",
                        "costo_momento_sencillo",
                        "costo_momento_full",
                        "id",
                    }
                ),
                costo_momento_sencillo=cost_s,
                costo_momento_full=cost_f,
                record_status="A",
            )
            db.add(new_seg)

            total_s += cost_s
            total_f += cost_f
            total_km += seg_data.distancia_km
            total_min += seg_data.tiempo_minutos

        db_template.costo_total_sencillo = total_s
        db_template.costo_total_full = total_f
        db_template.distancia_total_km = total_km
        db_template.tiempo_total_minutos = total_min

        db.flush()

        client_tariffs = (
            db.query(models.Tariff)
            .filter(
                models.Tariff.rate_template_id == template_id,
                models.Tariff.record_status == "A",
            )
            .all()
        )

        for ct in client_tariffs:
            es_full = (
                "full" in (ct.tipo_unidad or "").lower()
                or "9" in (ct.tipo_unidad or "").lower()
            )
            ct.costo_casetas = (
                db_template.costo_total_full
                if es_full
                else db_template.costo_total_sencillo
            )

    db.commit()
    db.expire_all()
    db.refresh(db_template)
    return db_template


@router.delete("/rate-templates/{template_id}")
def delete_template(
    template_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    db_template = (
        db.query(models.RateTemplate)
        .filter(models.RateTemplate.id == template_id)
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M")
    db_template.origen = f"{db_template.origen} [ELIMINADA-{timestamp}]"

    db_template.record_status = "E"
    db_template.updated_by_id = user.id
    db.commit()

    return {
        "status": "deleted",
        "message": "Ruta eliminada correctamente. El nombre ha sido liberado.",
    }


# =========================================================
# VIAJES (TRIPS) Y BITÁCORA
# =========================================================


@router.get("/trips", response_model=List[schemas.TripResponse])
def read_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_trips(db, skip, limit)


@router.get("/trips/{trip_id}", response_model=schemas.TripResponse)
def read_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = crud.get_trip(db, str(trip_id))
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.post("/trips", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    if trip.initial_leg and trip.initial_leg.unit_id:
        unit = (
            db.query(models.Unit)
            .filter(models.Unit.id == trip.initial_leg.unit_id)
            .first()
        )
        if not unit:
            raise HTTPException(status_code=404, detail="La unidad principal no existe")

        estatus_permitidos = ["disponible", "bloqueado", "en_ruta"]

        if unit.status.lower() not in estatus_permitidos:
            raise HTTPException(
                status_code=400,
                detail=f"La unidad {unit.numero_economico} no puede ser despachada. Estatus actual: {unit.status}",
            )

    # Generamos el viaje de la forma tradicional (No alteramos el CRUD base)
    db_trip = crud.create_trip(db, trip)

    # 🚀 IDEA 4: CALCULAMOS LA DISTANCIA AUTOMÁTICA EN SEGUNDO PLANO Y SILENCIOSAMENTE
    if db_trip.origin and db_trip.destination:
        distancia_calculada = get_osrm_distance(db_trip.origin, db_trip.destination)
        if distancia_calculada > 0:
            # Asignamos la distancia al campo si existe en tu modelo Trip
            try:
                if hasattr(db_trip, "distancia_km"):
                    db_trip.distancia_km = distancia_calculada
                elif hasattr(db_trip, "distancia_total"):
                    db_trip.distancia_total = distancia_calculada
                elif hasattr(db_trip, "distancia"):
                    db_trip.distancia = distancia_calculada

                db.commit()
                db.refresh(db_trip)
            except Exception as e:
                db.rollback()
                print(f"⚠️ Error inofensivo actualizando la distancia en BD: {e}")

    return db_trip


@router.patch("/trips/{trip_id}/status", response_model=schemas.TripResponse)
def update_status(
    trip_id: int, status: str, location: str = None, db: Session = Depends(get_db)
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
def update_trip_endpoint(
    trip_id: int, payload: schemas.TripUpdate, db: Session = Depends(get_db)
):
    update_data = payload.dict(exclude_unset=True)
    updated_trip = crud.update_trip(
        db=db, trip_id=trip_id, trip_update_data=update_data
    )
    if not updated_trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return updated_trip


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
# LIQUIDACIÓN DE TRAMOS
# =========================================================


@router.get(
    "/trips/leg/{trip_leg_id}/settlement", response_model=schemas.TripSettlementResponse
)
def get_trip_settlement(trip_leg_id: int, db: Session = Depends(get_db)):
    try:
        settlement = crud.get_trip_settlement(db, trip_leg_id)
        if not settlement:
            raise HTTPException(
                status_code=404, detail="Tramo no encontrado para liquidar"
            )
        return settlement
    except ValueError as e:
        if str(e) == "BLOCKED_NO_FUEL":
            raise HTTPException(
                status_code=400,
                detail="No se puede liquidar: El operador no ha comprobado el combustible (Diésel) de este tramo.",
            )
        raise e


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
    trip_id: int, payload: schemas.TripLegCreate, db: Session = Depends(get_db)
):
    trip = crud.create_next_leg(db, str(trip_id), payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.post("/trips/legs/{leg_id}/settle")
def settle_trip_leg(leg_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    leg = db.query(models.TripLeg).filter(models.TripLeg.id == leg_id).first()
    if not leg:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")

    # 1. ACTUALIZAMOS EL TRAMO ACTUAL
    leg.status = "cerrado"
    leg.saldo_operador = data.get("neto_a_pagar", 0.0)
    db.commit()
    db.refresh(leg)

    trip = db.query(models.Trip).filter(models.Trip.id == leg.trip_id).first()

    # 2. EVALUACIÓN DE CIERRE DEL VIAJE
    all_completed = all(
        l.status in ["entregado", "cerrado", "liquidado"] for l in trip.legs
    )
    cxc_creada = False

    if all_completed and trip.status != "cerrado":
        trip.status = "cerrado"
        trip.closed_at = func.now()

    # 3. EVALUACIÓN DE TESORERÍA: ¿Se liquidó la fase de carretera?
    # 🔧 AQUÍ ESTÁ EL FIX APLICADO: Validamos el Enum de SQLAlchemy y el Estatus.
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
        existing_cxc = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.viaje_id == trip.id)
            .first()
        )

        # Si ya liquidamos la carretera y NO hay CxC, la generamos
        if not existing_cxc:
            base = trip.tarifa_base or 0.0
            subtotal = base
            iva = subtotal * 0.16
            retencion = subtotal * 0.04
            monto_total = subtotal + iva - retencion

            dias_credito = 15
            if trip.client and trip.client.dias_credito:
                dias_credito = trip.client.dias_credito

            fecha_vencimiento = date.today() + timedelta(days=dias_credito)

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
                fecha_vencimiento=fecha_vencimiento,
                estatus=models.InvoiceStatus.PENDIENTE,
            )
            db.add(nueva_cxc)
            cxc_creada = True

    # 4. GUARDAMOS TODOS LOS CAMBIOS DE GOLPE
    db.commit()

    return {
        "message": "Liquidación guardada correctamente",
        "neto_pagado": leg.saldo_operador,
        "viaje_cerrado_globalmente": all_completed,
        "cxc_generada_automaticamente": cxc_creada,
    }


@router.post("/trips/legs/{leg_id}/reopen")
def reopen_trip_leg(leg_id: int, db: Session = Depends(get_db)):
    leg = db.query(models.TripLeg).filter(models.TripLeg.id == leg_id).first()
    if not leg:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")

    leg.status = "en_transito"
    leg.saldo_operador = 0.0
    trip = leg.trip

    if trip.status == "cerrado":
        trip.status = "en_transito"
        trip.closed_at = None

        cxc = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.viaje_id == trip.id)
            .first()
        )
        if cxc:
            if cxc.saldo_pendiente < cxc.monto_total:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede reabrir la fase. Tesorería ya registró cobros.",
                )
            db.delete(cxc)

    db.commit()
    return {"message": "Fase reabierta exitosamente. Facturas anuladas."}


# =========================================================
# IMPRESIÓN DE DOCUMENTOS
# =========================================================


@router.get("/trips/{trip_id}/carta-porte-ciega")
def generate_carta_porte(trip_id: int, db: Session = Depends(get_db)):
    if HTML is None:
        raise HTTPException(status_code=500, detail="WeasyPrint no está instalado.")

    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    active_leg = None
    if trip.legs:
        active_leg = next(
            (
                leg
                for leg in trip.legs
                if leg.status
                not in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]
            ),
            trip.legs[-1],
        )

    unidad = active_leg.unit if active_leg else None
    operador = active_leg.operator if active_leg else None
    cliente = trip.client

    context = {
        "rfc_emisor": "EN TRÁNSITO",
        "nombre_emisor": "DOCUMENTO OPERATIVO (CIEGA)",
        "cp_emisor": "N/A",
        "regimen_emisor": "N/A",
        "uuid": "NO APLICA - DOCUMENTO DE TRASLADO INTERNO",
        "folio_interno": f"CIEGA-{trip.public_id or trip.id}",
        "fecha_emision": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "logo_src": "",
        "qr_src": "",
        "nombre_cliente": getattr(cliente, "razon_social", "N/A") if cliente else "N/A",
        "rfc_cliente": getattr(cliente, "rfc", "N/A") if cliente else "N/A",
        "cp_cliente": (
            getattr(cliente, "codigo_postal_fiscal", "N/A") if cliente else "N/A"
        ),
        "regimen_cliente": (
            getattr(cliente, "regimen_fiscal", "N/A") if cliente else "N/A"
        ),
        "direccion_cliente": (
            getattr(cliente, "direccion_fiscal", "N/A") if cliente else "N/A"
        ),
        "uso_cfdi": "S01",
        "metodo_pago": "N/A",
        "tipo_comprobante": "T (Traslado)",
        "moneda": "XXX",
        "tc": "1",
        "forma_pago": "N/A",
        "condiciones_pago": "N/A",
        "cert_sat": "N/A",
        "cert_emisor": "N/A",
        "sello_sat": "DOCUMENTO SIN VALIDEZ FISCAL",
        "sello_emisor": "DOCUMENTO SIN VALIDEZ FISCAL",
        "cadena_original": "DOCUMENTO SIN VALIDEZ FISCAL",
        "importe_letra": "(*** DOCUMENTO SIN VALOR COMERCIAL ***)",
        "subtotal": "0.00",
        "iva": "0.00",
        "retenciones": "0.00",
        "total": "0.00",
        "conceptos": [
            {
                "clave": "01010101",
                "cantidad": "1.00",
                "unidad": "E48 - SRV",
                "descripcion": trip.descripcion_mercancia or "FLETE",
                "detalles_extra": "Carta Porte Operativa Ciega",
                "precio": "0.00",
                "importe": "0.00",
            }
        ],
        "id_ccp": "PENDIENTE TIMBRADO",
        "distancia_total": "0",
        "remitente_nombre": "OPERADOR LOGÍSTICO",
        "remitente_rfc": "N/A",
        "fecha_salida": (
            trip.start_date.strftime("%Y-%m-%dT%H:%M:%S") if trip.start_date else ""
        ),
        "domicilio_origen": trip.origin or "N/A",
        "destinatario_nombre": (
            getattr(cliente, "razon_social", "N/A") if cliente else "N/A"
        ),
        "destinatario_rfc": getattr(cliente, "rfc", "N/A") if cliente else "N/A",
        "fecha_llegada": "PENDIENTE",
        "domicilio_destino": trip.destination or "N/A",
        "permiso_sct": (
            getattr(unidad, "permiso_sct_tipo", "TPAF01") if unidad else "N/A"
        ),
        "num_permiso_sct": (
            getattr(unidad, "permiso_sct_folio", "N/A") if unidad else "N/A"
        ),
        "config_vehicular": (
            getattr(unidad, "config_vehicular_sat", "T3S2") if unidad else "N/A"
        ),
        "placas": getattr(unidad, "placas", "S/P") if unidad else "N/A",
        "anio_modelo": str(getattr(unidad, "year", "N/A")) if unidad else "N/A",
        "aseguradora": (
            getattr(unidad, "aseguradora_resp_civil", "N/A") if unidad else "N/A"
        ),
        "poliza": getattr(unidad, "poliza_resp_civil", "N/A") if unidad else "N/A",
        "peso_bruto": str(float(trip.peso_toneladas or 0) * 1000),
        "bienes_transp": getattr(trip, "sat_clave_producto", "01010101"),
        "descripcion_mercancia": trip.descripcion_mercancia or "N/A",
        "subtipo_remolque": "N/A",
        "placa_remolque": "N/A",
        "operador_rfc": getattr(operador, "rfc", "N/A") if operador else "N/A",
        "operador_nombre": getattr(operador, "name", "N/A") if operador else "N/A",
        "operador_licencia": (
            getattr(operador, "license_number", "N/A") if operador else "N/A"
        ),
        "leyenda_legal": "DOCUMENTO DE CARÁCTER INFORMATIVO Y OPERATIVO (CARTA PORTE CIEGA).",
    }

    try:
        template = jinja_env.get_template("carta_porte.html")
        html_content = template.render(**context)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en el template HTML: {str(e)}"
        )

    try:
        pdf_file = HTML(string=html_content, base_url=str(TEMPLATE_DIR)).write_pdf()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al generar el PDF: {str(e)}"
        )

    return Response(
        content=pdf_file,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Ciega_Folio_{trip.public_id or trip.id}.pdf"
        },
    )


@router.get("/trips/{trip_id}/nom-087")
def generate_nom_087(trip_id: int, db: Session = Depends(get_db)):
    if HTML is None:
        raise HTTPException(status_code=500, detail="WeasyPrint no está instalado.")

    trip = crud.get_trip(db, str(trip_id))
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    active_leg = trip.legs[0] if trip.legs else None
    operador = active_leg.operator if active_leg else None
    unidad = active_leg.unit if active_leg else None

    logo_path = (
        Path(__file__).resolve().parents[2] / "templates" / "assets" / "logo-black.png"
    )
    logo_src = ""
    if logo_path.exists():
        import base64

        with open(logo_path, "rb") as img_f:
            logo_src = f"data:image/png;base64,{base64.b64encode(img_f.read()).decode('utf-8')}"

    nombre_conf = db.query(SystemConfig).filter_by(key="empresa_nombre").first()
    rfc_conf = db.query(SystemConfig).filter_by(key="empresa_rfc").first()

    context = {
        "logo_src": logo_src,
        "emisor_nombre": nombre_conf.value if nombre_conf else "OPERADOR LOGÍSTICO",
        "emisor_rfc": rfc_conf.value if rfc_conf else "RFC NO CONFIGURADO",
        "operador_nombre": getattr(operador, "name", "") if operador else "",
        "operador_licencia": (
            getattr(operador, "license_number", "") if operador else ""
        ),
        "placas": getattr(unidad, "placas", "") if unidad else "",
        "placas_remolque": trip.remolque_1.placas if trip.remolque_1 else "",
        "origen": trip.origin or "",
        "destino": trip.destination or "",
    }

    try:
        template = jinja_env.get_template("nom_087.html")
        html_content = template.render(**context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error template HTML: {str(e)}")

    pdf_file = HTML(string=html_content, base_url=str(TEMPLATE_DIR)).write_pdf()

    return Response(
        content=pdf_file,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=NOM087_Folio_{trip.public_id or trip.id}.pdf"
        },
    )


# =========================================================
# LOTE (BATCH) Y TIMELINE (EVENTOS)
# =========================================================


@router.post("/trips/legs/settle-batch")
def settle_trip_legs_batch(
    payload: schemas.BatchSettlementPayload, db: Session = Depends(get_db)
):
    result = crud.settle_trip_legs_batch(db, payload)
    if not result:
        raise HTTPException(status_code=404, detail="No se encontraron los tramos")
    return result


@router.post(
    "/trips/legs/settlement-preview",
    response_model=schemas.BatchSettlementPreviewResponse,
)
def preview_batch_settlement_endpoint(
    payload: schemas.BatchSettlementPreviewRequest, db: Session = Depends(get_db)
):
    result = crud.preview_batch_settlement(db, payload.leg_ids)
    if result is None:
        raise HTTPException(status_code=404, detail="Error al generar pre-liquidación")
    return result


@router.post("/trips/{trip_id}/undo-leg", response_model=schemas.TripResponse)
def undo_trip_leg_endpoint(trip_id: int, db: Session = Depends(get_db)):
    trip = crud.undo_last_leg(db, str(trip_id))
    if not trip:
        raise HTTPException(
            status_code=400, detail="No se puede deshacer la fase inicial."
        )
    return trip


@router.delete("/trips/timeline/{event_id}")
def delete_timeline_event(event_id: int, db: Session = Depends(get_db)):
    event = (
        db.query(models.TripTimelineEvent)
        .filter(models.TripTimelineEvent.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    db.delete(event)
    db.commit()
    return {"message": "Evento eliminado correctamente"}


@router.put("/trips/timeline/{event_id}")
def update_timeline_event(
    event_id: int, payload: dict = Body(...), db: Session = Depends(get_db)
):
    event = (
        db.query(models.TripTimelineEvent)
        .filter(models.TripTimelineEvent.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    if "location" in payload:
        event.location = payload["location"]
    if "lat" in payload:
        event.lat = payload["lat"]
    if "lng" in payload:
        event.lng = payload["lng"]
    if "comments" in payload:
        event.comments = payload["comments"]
    if "status" in payload:
        event.event_type = payload["status"]

    status_label = payload.get("status", "Reporte").replace("_", " ").title()
    event.event = f"{status_label} en {payload.get('location')}"

    db.commit()
    return {"message": "Evento actualizado correctamente"}


# =========================================================
# Dispatch Y TIMBRADO
# =========================================================


@router.post("/trips/{trip_id}/stamp-real", response_model=schemas.TripResponse)
def stamp_real_trip(trip_id: int, db: Session = Depends(get_db)):
    # 1. IMPORTAMOS EL SERVICIO DE FINANZAS
    from app.integrations.sat.billing_service import BillingService
    from app.integrations.sat.payment_service import (
        PaymentComplementService,
    )  # <-- ¡ESTA ES LA NUEVA!

    # 2. USAMOS BILLING SERVICE
    billing = BillingService(db)
    invoice_data = schemas.ReceivableInvoiceCreate(viaje_id=trip_id, is_nominal=False)

    # 3. GENERAMOS LA FACTURA REAL
    factura = billing.generar_factura_final_relacionada(invoice_data)

    if not factura:
        raise HTTPException(
            status_code=500, detail="No se pudo procesar el timbrado real."
        )

    trip = crud.get_trip(db, str(trip_id))
    return trip


@router.put("/trips/{trip_id}/dispatch", response_model=schemas.TripResponse)
def dispatch_trip(
    trip_id: int, payload: schemas.TripCreate, db: Session = Depends(get_db)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    # 🚀 Ignoramos los campos lógicos del Pydantic para que SQLAlchemy no explote
    trip_data = payload.model_dump(
        exclude={
            "initial_leg",
            "final_leg",
            "conoce_ruta_completa",
            "ocultar_montos_pdf",
            "is_dummy_stamping",
        },
        exclude_unset=True,
    )
    for key, value in trip_data.items():
        setattr(trip, key, value)

    # 🚀 MOTOR DUAL: GUARDAR LAS PIERNAS DEL VIAJE
    if payload.initial_leg:
        leg_data = payload.initial_leg
        monto_pagar = (trip.tarifa_base or 0) - (
            (leg_data.anticipo_casetas or 0)
            + (leg_data.anticipo_viaticos or 0)
            + (leg_data.anticipo_combustible or 0)
        )

        existing_leg = trip.legs[0] if trip.legs else None
        if existing_leg:
            existing_leg.unit_id = leg_data.unit_id
            existing_leg.operator_id = leg_data.operator_id
            existing_leg.leg_type = leg_data.leg_type
            existing_leg.anticipo_casetas = leg_data.anticipo_casetas
            existing_leg.anticipo_viaticos = leg_data.anticipo_viaticos
            existing_leg.anticipo_combustible = leg_data.anticipo_combustible
            existing_leg.monto_neto_pagado = monto_pagar
            existing_leg.status = trip.status
        else:
            new_leg = models.TripLeg(
                trip_id=trip.id,
                leg_type=leg_data.leg_type,
                status=trip.status,
                unit_id=leg_data.unit_id,
                operator_id=leg_data.operator_id,
                anticipo_casetas=leg_data.anticipo_casetas,
                anticipo_viaticos=leg_data.anticipo_viaticos,
                anticipo_combustible=leg_data.anticipo_combustible,
                monto_neto_pagado=monto_pagar,
                odometro_inicial=leg_data.odometro_inicial,
                nivel_tanque_inicial=leg_data.nivel_tanque_inicial,
                start_date=trip.start_date,
            )
            db.add(new_leg)

        # Si eligió 1 TIMBRE (conoce_ruta_completa), creamos de una vez la pierna 2
        if payload.conoce_ruta_completa and payload.final_leg:
            leg_final = payload.final_leg
            if len(trip.legs) > 1:
                trip.legs[1].unit_id = leg_final.unit_id
                trip.legs[1].operator_id = leg_final.operator_id
            else:
                new_leg_2 = models.TripLeg(
                    trip_id=trip.id,
                    leg_type="ruta_carretera",
                    status="creado",  # Nace en espera en el patio
                    unit_id=leg_final.unit_id,
                    operator_id=leg_final.operator_id,
                    start_date=trip.start_date,
                )
                db.add(new_leg_2)

        db.flush()

        # Si el viaje ya salió (en_transito), bloqueamos recursos para que nadie más los use
        if trip.status == "en_transito":
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
                        models.Unit.record_status != models.RecordStatus.ELIMINADO,
                    )
                    .all()
                )
                for u in units:
                    u.status = models.UnitStatus.EN_RUTA
                    db.add(u)

            if leg_data.operator_id:
                operator = (
                    db.query(models.Operator)
                    .filter(models.Operator.id == leg_data.operator_id)
                    .first()
                )
                if operator:
                    operator.status = models.OperatorStatus.EN_RUTA
                    db.add(operator)

    db.commit()
    db.refresh(trip)
    return trip


@router.post("/trips/{trip_id}/unhook", response_model=schemas.TripResponse)
def unhook_trip_in_yard(trip_id: int, db: Session = Depends(get_db)):
    try:
        trip = crud.unhook_in_yard(db, str(trip_id))
        if not trip:
            raise HTTPException(status_code=404, detail="Viaje no encontrado.")
        return trip
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rate-templates/sync-distances")
def sync_distances(db: Session = Depends(get_db)):
    """
    Sincroniza masivamente las distancias en carretera de los RateTemplates
    utilizando la función helper existente (Nominatim + OSRM).
    """
    # 1. Filtrar registros: Estatus 'A' y distancia_total_km igual a 0 o NULL
    templates_to_sync = (
        db.query(models.RateTemplate)
        .filter(
            models.RateTemplate.record_status == "A",
            or_(
                models.RateTemplate.distancia_total_km == 0,
                models.RateTemplate.distancia_total_km.is_(None),
            ),
        )
        .all()
    )

    actualizados = 0
    errores = 0

    for template in templates_to_sync:
        try:
            # Pausa de 1 segundo requerida por las políticas de la API gratuita de Nominatim
            time.sleep(1)

            # Reutilizamos tu helper existente para obtener la distancia
            distancia_calculada = get_osrm_distance(template.origen, template.destino)

            if distancia_calculada > 0:
                template.distancia_total_km = distancia_calculada
                db.commit()
                actualizados += 1
            else:
                # Si el helper devolvió 0.0, asumimos que no se pudo geolocalizar/enrutar
                errores += 1

        except Exception as e:
            # Capturamos cualquier error de base de datos o ejecución inesperada
            print(
                f"Error sincronizando plantilla ID {getattr(template, 'id', 'Desconocido')}: {str(e)}"
            )
            errores += 1
            db.rollback()  # Limpiamos la transacción para no afectar el siguiente ciclo

    # 2. Retornar el resumen solicitado
    return {
        "actualizados": actualizados,
        "errores": errores,
        "mensaje": "Sincronización completada",
    }
