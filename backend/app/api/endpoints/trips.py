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

    #  2. ACTUALIZACIÓN AUTOMÁTICA DEL TRACTOCAMIÓN (UNIDAD)
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
    if HTML is None:
        raise HTTPException(
            status_code=500,
            detail="WeasyPrint no está instalado o faltan dependencias del sistema.",
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

    #  EXTRACCIÓN SEGURA PARA LA CARTA CIEGA
    unidad = active_leg.unit if active_leg else None
    operador = active_leg.operator if active_leg else None
    cliente = trip.client

    #  CONSTRUIMOS EL MISMO CONTEXTO PERO VERSIÓN "TRASLADO/CIEGA"
    context = {
        "rfc_emisor": "EN TRÁNSITO",
        "nombre_emisor": "DOCUMENTO OPERATIVO (CIEGA)",
        "cp_emisor": "N/A",
        "regimen_emisor": "N/A",
        "uuid": "NO APLICA - DOCUMENTO DE TRASLADO INTERNO",
        "folio_interno": f"CIEGA-{trip.public_id or trip.id}",
        "fecha_emision": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
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
        "tipo_comprobante": "T (Traslado)",  # Es una ciega
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
                "clave": "78101802",
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
        "bienes_transp": getattr(trip, "sat_clave_producto", "78101802"),
        "descripcion_mercancia": trip.descripcion_mercancia or "N/A",
        "subtipo_remolque": "N/A",
        "placa_remolque": "N/A",
        "operador_rfc": getattr(operador, "rfc", "N/A") if operador else "N/A",
        "operador_nombre": getattr(operador, "name", "N/A") if operador else "N/A",
        "operador_licencia": (
            getattr(operador, "license_number", "N/A") if operador else "N/A"
        ),
        "leyenda_legal": "DOCUMENTO DE CARÁCTER INFORMATIVO Y OPERATIVO (CARTA PORTE CIEGA). NO ES UN COMPROBANTE FISCAL.",
    }

    try:
        template = jinja_env.get_template("carta_porte.html")
        #  Le pasamos el CONTEXT extendido en lugar de solo trip y leg
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

    #  ACTUALIZACIÓN TOTAL DE COLUMNAS
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


@router.post("/{trip_id}/stamp-real", response_model=schemas.TripResponse)
def stamp_real_trip(trip_id: int, db: Session = Depends(get_db)):
    """
     FASE 2: Trigger manual o automático para generar la Carta Porte REAL
    cuando el viaje inicia su tramo de carretera.
    """
    from app.services.billing_service import BillingService

    billing = BillingService(db)
    # Creamos el objeto de solicitud para el service
    invoice_data = schemas.ReceivableInvoiceCreate(viaje_id=trip_id, is_nominal=False)

    # Genera el XML Real, Timbra ante el PAC y genera el PDF
    factura = billing.generar_factura_final_relacionada(invoice_data)

    if not factura:
        raise HTTPException(
            status_code=500, detail="No se pudo procesar el timbrado real."
        )

    trip = crud.get_trip(db, str(trip_id))
    return trip


@router.get("/{trip_id}/nom-087")
def generate_nom_087(trip_id: int, db: Session = Depends(get_db)):
    if HTML is None:
        raise HTTPException(
            status_code=500,
            detail="WeasyPrint no está instalado.",
        )

    trip = crud.get_trip(db, str(trip_id))
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    active_leg = trip.legs[0] if trip.legs else None
    operador = active_leg.operator if active_leg else None
    unidad = active_leg.unit if active_leg else None

    # Intentamos cargar el logo de la empresa
    logo_path = (
        Path(__file__).resolve().parents[2] / "templates" / "assets" / "logo-black.png"
    )
    logo_src = ""
    if logo_path.exists():
        import base64

        with open(logo_path, "rb") as img_f:
            logo_src = f"data:image/png;base64,{base64.b64encode(img_f.read()).decode('utf-8')}"

    # Recuperar configuración de la empresa
    from app.models.models import SystemConfig

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


@router.put("/{trip_id}/dispatch", response_model=schemas.TripResponse)
def dispatch_trip(
    trip_id: int, payload: schemas.TripCreate, db: Session = Depends(get_db)
):
    """
    Actualiza un viaje existente (ej. creado en el Planeador) y lo despacha.
    Actualiza los datos maestros, inyecta/actualiza su Tramo Inicial (Fase 1)
    y cambia el estatus de las unidades y operador a EN_RUTA si corresponde.
    """
    # 1. Buscar el viaje padre
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    # 2. Actualizar los datos generales del viaje (origen, destino, contenedores, etc.)
    # Excluimos initial_leg para que Pydantic no intente mapearlo directo al modelo Trip
    trip_data = payload.model_dump(exclude={"initial_leg"}, exclude_unset=True)
    for key, value in trip_data.items():
        setattr(trip, key, value)

    # 3. Procesar la inyección del Tramo Inicial (TripLeg)
    if payload.initial_leg:
        leg_data = payload.initial_leg

        # Cálculo interno del pago (Tarifa base - anticipos entregados)
        monto_pagar = (trip.tarifa_base or 0) - (
            (leg_data.anticipo_casetas or 0)
            + (leg_data.anticipo_viaticos or 0)
            + (leg_data.anticipo_combustible or 0)
        )

        # Revisamos si el viaje ya tenía un tramo creado
        existing_leg = trip.legs[0] if trip.legs else None

        if existing_leg:
            # Si ya existía, lo actualizamos
            existing_leg.unit_id = leg_data.unit_id
            existing_leg.operator_id = leg_data.operator_id
            existing_leg.leg_type = leg_data.leg_type
            existing_leg.anticipo_casetas = leg_data.anticipo_casetas
            existing_leg.anticipo_viaticos = leg_data.anticipo_viaticos
            existing_leg.anticipo_combustible = leg_data.anticipo_combustible
            existing_leg.monto_neto_pagado = monto_pagar
            existing_leg.status = trip.status
        else:
            # Si no existía (ej. viene 100% fresco del planeador), lo creamos
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
            db.flush()

        # 4. Bloquear y asignar recursos SOLO si el estado cambia a "en_transito"
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
