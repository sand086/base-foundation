# src/api/endpoints/trips.py
import os
from datetime import date, timedelta, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import trips as schemas
from app.crud import trips as crud
from app.api.endpoints.auth import (
    get_current_user,
)

from sqlalchemy import func
from pathlib import Path
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader

from pydantic import BaseModel

try:
    from weasyprint import HTML
except Exception as e:
    print(f"⚠️ Advertencia: WeasyPrint no se cargó correctamente ({e})")
    HTML = None

router = APIRouter()


@router.get("", response_model=List[schemas.TripResponse])
def read_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_trips(db, skip, limit)


@router.get("/{trip_id}", response_model=schemas.TripResponse)
def read_trip(trip_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle completo de un solo viaje"""
    # Usamos str(trip_id) porque tu función get_trip en el CRUD espera un string
    trip = crud.get_trip(db, str(trip_id))
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.post("", response_model=schemas.TripResponse)
def create_trip(
    trip: schemas.TripCreate,
    db: Session = Depends(get_db),
):
    # 1. Validar que la unidad del primer tramo exista (SOLO SI MANDAN TRAMO)
    if trip.initial_leg and trip.initial_leg.unit_id:
        unit = (
            db.query(models.Unit)
            .filter(models.Unit.id == trip.initial_leg.unit_id)
            .first()
        )
        if not unit:
            raise HTTPException(status_code=404, detail="La unidad principal no existe")

        # 2. Validar estatus
        estatus_permitidos = ["disponible", "bloqueado"]
        if unit.status.lower() not in estatus_permitidos:
            raise HTTPException(
                status_code=400,
                detail=f"La unidad {unit.numero_economico} no puede ser despachada. Estatus actual: {unit.status}",
            )

    # 3. Crear el objeto en BD
    db_trip = crud.create_trip(db, trip)
    return db_trip


@router.patch("/{trip_id}/status", response_model=schemas.TripResponse)
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


@router.delete("/{trip_id}", response_model=dict)
def delete_trip_endpoint(trip_id: str, db: Session = Depends(get_db)):
    success = crud.delete_trip(db, trip_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Viaje no encontrado o ya eliminado"
        )
    return {"message": "Viaje eliminado correctamente"}


@router.put("/{trip_id}", response_model=schemas.TripResponse)
def update_trip(
    trip_id: int, trip_in: schemas.TripUpdate, db: Session = Depends(get_db)
):
    # Ya puedes usar la función update_trip normal si la tienes en tu crud.
    trip = crud.update_trip(db, trip_id, trip_in)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip


@router.post("/{trip_id}/timeline", response_model=schemas.TripResponse)
def create_timeline_event(
    trip_id: int,
    payload: schemas.TripTimelineEventCreatePayload,
    db: Session = Depends(get_db),
):
    # 1. Guardamos el evento histórico normal
    trip = crud.add_timeline_event(db, trip_id, payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    # 🚀 2. ACTUALIZACIÓN AUTOMÁTICA DEL TRACTOCAMIÓN (UNIDAD)
    # Buscamos cuál es el tramo (leg) que está en tránsito actualmente
    active_leg = next(
        (
            leg
            for leg in trip.legs
            if leg.status not in ["entregado", "cerrado", "liquidado"]
        ),
        None,
    )

    if active_leg and active_leg.unit:
        unidad = active_leg.unit

        # Si el monitorista mandó el Odómetro, se lo actualizamos al camión
        if payload.odometro:
            # Lo guardamos en el tramo
            active_leg.odometro_final = payload.odometro

            # NOTA: Asegúrate de tener una columna "odometro" en tu tabla "units"
            if hasattr(unidad, "odometro"):
                unidad.odometro = payload.odometro

        # Si mandó combustible, lo guardamos en la unidad (si tienes esos campos)
        if payload.combustible_porcentaje:
            if hasattr(unidad, "nivel_combustible_porcentaje"):
                unidad.nivel_combustible_porcentaje = payload.combustible_porcentaje

        if payload.combustible_litros:
            if hasattr(unidad, "nivel_combustible_litros"):
                unidad.nivel_combustible_litros = payload.combustible_litros

    db.commit()
    db.refresh(trip)
    return trip


# =========================================================
# RUTAS DE LIQUIDACIÓN (Ahora apuntan al TRAMO / LEG)
# =========================================================


@router.get(
    "/leg/{trip_leg_id}/settlement", response_model=schemas.TripSettlementResponse
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


@router.post("/leg/{trip_leg_id}/close-settlement", response_model=schemas.TripResponse)
def close_trip_settlement(
    trip_leg_id: int,
    payload: schemas.CloseSettlementPayload,
    db: Session = Depends(get_db),
):
    trip = crud.close_trip_settlement(db, trip_leg_id, payload)
    if not trip:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")
    return trip


@router.post("/{trip_id}/next-leg", response_model=schemas.TripResponse)
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


@router.post("/legs/{leg_id}/settle")
def settle_trip_leg(leg_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    # 1. Buscar el tramo
    leg = db.query(models.TripLeg).filter(models.TripLeg.id == leg_id).first()
    if not leg:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")

    # 2. Guardar el saldo final a favor del operador y cerrar el tramo
    leg.status = "cerrado"
    leg.saldo_operador = data.get("neto_a_pagar", 0.0)
    db.commit()
    db.refresh(leg)

    # 3. LÓGICA GUSTAVO: Verificar si ya se acabaron todas las fases
    trip = db.query(models.Trip).filter(models.Trip.id == leg.trip_id).first()

    # Revisamos si TODOS los tramos están entregados, liquidados o cerrados
    all_completed = all(
        l.status in ["entregado", "cerrado", "liquidado"] for l in trip.legs
    )

    cxc_creada = False

    # 4. Si ya acabaron todos, cerramos el viaje y CREAMOS LA FACTURA (CxC)
    if all_completed and trip.status != "cerrado":
        trip.status = "cerrado"
        trip.closed_at = func.now()

        # Evitar duplicados: checar si ya existe una pre-factura para este viaje
        existing_cxc = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.viaje_id == trip.id)
            .first()
        )

        if not existing_cxc:
            # Cálculos Financieros Estándar de Autotransporte
            base = trip.tarifa_base or 0.0
            casetas = trip.costo_casetas or 0.0
            subtotal = base + casetas

            # IVA 16% y Retención 4%
            iva = subtotal * 0.16
            retencion = subtotal * 0.04
            monto_total = subtotal + iva - retencion

            # Días de crédito del cliente (por defecto 15 si no tiene asignados)
            dias_credito = 15
            if trip.client and trip.client.dias_credito:
                dias_credito = trip.client.dias_credito

            fecha_vencimiento = date.today() + timedelta(days=dias_credito)

            # Crear la Pre-Factura en Cuentas por Cobrar
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
                saldo_pendiente=monto_total,  # Inicia debiendo todo
                fecha_emision=date.today(),
                fecha_vencimiento=fecha_vencimiento,
                estatus=models.InvoiceStatus.PENDIENTE,
            )
            db.add(nueva_cxc)
            cxc_creada = True

        db.commit()

    return {
        "message": "Liquidación guardada correctamente",
        "neto_pagado": leg.saldo_operador,
        "viaje_cerrado_globalmente": all_completed,
        "cxc_generada_automaticamente": cxc_creada,
    }


@router.post("/legs/{leg_id}/reopen")
def reopen_trip_leg(leg_id: int, db: Session = Depends(get_db)):
    # 1. Buscar el tramo
    leg = db.query(models.TripLeg).filter(models.TripLeg.id == leg_id).first()
    if not leg:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")

    # 2. Resetear el tramo a "En Tránsito" y borrar el saldo guardado
    leg.status = "en_transito"
    leg.saldo_operador = 0.0

    trip = leg.trip

    # 3. Si el viaje padre se había cerrado por error, lo reabrimos
    if trip.status == "cerrado":
        trip.status = "en_transito"
        trip.closed_at = None

        # 4. Magia de Reversa: Buscar la factura generada y destruirla (si no la han cobrado)
        cxc = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.viaje_id == trip.id)
            .first()
        )
        if cxc:
            # Regla de negocio: Si Tesorería ya le registró un pago, prohibimos deshacer
            if cxc.saldo_pendiente < cxc.monto_total:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede reabrir la fase. Tesorería ya registró cobros para este viaje. Cancela los pagos primero.",
                )
            db.delete(cxc)

    db.commit()
    return {"message": "Fase reabierta exitosamente. Facturas anuladas."}


@router.get("/{trip_id}/carta-porte-ciega")
def generate_carta_porte(trip_id: int, db: Session = Depends(get_db)):
    # 1. Verificar si WeasyPrint cargó
    if HTML is None:
        raise HTTPException(
            status_code=500,
            detail="WeasyPrint no está instalado o faltan dependencias del sistema (pango, cairo).",
        )

    # 2. Buscar el viaje
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    # 3. Determinar el tramo activo
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

    # 4. Renderizar HTML con Jinja2
    try:
        template = jinja_env.get_template("carta_porte.html")
        html_content = template.render(
            trip=trip,
            leg=active_leg,
            fecha_impresion=datetime.now().strftime("%d/%m/%Y %H:%M"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en el template HTML: {str(e)}"
        )

    # 5. Generar PDF con manejo de errores específico 🚀
    try:
        # El base_url es clave para que encuentre imágenes y CSS
        pdf_file = HTML(string=html_content, base_url=TEMPLATE_DIR).write_pdf()
    except TypeError as e:
        # Este captura el error específico de pydyf que tienes actualmente
        raise HTTPException(
            status_code=500,
            detail=f"Error de compatibilidad en WeasyPrint (pydyf): {str(e)}. Intente actualizar las librerías en el servidor.",
        )
    except Exception as e:
        # Captura cualquier otro error (memoria, permisos, CSS corrupto)
        raise HTTPException(
            status_code=500, detail=f"Error al generar el PDF: {str(e)}"
        )

    # 6. Retornar respuesta exitosa
    return Response(
        content=pdf_file,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Carta_Porte_{trip.public_id or trip.id}.pdf"
        },
    )


# =========================================================
# LIQUIDACIÓN POR LOTE (MULTIPLE LEGS)
# =========================================================


class BatchSettlementPayload(BaseModel):
    leg_ids: List[int]
    neto_a_pagar: float


@router.post("/legs/settle-batch")
def settle_trip_legs_batch(
    payload: BatchSettlementPayload, db: Session = Depends(get_db)
):
    result = crud.settle_trip_legs_batch(db, payload.leg_ids, payload.neto_a_pagar)
    if not result:
        raise HTTPException(status_code=404, detail="No se encontraron los tramos")
    return result


@router.post(
    "/legs/settlement-preview",
    response_model=schemas.BatchSettlementPreviewResponse,
)
def preview_batch_settlement_endpoint(
    payload: schemas.BatchSettlementPreviewRequest, db: Session = Depends(get_db)
):
    result = crud.preview_batch_settlement(db, payload.leg_ids)
    if result is None:
        raise HTTPException(status_code=404, detail="Error al generar pre-liquidación")
    return result


@router.post("/{trip_id}/undo-leg", response_model=schemas.TripResponse)
def undo_trip_leg_endpoint(trip_id: int, db: Session = Depends(get_db)):
    """Deshace el último desenganche (Me equivoqué)"""
    trip = crud.undo_last_leg(db, str(trip_id))
    if not trip:
        raise HTTPException(
            status_code=400, detail="No se puede deshacer la fase inicial."
        )
    return trip


# =========================================================
# EDICIÓN Y BORRADO DE EVENTOS DEL TIMELINE
# =========================================================


@router.delete("/timeline/{event_id}")
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


@router.put("/timeline/{event_id}")
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

    # 🚀 ACTUALIZACIÓN TOTAL DE COLUMNAS
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

    # Re-generamos el texto de visualización
    status_label = payload.get("status", "Reporte").replace("_", " ").title()
    event.event = f"{status_label} en {payload.get('location')}"

    db.commit()
    return {"message": "Evento actualizado correctamente"}
