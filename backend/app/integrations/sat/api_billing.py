import os
import shutil
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, logger
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from cryptography import x509
from cryptography.hazmat.backends import default_backend

from app.db.database import get_db
from app.modules.logistics.schemas import ReceivableInvoiceCreate
from app.integrations.sat.payment_service import (
    PaymentComplementService,
)  # <-- ¡ESTA ES LA NUEVA!

# IMPORTAMOS AMBOS MOTORES
from app.integrations.sat.billing_service import BillingService
from app.integrations.sat.carta_porte_service import CartaPorteService
from app.models import models
from app.modules.auth.router import get_current_active_user
from app.core.security import verify_password
import base64
import traceback  # Importante para los errores
from app.modules.auth.router import RequirePermission

import time
import threading

# ==============================================================
# ESCUDO ANTI-DOBLE CLIC (RACE CONDITIONS)
# ==============================================================
_timbrados_lock = {}
_lock = threading.Lock()


def verificar_doble_clic(llave: str, tiempo_espera: int = 30):
    """
    Bloquea peticiones si intentan timbrar la misma operación
    antes de que pasen 'tiempo_espera' segundos (30 seg por defecto).
    """
    with _lock:
        ahora = time.time()

        # 1. Limpieza de llaves expiradas (Evita fugas de memoria)
        llaves_a_borrar = [
            k for k, v in _timbrados_lock.items() if (ahora - v) >= tiempo_espera
        ]
        for k in llaves_a_borrar:
            del _timbrados_lock[k]

        # 2. Verificación de doble clic
        if (
            llave in _timbrados_lock
            and (ahora - _timbrados_lock[llave]) < tiempo_espera
        ):
            raise HTTPException(
                status_code=429,
                detail="⏳ Timbrado en proceso. Por favor NO des doble clic y espera la respuesta del SAT.",
            )

        # 3. Registrar el nuevo intento
        _timbrados_lock[llave] = ahora


# ==============================================================

router = APIRouter()


class PagoDetalle(BaseModel):
    invoice_id: int
    monto_pagado: float


class RegistroPagoPayload(BaseModel):
    client_id: int
    pagos: List[PagoDetalle]
    forma_pago: str
    fecha_pago: str
    referencia: Optional[str] = ""
    cuenta_deposito: Optional[str] = ""


def parse_sat_error(e: Exception) -> str:
    import logging

    logger = logging.getLogger("billing.audit")
    logger.error(f"🚨 [CRÍTICO] ERROR REAL EN SELLOS SAT: {str(e)}")
    return f"Fallo técnico en sellos SAT: {str(e)}"


@router.post("/stamp/free-invoice", response_model=dict)
def generar_factura_libre(invoice_data: dict, db: Session = Depends(get_db)):
    """
    Endpoint Exclusivo para Facturas Libres (SIN CARTA PORTE) generadas desde cero.
    Crea un CFDI 4.0 de Ingreso puro usando solo los datos del frontend.
    """
    service = BillingService(db)
    try:
        # 1. Timbrar la NUEVA factura con el monto corregido
        factura = service.generar_factura_libre(invoice_data)

        # --- INICIO DE NUEVA LÓGICA: CANCELACIÓN AUTOMÁTICA ---
        uuid_relacionado = invoice_data.get("uuid_relacionado")
        tipo_relacion = invoice_data.get("tipo_relacion")

        # Si la pantalla indica que es una sustitución 04
        if uuid_relacionado and tipo_relacion == "04":
            from app.models import models

            # Buscar la factura "Mala" en la base de datos usando el UUID que mandó la pantalla
            factura_vieja = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.uuid == uuid_relacionado)
                .first()
            )

            # Si la encuentra, mandar la orden al SAT de cancelarla con motivo 01
            if factura_vieja:
                service.cancelar_factura_sat(
                    invoice_id=factura_vieja.id,
                    motivo="01",
                    uuid_sustituto=factura.uuid,
                )
        # --- FIN DE NUEVA LÓGICA ---

        return {
            "status": "success",
            "message": "Factura Libre generada exitosamente",
            "data": {
                "factura_id": factura.id,
                "uuid": factura.uuid,
                "xml_url": getattr(factura, "xml_url", None),
            },
        }
    except Exception as e:
        custom_error = parse_sat_error(e)
        raise HTTPException(status_code=400, detail=custom_error)


