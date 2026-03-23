import os
import shutil
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.trips import ReceivableInvoiceCreate
from app.services.billing_service import BillingService
from app.models.models import SystemConfig
from app.api.endpoints.auth import get_current_active_user

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
        db_conf = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if db_conf:
            db_conf.value = str(value)
        else:
            db.add(SystemConfig(key=key, value=str(value), grupo="sat", tipo="string"))
    db.commit()
    return {"status": "success"}


@router.post("/csd")
def upload_csd_files(
    cer_file: UploadFile = File(...),
    key_file: UploadFile = File(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Recibe los certificados .cer y .key y los guarda en el servidor con un timestamp.
    """
    if not cer_file.filename.endswith(".cer") or not key_file.filename.endswith(".key"):
        raise HTTPException(
            status_code=400, detail="Los archivos deben ser .cer y .key válidos"
        )

    base_path = Path(os.getenv("APP_BASE_PATH", Path(__file__).resolve().parents[3]))
    cert_dir = Path(os.getenv("CERT_DIR", base_path / "certs"))
    cert_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cer_filename = f"CSD_{timestamp}.cer"
    key_filename = f"CSD_{timestamp}.key"

    cer_path = cert_dir / cer_filename
    key_path = cert_dir / key_filename

    with open(cer_path, "wb") as buffer:
        shutil.copyfileobj(cer_file.file, buffer)
    with open(key_path, "wb") as buffer:
        shutil.copyfileobj(key_file.file, buffer)

    configs_to_update = [
        {
            "key": "sat_cert_path",
            "value": str(cer_path),
            "grupo": "facturacion",
            "tipo": "string",
        },
        {
            "key": "sat_key_path",
            "value": str(key_path),
            "grupo": "facturacion",
            "tipo": "string",
        },
        {
            "key": "sat_key_password",
            "value": password,
            "grupo": "facturacion",
            "tipo": "string",
        },
    ]

    for conf in configs_to_update:
        db_conf = db.query(SystemConfig).filter(SystemConfig.key == conf["key"]).first()
        if db_conf:
            db_conf.value = conf["value"]
        else:
            db_conf = SystemConfig(**conf, is_public=False)
            db.add(db_conf)

    db.commit()
    return {
        "status": "success",
        "message": "Certificados CSD actualizados correctamente",
    }


@router.post("/csd/download")
def download_csd_secure(
    password: str = Form(...),
    file_type: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Descarga segura de los certificados CSD.
    Requiere la contraseña del sello digital.
    """
    db_pass = (
        db.query(SystemConfig).filter(SystemConfig.key == "sat_key_password").first()
    )

    if not db_pass or db_pass.value != password:
        raise HTTPException(status_code=401, detail="Contraseña del SAT incorrecta.")

    if file_type == "cer":
        path_conf = (
            db.query(SystemConfig).filter(SystemConfig.key == "sat_cert_path").first()
        )
    elif file_type == "key":
        path_conf = (
            db.query(SystemConfig).filter(SystemConfig.key == "sat_key_path").first()
        )
    else:
        raise HTTPException(status_code=400, detail="Tipo de archivo inválido.")

    if not path_conf or not path_conf.value:
        raise HTTPException(
            status_code=404, detail="El archivo solicitado no está configurado."
        )

    file_path = Path(path_conf.value)

    if not file_path.exists():
        raise HTTPException(
            status_code=404, detail="El archivo físico no se encuentra en el servidor."
        )

    return FileResponse(
        path=file_path, filename=file_path.name, media_type="application/octet-stream"
    )
