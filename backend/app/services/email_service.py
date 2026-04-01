# backend/app/services/email_service.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
import logging

from app.models.models import EmailTemplate, Trip

# Configuración de logs
logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        #  EQUIVALENTE EXACTO A TU PHPMAILER
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_user = "myereportes@gmail.com"
        self.smtp_pass = "rdekcsuljhszykxy"
        self.from_email = "myereportes@gmail.com"
        self.from_name = "Rápidos 3T (MyE Reportes)"

    def send_status_update(
        self, trip: Trip, status: str, location: str, event_time: str
    ):
        """
        Envía un correo al cliente basándose en la plantilla TPL-001 de la base de datos.
        """
        # 1. Definir Destinatarios
        # Si el cliente del viaje tiene correo, se lo mandamos a él. Si no, usamos el de TI por defecto.
        to_email = (
            trip.client.email
            if trip.client and trip.client.email
            else "desarrollo@mensajeria-estrategias.com"
        )

        # Copias Ocultas / CC que tenías en tu PHP
        cc_emails = [
            "desarrollo@mensajeria-estrategias.com",
            "desarrolloSoft@asicomsystems.com.mx",
        ]

        # 2. Buscar la plantilla dinámica que editan desde React (NotificacionesConfig)
        template = self.db.query(EmailTemplate).filter_by(codigo="TPL-001").first()
        if not template:
            logger.error("Plantilla TPL-001 no encontrada en BD.")
            return False

        # 3. Reemplazar las variables dinámicas de la plantilla
        folio = str(trip.public_id or trip.id)
        estatus_formateado = status.replace("_", " ").title()

        asunto = template.asunto.replace("[SERVICIO_ID]", folio)
        cuerpo = template.cuerpo.replace("[SERVICIO_ID]", folio)
        cuerpo = cuerpo.replace("[ESTATUS]", estatus_formateado)
        cuerpo = cuerpo.replace("[UBICACION]", location)
        cuerpo = cuerpo.replace("[FECHA_HORA]", event_time)

        # 4. Armar el correo (MIMEMultipart)
        msg = MIMEMultipart()
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email
        msg["Cc"] = ", ".join(cc_emails)
        msg["Subject"] = asunto
        msg.attach(MIMEText(cuerpo, "plain"))

        # Juntar To y Cc para el envío real por SMTP
        destinatarios = [to_email] + cc_emails

        # 5. Enviar usando SMTP (STARTTLS)
        try:
            logger.info(f"Intentando enviar correo de estatus a {to_email} y CCs...")
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)

            # server.set_debuglevel(1) # Descomenta esto si quieres ver la consola como SMTP::DEBUG_SERVER

            server.starttls()  # PHPMailer::ENCRYPTION_STARTTLS
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg, from_addr=self.from_email, to_addrs=destinatarios)
            server.quit()

            logger.info(" Correo enviado exitosamente.")
            return True
        except Exception as e:
            logger.error(f" Error crítico al enviar correo: {e}")
            return False