# ==============================================================
# NUEVO: ENDPOINT EXCLUSIVO PARA FACTURAS CXC PROVISIONALES
# ==============================================================
@router.post("/stamp/invoice/{invoice_id}", response_model=dict)
def stamp_existing_free_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """
    Endpoint Exclusivo para timbrar Facturas Libres (CxC) que ya existen en la BD como provisionales.
    No requiere datos del frontend, los lee de la base de datos.
    """
    service = BillingService(db)
    try:
        factura = service.timbrar_factura_existente(invoice_id)
        return {
            "status": "success",
            "message": "Factura independiente timbrada exitosamente",
            "data": {
                "factura_id": factura.id,
                "uuid": factura.uuid,
                "xml_url": getattr(factura, "xml_url", None),
            },
        }
    except Exception as e:
        custom_error = parse_sat_error(e)
        raise HTTPException(status_code=400, detail=custom_error)


# ==============================================================


@router.get("/test-invoice-pro")
def test_invoice_pro():
    try:
        CURRENT_FILE = Path(__file__).resolve()
        APP_DIR = CURRENT_FILE.parents[2]
        base_path = Path(os.getenv("APP_BASE_PATH", APP_DIR))
        templates_dir = Path(os.getenv("TEMPLATES_DIR", base_path / "templates"))
        template_path = templates_dir / "carta_porte.html"
        storage_dir = base_path / "storage" / "xml_timbrados"
        storage_dir.mkdir(parents=True, exist_ok=True)

        output_pdf = storage_dir / "TEST_EAGLE.pdf"

        logo_path = templates_dir / "assets" / "logo-black.png"
        logo_src = ""
        if logo_path.exists():
            with open(logo_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
                logo_src = f"data:image/png;base64,{encoded_string}"

        def chunk_b64(text, length):
            if not text:
                return ""
            text = str(text).replace(" ", "").replace("\n", "").replace("\r", "")
            return " ".join([text[i : i + length] for i in range(0, len(text), length)])

        context = {
            "rfc_emisor": "RTX110624KP5",
            "cert_emisor": "00001000000717643613",
            "folio_interno": "16595",
            "fecha_emision": "2026-03-02T10:31:54",
            "nombre_cliente": "EAGLE EXPRESS CARGO",
            "rfc_cliente": "EEC1406167F9",
            "direccion_cliente": "",
            "cp_cliente": "15530",
            "regimen_cliente": "601",
            "moneda": "MXN",
            "tc": "1",
            "metodo_pago": "PPD",
            "forma_pago": "99",
            "uso_cfdi": "G03",
            "tipo_comprobante": "I (Ingreso)",
            "condiciones_pago": "En 15 Días",
            "uuid": "94FBAB5B-DDAF-4858-84EC-F23AA4CDC611",
            "cert_sat": "00001000000719545303",
            "fecha_certificacion": "2026-03-02T12:36:24",
            "qr_src": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verificacfdi.facturaelectronica.sat.gob.mx/",
            "sello_emisor": chunk_b64(
                "M085BkYeJH+LmnkY75WIziDPCQp917lel30V7PeXTMx8Y7+sYeReZTt6l8FPSDtIMDAKDAZQzPw1zTBpbzZYkw57pTjlxtLOTkiStguhrZHMLuuKV3aAXlyrA1+eN6AeFolyysC3Y3YM2p8mh29esBK2KZJFh6eCzRA6ZX0g+2gYCp691n8BjPXzFXzJFedrtytiMRHq+A+MyziBCnquGqgjzqxTu7quN7x+F4F619NC9JsBX561LwbeeHEkOsz+VK3YuJ9qiKjqHg770DSh5Sw++tpTaEbDowo4EpeQG4lFC6F165vk29XilalEne8SBa3coQmYTa90BU2GUBKB2uJg==",
                112,
            ),
            "sello_sat": chunk_b64(
                "Gi/zO5izu35e5+j24Fx7DQn16RpiGS8i9k+ttZG/MMh0p7z1f2PJatkD/VUOX3pU1n7HeBjOU7q+1ZMxOEpg5tLFJZgB9l+0+TQbvCXrCklizxmuvHSskkYMgDHZG7/r2gcB13Nu7FNuK1p2tK3x7VgaCZa9W4vWHFviGkyyWqM3NeLYFixEl+ZX3EVU7qgBmORqD6bN0zn8562sJV2n4+9mtoXb85B+C0Z16hM7uTjuyuDSawu4w+zAVBkzmuagBXvq20a4nzQsppB5o7laYf32IIVIILIKESGIKTV6UL1GmBs1C9sYusJJ784UKtwd8jEHVJ1svLzx57Mg57Ud6g==",
                135,
            ),
            "cadena_original": chunk_b64(
                "||1.1|94FBAB5B-DDAF-4858-84EC-F23AA4CDC611|2026-03-02T12:36:24|L501306189R5|M085BkYeJH+LmnkY75WIziDPCQp917lel30V7PeXTMx8Y7+sYeReZTt6l8FPSDtIMDaKDAZOzPw1zTBpbzZYkw57pTjixtLOTkiSftguhrZHMLuuKV3aAXlyrA1+eN6AeFolyysC3Y3YM2p8mh29esBK2KZJFh6eCzRA6ZX0g+2gYCp691n8BjPXzFXzJFe4rtytiMRHq+A+MJziBCnquGajzqxTu7quN7x+F4F619NC9JsBX561LwbeeHEkOsz+VK3YuJ9qiKjgHg770DSh5Sw++fpTaEbDowo4EpeQG4IFc6F165vk2gXilalEne8Ba3coQmYTa90BU2GUBkB2uJg==|00001000000719545303||",
                135,
            ),
            "importe_letra": "(*** TREINTA Y CINCO MIL OCHOCIENTOS CUARENTA PESOS 00/100 MXN ***)",
            "subtotal": "32,000.00",
            "iva": "5,120.00",
            "retenciones": "1,280.00",
            "total": "35,840.00",
            "peso_bruto": "25,000.00",
            "distancia_total": "1,250",
            "leyenda_legal": "Condiciones de prestación de servicios...",
            "logo_src": logo_src,
            "conceptos": [
                {
                    "clave": "01010101",
                    "descripcion": "FLETE CARGA GENERAL",
                    "detalles_extra": "MSBU6763609",
                    "cantidad": "1.00",
                    "unidad": "E48 - SRV",
                    "precio": "32,000.00",
                    "importe": "32,000.00",
                }
            ],
        }

        env = Environment(loader=FileSystemLoader(str(template_path.parent)))
        template = env.get_template(template_path.name)
        html_out = template.render(context)

        HTML(string=html_out).write_pdf(str(output_pdf))
        return FileResponse(output_pdf, media_type="application/pdf")

    except Exception as e:
        import traceback

        return {"error": str(e), "trace": traceback.format_exc()}


@router.get("/debug-ping")
def debug_ping():
    return {"message": "El router de billing funciona"}


# ================================================
# EL MOTOR 2: 2 TIMBRES (La Recolección Operativa)
# ================================================
@router.post("/stamp/nominal", response_model=dict)
def generar_carta_porte_nominal(
    invoice_data: ReceivableInvoiceCreate, db: Session = Depends(get_db)
):
    """
    Endpoint Fase 3 (Bypass Aduanal):
    Genera y timbra la Carta Porte 3.1 por un valor de $1.00 MXN o montos ocultos.
    """

    viaje_id = getattr(invoice_data, "viaje_id", "sin_viaje")
    verificar_doble_clic(f"nominal_viaje_{viaje_id}")
    service = CartaPorteService(db)  # CORRECTO: Servicio Operativo
    try:
        factura = service.generar_carta_porte_nominal(invoice_data)
        return {
            "status": "success",
            "message": "Carta Porte de Bypass generada exitosamente",
            "data": {
                "factura_id": factura.id,
                "uuid": factura.uuid,
                "xml_url": getattr(factura, "xml_url", None),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        custom_error = parse_sat_error(e)
        raise HTTPException(status_code=400, detail=custom_error)


# ================================================
# EL MOTOR 1: 1 TIMBRE (El Santo Grial Multi-Ruta)
# ================================================
@router.post("/stamp/one-shot", response_model=dict)
def generar_carta_porte_one_shot(
    invoice_data: ReceivableInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(RequirePermission("sat:stamp_cfdi")),
):
    """
    Endpoint Motor 1 (1 Solo Timbre):
    Genera y timbra la Carta Porte 3.1 con ruta completa (Multi-Origen / Multi-Destino)
    consumiendo solo 1 timbre.
    """

    viaje_id = getattr(invoice_data, "viaje_id", "sin_viaje")
    verificar_doble_clic(f"oneshot_viaje_{viaje_id}")
    service = CartaPorteService(db)  # CORRECTO: Servicio Operativo
    try:
        # 1. Timbrar la NUEVA factura (Carta Porte)
        factura = service.generar_carta_porte_one_shot(invoice_data)

        # --- INICIO DE NUEVA LÓGICA: CANCELACIÓN AUTOMÁTICA DE CP VIEJA ---
        uuid_relacionado = getattr(invoice_data, "uuid_relacionado", None)
        tipo_relacion = getattr(invoice_data, "tipo_relacion", None)

        # Si la pantalla indica que es una sustitución 04
        if uuid_relacionado and tipo_relacion == "04":
            from app.models import models
            from app.integrations.sat.billing_service import BillingService

            # Buscar la factura "Mala" en la base de datos usando el UUID de la pantalla
            factura_vieja = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.uuid == uuid_relacionado)
                .first()
            )

            # Si la encuentra, mandar la orden al SAT de cancelarla con motivo 01
            if factura_vieja:
                cancel_service = BillingService(db)
                cancel_service.cancelar_factura_sat(
                    invoice_id=factura_vieja.id,
                    motivo="01",
                    uuid_sustituto=factura.uuid,
                )
        # --- FIN DE NUEVA LÓGICA ---

        return {
            "status": "success",
            "message": "Factura Total (Motor 1) generada exitosamente",
            "data": {
                "factura_id": factura.id,
                "uuid": factura.uuid,
                "xml_url": getattr(factura, "xml_url", None),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        custom_error = parse_sat_error(e)
        raise HTTPException(status_code=400, detail=custom_error)


# ================================================
# TIMBRADO REAL (Sustituciones y Cierre)
# ================================================
@router.post("/{trip_id}/stamp-real", response_model=dict)
def stamp_real_trip(trip_id: int, db: Session = Depends(get_db)):
    """
    Trigger manual o automático para generar la Carta Porte REAL
    cuando el viaje inicia su tramo de carretera. Automáticamente
    relaciona y cancela la carta porte nominal previa si existe.
    """

    verificar_doble_clic(f"real_trip_{trip_id}")
    # 🟢 1. IMPRIMIR EL INICIO DEL PROCESO
    print("\n" + "=" * 50)
    print(f"📥 [STAMP REAL TRIGGER] PROCESANDO VIAJE ID: {trip_id}")
    print("=" * 50 + "\n")

    service = BillingService(db)  # CORRECTO: Servicio Financiero

    from app.models.models import ReceivableInvoice

    factura_vieja = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.viaje_id == trip_id, ReceivableInvoice.is_nominal == True
        )
        .first()
    )

    uuid_relacionado = factura_vieja.uuid if factura_vieja else None

    #   NUEVO: Extractor Inteligente de Folio para Reciclaje
    folio_a_reciclar = None
    if factura_vieja and factura_vieja.folio_interno:
        try:
            # Convierte "CP-13" a 13 entero
            folio_a_reciclar = int(factura_vieja.folio_interno.split("-")[1])
        except Exception as e:
            logger.warning(
                f"No se pudo extraer folio numérico de {factura_vieja.folio_interno}: {e}"
            )

    invoice_data = ReceivableInvoiceCreate(
        viaje_id=trip_id,
        is_nominal=False,
        uuid_relacionado=uuid_relacionado,
        folio_forzado=folio_a_reciclar,  # <-- Inyectamos el folio rescatado
    )

    try:
        factura_final = service.generar_factura_final_relacionada(invoice_data)

        if not factura_final:
            raise HTTPException(
                status_code=500, detail="No se pudo procesar el timbrado real."
            )

        if factura_vieja:
            service.cancelar_factura_nominal(
                invoice_id=factura_vieja.id,
                motivo="01",
                uuid_sustituto=factura_final.uuid,
            )

        print("✅ [STAMP REAL TRIGGER] ¡Timbrado Exitoso! UUID:", factura_final.uuid)
        return {
            "status": "success",
            "message": "Factura Real generada exitosamente y previa cancelada.",
            "data": {"factura_id": factura_final.id, "uuid": factura_final.uuid},
        }
    except HTTPException:
        raise
    except Exception as e:
        # 🔴 2. IMPRIMIR EL ERROR EXACTO CON LÍNEA DE CÓDIGO
        print("\n" + "🚨" * 20)
        print("💥 [STAMP REAL TRIGGER] ERROR INTERNO DETECTADO:")
        traceback.print_exc()
        print("🚨" * 20 + "\n")

        custom_error = parse_sat_error(e)
        raise HTTPException(status_code=400, detail=custom_error)


@router.post("/stamp/final", response_model=dict)
def generar_factura_final(
    invoice_data: ReceivableInvoiceCreate, db: Session = Depends(get_db)
):
    """
    Endpoint Fase 4 (Cierre Administrativo y Sustitución 04):
    1. Genera la factura real con los costos completos jalando al operador de ruta.
    2. Aplica la Relación 04 al UUID de la Carta Porte nominal.
    3. Cancela localmente la Carta Porte nominal de $1.
    """
    viaje_id = getattr(invoice_data, "viaje_id", "sin_viaje")
    verificar_doble_clic(f"final_viaje_{viaje_id}")
    # 🟢 1. IMPRIMIR EL REQUEST CRUZO
    print("\n" + "=" * 50)
    print("📥 [FACTURA CHIDA - FINAL] NUEVO REQUEST RECIBIDO:")
    print(invoice_data.dict())
    print("=" * 50 + "\n")

    service = BillingService(db)  # CORRECTO: Servicio Financiero
    try:
        factura_final = service.generar_factura_final_relacionada(invoice_data)

        if invoice_data.uuid_relacionado:
            from app.models.models import ReceivableInvoice

            factura_vieja = (
                db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.uuid == invoice_data.uuid_relacionado)
                .first()
            )
            if factura_vieja:
                service.cancelar_factura_nominal(
                    invoice_id=factura_vieja.id,
                    motivo="01",
                    uuid_sustituto=factura_final.uuid,
                )

        print("✅ [FACTURA CHIDA - FINAL] ¡Timbrado Exitoso! UUID:", factura_final.uuid)
        return {
            "status": "success",
            "message": "Factura Real generada y Carta Porte previa cancelada",
            "data": {
                "factura_id": factura_final.id,
                "uuid": factura_final.uuid,
                "xml_url": getattr(factura_final, "xml_url", None),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        # 🔴 2. IMPRIMIR EL ERROR EXACTO CON LÍNEA DE CÓDIGO
        print("\n" + "🚨" * 20)
        print("💥 [FACTURA CHIDA - FINAL] ERROR INTERNO DETECTADO:")
        traceback.print_exc()
        print("🚨" * 20 + "\n")

        custom_error = parse_sat_error(e)
        raise HTTPException(status_code=400, detail=custom_error)


@router.get("/invoice/{uuid}/pdf", response_class=FileResponse)
def download_invoice_pdf(uuid: str, db: Session = Depends(get_db)):
    import re
    from app.models import models

    # Limpiamos el UUID
    match = re.search(
        r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
        str(uuid),
    )
    clean_uuid = match.group(0) if match else str(uuid)

    # FIX: Usamos el servicio base para que lea la carpeta EXACTA de tu servidor de Producción
    service = CartaPorteService(db)

    pdf_path_upper = service.storage_dir / f"{clean_uuid.upper()}.pdf"
    pdf_path_lower = service.storage_dir / f"{clean_uuid.lower()}.pdf"

    if pdf_path_upper.exists():
        pdf_path = pdf_path_upper
    elif pdf_path_lower.exists():
        pdf_path = pdf_path_lower
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Error 404: El PDF no se encuentra físicamente en la ruta {service.storage_dir}",
        )

    # =========================================================
    # NUEVA LÓGICA: CONSTRUIR EL NOMBRE DEL ARCHIVO DE DESCARGA
    # =========================================================
    factura = (
        db.query(models.ReceivableInvoice)
        .filter(models.ReceivableInvoice.uuid == clean_uuid)
        .first()
    )

    if factura:
        # folio_interno ya trae "CP-15", "F-22", "COM-1", etc.
        folio = factura.folio_interno or "SINFOLIO"
        rfc = factura.client.rfc if factura.client else "XAXX010101000"

        # Formato: CP-15_XAXX010101000_UUID.pdf
        nombre_descarga = f"{folio}_{rfc}_{clean_uuid.upper()}.pdf"
    else:
        # Fallback por si la factura no está en la base de datos por alguna razón
        nombre_descarga = f"CFDI_{clean_uuid.upper()}.pdf"
    # =========================================================

    return FileResponse(
        path=str(pdf_path),
        filename=nombre_descarga,  # <--- Se asigna el nuevo nombre aquí
        media_type="application/pdf",
        content_disposition_type="attachment",
    )


@router.get("/invoice/{uuid}/xml", response_class=FileResponse)
def download_invoice_xml(uuid: str, db: Session = Depends(get_db)):
    import re
    from app.models import models

    match = re.search(
        r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
        str(uuid),
    )
    clean_uuid = match.group(0) if match else str(uuid)

    # FIX: Usamos el servicio base para encontrar la carpeta
    service = CartaPorteService(db)

    xml_path_upper = service.storage_dir / f"{clean_uuid.upper()}.xml"
    xml_path_lower = service.storage_dir / f"{clean_uuid.lower()}.xml"

    if xml_path_upper.exists():
        xml_path = xml_path_upper
    elif xml_path_lower.exists():
        xml_path = xml_path_lower
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Error 404: El XML no se encuentra físicamente en la ruta {service.storage_dir}",
        )

    # =========================================================
    # NUEVA LÓGICA: CONSTRUIR EL NOMBRE DEL ARCHIVO DE DESCARGA
    # =========================================================
    factura = (
        db.query(models.ReceivableInvoice)
        .filter(models.ReceivableInvoice.uuid == clean_uuid)
        .first()
    )

    if factura:
        # folio_interno ya trae "CP-15", "F-22", "COM-1", etc.
        folio = factura.folio_interno or "SINFOLIO"
        rfc = factura.client.rfc if factura.client else "XAXX010101000"

        # Formato: CP-15_XAXX010101000_UUID.xml
        nombre_descarga = f"{folio}_{rfc}_{clean_uuid.upper()}.xml"
    else:
        # Fallback por si no existe
        nombre_descarga = f"CFDI_{clean_uuid.upper()}.xml"
    # =========================================================

    return FileResponse(
        path=str(xml_path),
        filename=nombre_descarga,  # <--- Se asigna el nuevo nombre aquí
        media_type="application/xml",
        content_disposition_type="attachment",
    )


