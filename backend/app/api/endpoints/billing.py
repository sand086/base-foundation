import os
import shutil
from pathlib import Path
from datetime import datetime

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
