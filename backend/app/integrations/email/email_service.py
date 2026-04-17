import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from sqlalchemy.orm import Session
from app.models.models import EmailTemplate, Trip

# Configuración de logs
logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        # Configuración SMTP (Equivalente a tu PHPMailer)
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_user = "myereportes@gmail.com"
        self.smtp_pass = "rdekcsuljhszykxy"
        self.from_email = "myereportes@gmail.com"
        self.from_name = "Rápidos 3T | Sistema de Rastreo"

        # Ruta física del avatar (Robot)
        self.avatar_path = r"C:\xampp\htdocs\github\base-foundation\src\assets\img\usuarios\avatar3.png"

    def send_status_update(
        self, trip: Trip, status: str, location: str, event_time: str
    ):
        """
        Envía un correo con diseño SaaS/Bento UI y el avatar del robot incrustado.
        """
        # 1. Definir Destinatarios
        to_email = (
            trip.client.email
            if trip.client and trip.client.email
            else "gerencia@3t.com.mx"
        )
        cc_emails = ["desarrolloSoft@asicomsystems.com.mx", "trafico2@3t.com.mx"]
        destinatarios = [to_email] + cc_emails

        # 2. Buscar Plantilla en BD
        template = self.db.query(EmailTemplate).filter_by(codigo="TPL-001").first()
        if not template:
            logger.error(
                "Error: No se encontró la plantilla TPL-001 para el envío de tracking."
            )
            return False

        # 3. Preparar variables y Formateo
        folio = str(trip.public_id or trip.id)
        cliente_nombre = trip.client.razon_social if trip.client else "Cliente"
        estatus_formateado = status.replace("_", " ").upper()

        # 4. Construcción del HTML con Estilo "Bento/SaaS" (Esencia de tu CSS)
        # Usamos estilos en línea (inline) porque los clientes de correo ignoran archivos .css externos
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
            <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                
                <div style="background-color: #0f172a; padding: 25px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 3px; font-weight: 800;">RÁPIDOS 3T</h1>
                    <p style="color: #64748b; margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase;">Intelligent Logistics System</p>
                </div>

                <div style="text-align: center; padding: 30px 20px; background: linear-gradient(180deg, #0f172a 0%, #ffffff 100%);">
                    <img src="cid:robot_avatar" alt="Asistente 3T" style="width: 130px; height: 130px; border-radius: 50%; border: 5px solid #ffffff; box-shadow: 0 10px 15px rgba(0,0,0,0.1);">
                </div>

                <div style="padding: 0 40px 40px 40px;">
                    <h2 style="color: #0f172a; font-size: 22px; margin-bottom: 10px;">¡Hola, {cliente_nombre}!</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Tu embarque presenta una nueva actualización reportada por nuestro centro de monitoreo:</p>
                    
                    <div style="display: inline-block; background-color: #be0811; color: #ffffff; padding: 6px 16px; border-radius: 50px; font-weight: 800; font-size: 11px; margin-bottom: 25px;">
                        {estatus_formateado}
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #be0811;">
                        <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Número de Servicio</span>
                        <span style="color: #0f172a; font-size: 16px; font-weight: 700;">#{folio}</span>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #be0811;">
                        <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Ubicación Reportada</span>
                        <span style="color: #0f172a; font-size: 16px; font-weight: 700;">{location}</span>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 25px; border-left: 4px solid #be0811;">
                        <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Fecha y Hora de Sistema</span>
                        <span style="color: #0f172a; font-size: 16px; font-weight: 700;">{event_time}</span>
                    </div>

                    <p style="color: #94a3b8; font-size: 12px; font-style: italic; text-align: center;">
                        "Llevamos tu confianza por todo México."
                    </p>
                </div>

                <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                        Este es un mensaje automático de <strong>Rápidos 3T TMS</strong>.<br>
                        Favor de no responder a esta dirección de correo.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        # 5. Armar el objeto MIMEMultipart ('related' para las imágenes)
        msg = MIMEMultipart("related")
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email
        msg["Cc"] = ", ".join(cc_emails)
        msg["Subject"] = template.asunto.replace("[SERVICIO_ID]", folio)

        # Adjuntar HTML
        msg.attach(MIMEText(html_content, "html"))

        # 6.  ADJUNTAR IMAGEN DEL ROBOT (CID)
        if os.path.exists(self.avatar_path):
            try:
                with open(self.avatar_path, "rb") as f:
                    img_data = f.read()

                img_robot = MIMEImage(img_data)
                # Este ID debe coincidir con el src="cid:robot_avatar" del HTML
                img_robot.add_header("Content-ID", "<robot_avatar>")
                img_robot.add_header(
                    "Content-Disposition", "inline", filename="robot.png"
                )
                msg.attach(img_robot)
            except Exception as img_err:
                logger.error(f"Error incrustando imagen del robot: {img_err}")
        else:
            logger.warning(f"No se encontró el avatar en la ruta: {self.avatar_path}")

        # 7. Envío Real por SMTP
        try:
            logger.info(f"Iniciando envío de tracking a {to_email}...")
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg, from_addr=self.from_email, to_addrs=destinatarios)
            server.quit()
            logger.info(" Correo SaaS de Tracking enviado exitosamente.")
            return True
        except Exception as e:
            logger.error(f" Error crítico en EmailService: {str(e)}")
            return False