@router.post("/update-params")
def update_sat_params(data: dict, db: Session = Depends(get_db)):
    """
    Endpoint para la Pestaña 3: Guarda la leyenda legal y otros textos.
    """
    for key, value in data.items():
        db_conf = (
            db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
        )
        if db_conf:
            db_conf.value = str(value)
        else:
            db.add(
                models.SystemConfig(
                    key=key, value=str(value), grupo="sat", tipo="string"
                )
            )
    db.commit()
    return {"status": "success"}


@router.post("/csd")
def upload_csd_files(
    cer_file: UploadFile = File(...),
    key_file: UploadFile = File(...),
    password: str = Form(...),
    environment: str = Form("PROD"),
    db: Session = Depends(get_db),
):
    suffix = "_qa" if environment == "QA" else ""

    if not cer_file.filename.endswith(".cer") or not key_file.filename.endswith(".key"):
        raise HTTPException(status_code=400, detail="Archivos inválidos")

    base_path = Path(os.getenv("APP_BASE_PATH", "./"))
    cert_dir = Path(os.getenv("CERT_DIR", base_path / "certs"))
    cert_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cer_path = cert_dir / f"CSD_{environment}_{timestamp}.cer"
    key_path = cert_dir / f"CSD_{environment}_{timestamp}.key"

    with open(cer_path, "wb") as buffer:
        shutil.copyfileobj(cer_file.file, buffer)
    with open(key_path, "wb") as buffer:
        shutil.copyfileobj(key_file.file, buffer)

    configs = {
        f"sat_cert_path{suffix}": str(cer_path),
        f"sat_key_path{suffix}": str(key_path),
        f"sat_key_password{suffix}": password,
    }

    for key, value in configs.items():
        db_conf = (
            db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
        )
        if db_conf:
            db_conf.value = value
        else:
            db.add(
                models.SystemConfig(
                    key=key, value=value, grupo="facturacion", tipo="string"
                )
            )

    db.commit()
    return {
        "status": "success",
        "message": f"Certificados de {environment} actualizados",
    }


