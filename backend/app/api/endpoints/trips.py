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


@router.post("/trips/legs/{leg_id}/settle")
def settle_trip_leg(leg_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    # 1. Buscar el tramo
    leg = db.query(models.TripLeg).filter(models.TripLeg.id == leg_id).first()
    if not leg:
        raise HTTPException(status_code=404, detail="Tramo no encontrado")

    # 2. Guardar el saldo final a favor del operador y cerrar el tramo
    leg.status = "cerrado"
    leg.saldo_operador = data.get("netoAPagar", 0.0)
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


@router.post("/trips/legs/{leg_id}/reopen")
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

    template = jinja_env.get_template("carta_porte_ciega.html")
    html_content = template.render(
        trip=trip,
        leg=active_leg,
        fecha_impresion=datetime.now().strftime("%d/%m/%Y %H:%M"),
    )

    pdf_file = HTML(string=html_content, base_url=TEMPLATE_DIR).write_pdf()

    return Response(
        content=pdf_file,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Carta_Porte_{trip.public_id or trip.id}.pdf"
        },
    )
