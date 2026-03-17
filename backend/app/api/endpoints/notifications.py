# backend/app/api/endpoints/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.models import AlertConfig, EmailTemplate
from app.schemas import notifications as schemas

router = APIRouter()

# ==========================================
# ENDPOINTS PARA CONFIGURACIÓN DE ALERTAS
# ==========================================


@router.get("/config", response_model=schemas.AlertConfigResponse)
def get_alert_config(db: Session = Depends(get_db)):
    config = db.query(AlertConfig).first()

    # Si no existe configuración en la BD, creamos la que viene por defecto
    if not config:
        config = AlertConfig()
        db.add(config)
        db.commit()
        db.refresh(config)

    return config


@router.put("/config", response_model=schemas.AlertConfigResponse)
def update_alert_config(
    config_in: schemas.AlertConfigUpdate, db: Session = Depends(get_db)
):
    config = db.query(AlertConfig).first()

    if not config:
        config = AlertConfig()
        db.add(config)

    for field, value in config_in.model_dump().items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return config


# ==========================================
# ENDPOINTS PARA PLANTILLAS DE CORREO
# ==========================================


@router.get("/templates", response_model=List[schemas.EmailTemplateResponse])
def get_all_templates(db: Session = Depends(get_db)):
    templates = db.query(EmailTemplate).all()

    # "Semilla" automática: Si la tabla está vacía, mete las 3 plantillas por defecto de Gustavo
    if not templates:
        defaults = [
            EmailTemplate(
                codigo="TPL-001",
                nombre="Notificación de Cliente - Estatus",
                asunto="Actualización de su envío [SERVICIO_ID]",
                cuerpo="Estimado cliente,\n\nLe informamos que su envío con número de servicio [SERVICIO_ID] ha sido actualizado.\n\nEstado actual: [ESTATUS]\nUbicación: [UBICACION]\nHora de actualización: [FECHA_HORA]\n\nAtentamente,\nRápidos 3T",
            ),
            EmailTemplate(
                codigo="TPL-002",
                nombre="Notificación de Factura",
                asunto="Nueva factura [FACTURA_ID] - Rápidos 3T",
                cuerpo="Estimado cliente,\n\nAdjunto encontrará la factura [FACTURA_ID] correspondiente a los servicios prestados.\n\nMonto total: [MONTO]\nFecha de vencimiento: [FECHA_VENCIMIENTO]\n\nAgradecemos su preferencia.\n\nAtentamente,\nRápidos 3T",
            ),
            EmailTemplate(
                codigo="TPL-003",
                nombre="Alerta de Documento Vencido",
                asunto="URGENTE: Documento próximo a vencer - [UNIDAD]",
                cuerpo="Atención,\n\nEl documento [TIPO_DOCUMENTO] de la unidad [UNIDAD] vencerá el [FECHA_VENCIMIENTO].\n\nPor favor, tome las acciones necesarias para renovarlo a la brevedad.\n\nSistema de Alertas\nRápidos 3T",
            ),
        ]
        db.bulk_save_objects(defaults)
        db.commit()
        templates = db.query(EmailTemplate).all()

    return templates


@router.put("/templates/{template_id}", response_model=schemas.EmailTemplateResponse)
def update_template(
    template_id: int,
    template_in: schemas.EmailTemplateUpdate,
    db: Session = Depends(get_db),
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    for field, value in template_in.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)
    return template