@router.post("/csd/download")
def download_csd_secure(
    password: str = Form(...),
    file_type: str = Form(...),
    environment: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    if not verify_password(password, current_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Tu contraseña de acceso es incorrecta. Verificación fallida.",
        )

    suffix = "_qa" if environment == "QA" else ""
    key_name = (
        f"sat_cert_path{suffix}" if file_type == "cer" else f"sat_key_path{suffix}"
    )
    path_conf = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == key_name)
        .first()
    )

    if not path_conf or not Path(path_conf.value).exists():
        raise HTTPException(
            status_code=404, detail="El archivo físico no existe en el servidor."
        )

    return FileResponse(
        path=path_conf.value,
        filename=Path(path_conf.value).name,
        media_type="application/octet-stream",
    )


@router.post("/csd/test")
def test_csd_connection(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    environment = payload.get("environment", "PROD")
    suffix = "_qa" if environment == "QA" else ""

    cer_conf = (
        db.query(models.SystemConfig).filter_by(key=f"sat_cert_path{suffix}").first()
    )
    key_conf = (
        db.query(models.SystemConfig).filter_by(key=f"sat_key_path{suffix}").first()
    )
    pass_conf = (
        db.query(models.SystemConfig).filter_by(key=f"sat_key_password{suffix}").first()
    )

    if not cer_conf or not key_conf or not pass_conf:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan certificados configurados para el ambiente {environment}",
        )

    cer_path = Path(cer_conf.value)
    if not cer_path.exists():
        raise HTTPException(
            status_code=404,
            detail="El archivo de certificado (.cer) no se encuentra físicamente en el servidor.",
        )

    try:
        with open(cer_path, "rb") as cert_file:
            cert_data = cert_file.read()
            cert = x509.load_der_x509_certificate(cert_data, default_backend())

            not_valid_before = cert.not_valid_before_utc
            not_valid_after = cert.not_valid_after_utc
            ahora = datetime.now(not_valid_after.tzinfo)
            dias_restantes = (not_valid_after - ahora).days

            estado = "VIGENTE"
            if dias_restantes < 0:
                estado = "CADUCADO"
            elif dias_restantes <= 30:
                estado = "POR VENCER"

            return {
                "status": "success",
                "message": f"Conexión simulada exitosa con PAC ({environment})",
                "cert_info": {
                    "valido_desde": not_valid_before.isoformat(),
                    "valido_hasta": not_valid_after.isoformat(),
                    "dias_restantes": dias_restantes,
                    "estado": estado,
                },
            }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"El archivo .cer es inválido o está corrupto: {str(e)}",
        )


