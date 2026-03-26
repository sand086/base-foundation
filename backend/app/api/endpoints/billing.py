import os
import shutil
from pathlib import Path
from datetime import datetime

from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from cryptography import x509
from cryptography.hazmat.backends import default_backend

from app.db.database import get_db
from app.schemas.trips import ReceivableInvoiceCreate
from app.services.billing_service import BillingService
from app.models import models
from app.api.endpoints.auth import get_current_active_user
from app.core.security import verify_password

router = APIRouter()


@router.get("/test-invoice-pro")
def test_invoice_pro():
    try:
        CURRENT_FILE = Path(__file__).resolve()
        APP_DIR = CURRENT_FILE.parents[2]

        template_path = APP_DIR / "templates" / "carta_porte.html"
        storage_dir = APP_DIR / "storage" / "xml_timbrados"
        storage_dir.mkdir(parents=True, exist_ok=True)
        output_pdf = storage_dir / "TEST_EAGLE.pdf"

        def chunk_b64(text, length):
            if not text:
                return ""
            text = str(text).replace(" ", "").replace("\n", "").replace("\r", "")
            return " ".join([text[i : i + length] for i in range(0, len(text), length)])

        # DATOS COMPLETOS SIN ABREVIATURAS
        context = {
            "rfc_emisor": "RTX110624KP5",
            "cert_emisor": "00001000000717643613",
            "folio_interno": "16595",
            "fecha_emision": "2026-03-02T10:31:54",
            # Datos Cliente (Completos)
            "nombre_cliente": "EAGLE EXPRESS CARGO",
            "rfc_cliente": "EEC1406167F9",
            "direccion_cliente": "",  # Dejamos el espacio como en tu texto
            "cp_cliente": "15530",
            "regimen_cliente": "601 (General de Ley Personas Morales)",
            # Datos Comprobante (Completos)
            "moneda": "MXN",
            "tc": "1",
            "metodo_pago": "PPD (Pago en parcialidades o diferido)",
            "forma_pago": "99 (Por definir)",
            "uso_cfdi": "G03 (Gastos en general.)",
            "tipo_comprobante": "I (Ingreso)",
            "condiciones_pago": "En 15 Días",
            # Footer SAT
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
            # Totales y Leyenda
            "importe_letra": "(*** TREINTA Y CINCO MIL OCHOCIENTOS CUARENTA PESOS 00/100 MXN ***)",
            "subtotal": "32,000.00",
            "iva": "5,120.00",
            "retenciones": "1,280.00",
            "total": "35,840.00",
            "leyenda_legal": "Condiciones de prestación de servicios que ampara la CARTA DE PORTE O COMPROBANTE PARA EL TRANSPORTE DE MERCANCÍAS. PRIMERA.- Para los efectos del presente contrato de transporte se denomina 'Transportista' al que realiza el servicio de transportación y 'Remitente' o 'Expedidor' al usuario que contrate el servicio... [TEXTO ACORTADO PARA DEMO].",
            "conceptos": [
                {
                    "clave": "78101802",
                    "descripcion": "FLETE CARGA GENERAL",
                    "detalles_extra": "MSBU6763609",
                    "cantidad": "1.00",
                    "unidad": "E48 - SRV",
                    "precio": "32,000.00",
                    "importe": "32,000.00",
                }
            ]
            * 20,
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


@router.post("/stamp/nominal", response_model=dict)
def generar_carta_porte_nominal(
    invoice_data: ReceivableInvoiceCreate, db: Session = Depends(get_db)
):
    """
    Endpoint Fase 3 (Bypass Aduanal):
    Genera y timbra la Carta Porte 3.1 por un valor de $1.00 MXN.
    """
    service = BillingService(db)
    try:
        factura = service.generar_carta_porte_nominal(invoice_data)
        return {
            "status": "success",
            "message": "Carta Porte de Bypass generada exitosamente",
            "data": {
                "factura_id": factura.id,
                "uuid": factura.uuid,
                "xml_url": factura.xml_url,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    service = BillingService(db)
    try:
        factura_final = service.generar_factura_final_relacionada(invoice_data)

        # Efectuamos la cancelación del comprobante anterior (Fase 4)
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

        return {
            "status": "success",
            "message": "Factura Real generada y Carta Porte previa cancelada",
            "data": {
                "factura_id": factura_final.id,
                "uuid": factura_final.uuid,
                "xml_url": factura_final.xml_url,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoice/{uuid}/pdf")
def download_invoice_pdf(uuid: str, db: Session = Depends(get_db)):
    """
    Busca el archivo PDF generado en el disco y lo descarga.
    """
    service = BillingService(db)
    pdf_path = service.storage_dir / f"{uuid}.pdf"

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail="El PDF timbrado aún no existe o no se pudo generar.",
        )

    return FileResponse(
        path=pdf_path, filename=f"Carta_Porte_{uuid}.pdf", media_type="application/pdf"
    )


@router.post("/update-params")
def update_sat_params(data: dict, db: Session = Depends(get_db)):
    """
    Endpoint para la Pestaña 3: Guarda la leyenda legal y otros textos.
    Recibe un dict: {"sat_leyenda_legal": "TEXTO LARGO...", "sat_ppd_default": "true"}
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
    environment: str = Form("PROD"),  # 🚀 Recibimos el ambiente
    db: Session = Depends(get_db),
):
    suffix = "_qa" if environment == "QA" else ""

    # Validaciones de extensión
    if not cer_file.filename.endswith(".cer") or not key_file.filename.endswith(".key"):
        raise HTTPException(status_code=400, detail="Archivos inválidos")

    # Definir carpetas
    base_path = Path(os.getenv("APP_BASE_PATH", "./"))
    cert_dir = Path(os.getenv("CERT_DIR", base_path / "certs"))
    cert_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cer_path = cert_dir / f"CSD_{environment}_{timestamp}.cer"
    key_path = cert_dir / f"CSD_{environment}_{timestamp}.key"

    # Guardar archivos físicamente
    with open(cer_path, "wb") as buffer:
        shutil.copyfileobj(cer_file.file, buffer)
    with open(key_path, "wb") as buffer:
        shutil.copyfileobj(key_file.file, buffer)

    # Actualizar llaves dinámicas en la BD
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
    current_user: models.User = Depends(
        get_current_active_user
    ),  # 🚀 Obtenemos al usuario logueado
):
    # 1. VALIDAR CONTRASEÑA DEL USUARIO (Logueo)
    if not verify_password(password, current_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Tu contraseña de acceso es incorrecta. Verificación fallida.",
        )

    # 2. SELECCIONAR SUFIJO SEGÚN AMBIENTE
    suffix = "_qa" if environment == "QA" else ""

    # 3. BUSCAR LA RUTA FÍSICA EN LA DB
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

    # 4. ENVIAR ARCHIVO PARA DESCARGA
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
    """
    Verifica que los certificados existan, lee la fecha de caducidad del .cer
    y simula la conexión con el PAC.
    """
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

    # 🚀 LECTURA REAL DEL CERTIFICADO PARA SACAR LA FECHA
    try:
        with open(cer_path, "rb") as cert_file:
            cert_data = cert_file.read()
            # El SAT usa formato DER
            cert = x509.load_der_x509_certificate(cert_data, default_backend())

            # Fechas en UTC
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
    Ideal para configurar en un CRONJOB (ej. cada hora).
    """
    service = BillingService(db)
    resultado = service.procesar_cancelaciones_pendientes()
    return resultado
