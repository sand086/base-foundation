# backend/app/api/endpoints/notifications.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import logging

from app.db.database import get_db
from app.models.models import AlertConfig, EmailTemplate
from app.schemas import notifications as schemas
from app.modules.auth.api_auth import get_current_active_user
from app.models import models
from app.integrations.email.email_service import EmailService

logger = logging.getLogger(__name__)
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


# ==========================================
# NOTIFICACIONES Y ENVÍO DE EMAIL 🚀
# ==========================================


@router.post("/", response_model=schemas.NotificationResponse)
async def create_notification(
    payload: schemas.NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # 1. Guardar en la tabla NUEVA (user_notifications)
    db_notif = models.UserNotification(
        user_id=payload.user_id,
        title=payload.title,
        message=payload.message,
        event_type=payload.event_type,
        reference_id=payload.reference_id,
        metadata_info=payload.metadata_info,  # 🚀 Sincronizado con el Schema
        created_by_id=current_user.id,
    )

    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)

    # 2. 📧 Lógica de envío de correo
    # 🚀 IMPORTANTE: Cambiamos payload.metadata por payload.metadata_info
    if payload.event_type == "trip_tracking_update" and payload.metadata_info:
        is_external = payload.metadata_info.get("is_external", False)

        if is_external and payload.reference_id:
            try:
                # Búsqueda segura del viaje
                trip_id = int(payload.reference_id)
                trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()

                if trip:
                    # Extraemos datos del metadata_info que viene de React
                    status_label = payload.metadata_info.get(
                        "statusLabel", "Actualización"
                    )
                    location = payload.metadata_info.get("location", "No especificada")
                    fecha_envio = db_notif.created_at.strftime("%d/%m/%Y %H:%M")

                    email_service = EmailService(db)
                    background_tasks.add_task(
                        email_service.send_status_update,
                        trip,
                        status_label,
                        location,
                        fecha_envio,
                    )
                    logger.info(f"Email de tracking encolado para viaje #{trip.id}")
            except ValueError:
                logger.error(
                    f"ID de viaje no válido para notificación: {payload.reference_id}"
                )

    return db_notif


@router.get("/me", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # 🚀 Usamos UserNotification para consistencia
    return (
        db.query(models.UserNotification)
        .filter(models.UserNotification.user_id == current_user.id)
        .order_by(models.UserNotification.created_at.desc())
        .limit(20)
        .all()
    )


@router.patch("/{notif_id}/read")
def mark_notification_as_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # 🚀 Cambiado models.Notification -> models.UserNotification
    notif = (
        db.query(models.UserNotification)
        .filter(
            models.UserNotification.id == notif_id,
            models.UserNotification.user_id == current_user.id,
        )
        .first()
    )

    if notif:
        notif.is_read = True
        db.commit()
        return {"message": "Marcada como leída"}

    raise HTTPException(status_code=404, detail="Notificación no encontrada")


@router.post("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # 🚀 Cambiado models.Notification -> models.UserNotification
    db.query(models.UserNotification).filter(
        models.UserNotification.user_id == current_user.id,
        models.UserNotification.is_read == False,
    ).update({"is_read": True})

    db.commit()
    return {"message": "Todas las notificaciones marcadas como leídas"}
