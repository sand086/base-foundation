# backend/app/services/email_service.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
import os
import logging

from app.models.models import EmailTemplate, Trip

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        # Configuración de tu servidor de correos (Añade estas variables a tu .env)
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER", "tu_correo@gmail.com")
        self.smtp_pass = os.getenv("SMTP_PASS", "tu_password_de_aplicacion")

    def send_status_update(
        self, trip: Trip, status: str, location: str, event_time: str
    ):
        # 1. Verificar si el cliente tiene correo registrado
        client_email = trip.client.email if trip.client else None
        if not client_email:
            logger.warning(
                f"No se pudo notificar: El cliente {trip.client.razon_social} no tiene correo registrado."
            )
            return False

        # 2. Buscar la plantilla de Gustavo en la Base de Datos
        template = self.db.query(EmailTemplate).filter_by(codigo="TPL-001").first()
        if not template:
            logger.error("Plantilla de correo TPL-001 no encontrada en BD.")
            return False

        # 3. Reemplazar las variables dinámicas de la plantilla
        folio = str(trip.public_id or trip.id)
        estatus_formateado = status.replace("_", " ").title()

        asunto = template.asunto.replace("[SERVICIO_ID]", folio)
        cuerpo = template.cuerpo.replace("[SERVICIO_ID]", folio)
        cuerpo = cuerpo.replace("[ESTATUS]", estatus_formateado)
        cuerpo = cuerpo.replace("[UBICACION]", location)
        cuerpo = cuerpo.replace("[FECHA_HORA]", event_time)

        # 4. Armar el correo
        msg = MIMEMultipart()
        msg["From"] = self.smtp_user
        msg["To"] = client_email
        msg["Subject"] = asunto
        msg.attach(MIMEText(cuerpo, "plain"))

        # 5. Enviar el correo
        try:
            logger.info(f"Enviando correo de estatus al cliente: {client_email}")
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            logger.error(f"Error crítico al enviar correo: {e}")
            return False