@router.post("/retry-cancellations", summary="Reintentar Cancelaciones Pendientes SAT")
def retry_pending_cancellations(db: Session = Depends(get_db)):
    """
    Este endpoint busca facturas con status 'PENDIENTE_CANCELAR_SAT'
    y vuelve a mandar la petición SOAP de cancelación al PAC.
    """
    service = BillingService(db)  # CORRECTO: Servicio Financiero
    resultado = service.procesar_cancelaciones_pendientes()
    return resultado


@router.get("/retry-queue", summary="Consultar cola de reintentos SAT")
def get_sat_retry_queue(
    status_filter: str = "PENDIENTE",
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(models.SatRetryQueue)
    if status_filter:
        query = query.filter(models.SatRetryQueue.status == status_filter)

    rows = (
        query.order_by(
            models.SatRetryQueue.next_attempt_at.asc().nullsfirst(),
            models.SatRetryQueue.created_at.asc(),
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "invoice_id": row.invoice_id,
            "viaje_id": row.viaje_id,
            "operation_type": row.operation_type,
            "source_service": row.source_service,
            "status": row.status,
            "folio_interno": row.folio_interno,
            "uuid": row.uuid,
            "attempts": row.attempts,
            "max_attempts": row.max_attempts,
            "next_attempt_at": row.next_attempt_at,
            "last_error": row.last_error,
        }
        for row in rows
    ]


@router.post("/retry-queue/process", summary="Procesar cola de reintentos SAT")
def process_sat_retry_queue(limit: int = 10, db: Session = Depends(get_db)):
    service = BillingService(db)
    return service.procesar_sat_retry_queue(limit=limit)


# ==============================================================
# NUEVO: ENDPOINT PARA CANCELACIÓN MASIVA (1 o N FACTURAS)
# ==============================================================
class SatMassCancelPayload(BaseModel):
    invoice_ids: List[int]
    motivo: str = "02"
    uuid_sustituto: Optional[str] = None


@router.post("/stamp/cancel-mass", response_model=dict)
def cancel_mass_invoices_in_sat(
    payload: SatMassCancelPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(RequirePermission("sat:cancel_cfdi")),
):
    """
    Endpoint para CANCELAR 1 o N facturas en el SAT.
    Delega al servicio inteligente. Si el PAC falla (Timeout/500),
    el servicio lo manda automáticamente al SatRetryQueue.
    """
    service = BillingService(db)
    resultados = []
    errores = 0

    for inv_id in payload.invoice_ids:
        try:
            # Reutilizamos tu método maestro de cancelación
            res = service.cancelar_factura_sat(
                invoice_id=inv_id,
                motivo=payload.motivo,
                uuid_sustituto=payload.uuid_sustituto,
            )
            resultados.append({"id": inv_id, "status": "success", "detalle": res})

        except HTTPException as he:
            # Si tu servicio lanza un 202, significa que ya lo metió al RetryQueue
            if he.status_code == 202:
                resultados.append(
                    {"id": inv_id, "status": "queued", "detalle": he.detail}
                )
            else:
                errores += 1
                resultados.append(
                    {"id": inv_id, "status": "error", "detalle": he.detail}
                )

        except Exception as e:
            errores += 1
            custom_error = parse_sat_error(e)
            resultados.append(
                {"id": inv_id, "status": "error", "detalle": custom_error}
            )

    return {
        "status": "success" if errores == 0 else "partial",
        "message": f"Proceso finalizado. Fallos críticos: {errores}",
        "data": resultados,
    }


@router.post("/stamp/payment", summary="Generar Complemento de Pago")
def registrar_pago_multiple(
    payload: RegistroPagoPayload, db: Session = Depends(get_db)
):
    """
    Endpoint Fase 3.2: Registra el pago y genera el Complemento (REP).
    (Bypass desactivado para ver el error real del SAT)
    """

    factura_id = payload.pagos[0].invoice_id if payload.pagos else "vacio"
    verificar_doble_clic(f"pago_cliente_{payload.client_id}_factura_{factura_id}")
    import uuid
    from datetime import datetime
    from fastapi import HTTPException
    from app.models import models
    from app.modules.finance.crud import create_bank_movement
    from app.modules.finance import schemas as finance_schemas

    for pago in payload.pagos:
        factura = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == pago.invoice_id)
            .first()
        )
        if factura and factura.uuid:
            clean_uuid = factura.uuid.strip()
            if len(clean_uuid) != 36:
                pass

    service = PaymentComplementService(db)

    try:
        # 1. Intentamos el timbrado real con el SAT
        resultado = service.registrar_pago_y_timbrar_complemento(
            client_id=payload.client_id,
            pagos_data=[p.dict() for p in payload.pagos],
            forma_pago=payload.forma_pago,
            fecha_pago=payload.fecha_pago,
            referencia=payload.referencia,
            cuenta_deposito=payload.cuenta_deposito,
            user_id=1,
        )
        return resultado

    except Exception as e:
        #  TRUCO DE DEBUG: Lanzamos el error directo a la pantalla
        raise HTTPException(
            status_code=400, detail=f"EL SAT RECHAZÓ EL PAGO. Motivo exacto: {str(e)}"
        )


@router.get("/rebuild-pdf/{invoice_id}")
def reconstruir_pdf_factura(invoice_id: int, db: Session = Depends(get_db)):
    """
    Lee el XML timbrado del disco y re-crea el PDF de la factura.
    [VERSIÓN GET - PARA PROBAR DESDE EL NAVEGADOR]
    """
    from app.integrations.sat.billing_service import BillingService

    service = BillingService(db)

    try:
        resultado = service.regenerar_pdf_factura(invoice_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al reconstruir PDF: {str(e)}"
        )


@router.get("/rebuild-all-pdfs")
def rebuild_all_pdfs(db: Session = Depends(get_db)):
    try:
        service = BillingService(db)
        resultado = service.regenerar_todos_los_pdfs()
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
