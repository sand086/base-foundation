import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from app.models.models import EmailTemplate, Trip, SystemConfig

# Configuración de logs
logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        # Configuración SMTP
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_user = "myereportes@gmail.com"
        self.smtp_pass = "rdekcsuljhszykxy"
        self.from_email = "myereportes@gmail.com"
        self.from_name = "Rápidos 3T | Sistema de Rastreo"

    def send_status_update(
        self,
        trip: Trip,
        status: str,
        location: str,
        event_time: str,
        comentario: str = "Sin comentarios adicionales",
    ):
        """
        Envía un correo con diseño SaaS/Bento UI usando el LOGO OFICIAL de la BD.
        Usa CCO para enviar copia oculta y deduplica correos repetidos (TO > CC > BCC).
        """
        # 1. Definir Destinatario Principal (El Cliente) y Ocultos
        correo_cliente = (
            trip.client.email
            if trip.client and trip.client.email
            else "desarrolloSoft@asicomsystems.com.mx"
        )

        raw_to = [correo_cliente]
        raw_cc = []  # Vacío por ahora, pero listo por si lo necesitas a futuro
        raw_bcc = ["desarrolloSoft@asicomsystems.com.mx"]

        # 2. LÓGICA DE DEDUPLICACIÓN (Regla de oro: TO > CC > BCC)
        # dict.fromkeys() elimina duplicados dentro de la misma lista manteniendo el orden.
        final_to = list(dict.fromkeys(raw_to))

        # Filtramos CC: Solo se quedan los que NO estén ya en TO
        final_cc = [
            email for email in list(dict.fromkeys(raw_cc)) if email not in final_to
        ]

        # Filtramos BCC: Solo se quedan los que NO estén en TO ni en CC
        final_bcc = [
            email
            for email in list(dict.fromkeys(raw_bcc))
            if email not in final_to and email not in final_cc
        ]

        # La lista total de destinatarios para el servidor SMTP (La que ejecuta el envío real)
        destinatarios_totales = final_to + final_cc + final_bcc

        if not destinatarios_totales:
            logger.warning("No hay destinatarios válidos para enviar el correo.")
            return False

        # 3. Buscar Plantilla y Logo en BD
        template = self.db.query(EmailTemplate).filter_by(codigo="TPL-001").first()
        if not template:
            logger.error(
                "Error: No se encontró la plantilla TPL-001 para el envío de tracking."
            )
            return False

        #   EXTRAEMOS EL LOGO OFICIAL EN BASE64 DESDE LA TABLA SYSTEM_CONFIGS
        logo_config = self.db.query(SystemConfig).filter_by(key="empresa_logo").first()
        empresa_logo = logo_config.value if logo_config and logo_config.value else ""

        # 4. Preparar variables y Formateo
        folio = str(trip.public_id or trip.id)
        cliente_nombre = trip.client.razon_social if trip.client else "Cliente"
        estatus_formateado = status.replace("_", " ").upper()
        referencia = trip.referencia if trip.referencia else "N/A"

        # Corrección: Extraer los datos reales en inglés del modelo Trip
        origen = trip.origin if trip.origin else "N/A"
        destino = trip.destination if trip.destination else "N/A"

        # Corrección: Manejo de los contenedores (Soporte para viajes FULL)
        contenedor = trip.contenedor_1 if trip.contenedor_1 else "Sin asignar"
        if trip.contenedor_2:
            contenedor += f" / {trip.contenedor_2}"

        # Corrección: Extraer unidad y operador del primer tramo (TripLeg)
        operador = "Sin asignar"
        unidad = "Sin asignar"

        if trip.legs:
            # Filtramos para buscar exactamente la Fase 2 (Carretera)
            tramo_carretera = next(
                (leg for leg in trip.legs if leg.leg_type == "ruta_carretera"), None
            )

            # Fallback seguro: Si no hay fase de carretera aún, tomamos el último tramo creado
            if not tramo_carretera:
                # O si quieres forzar la posición 1 (Array 1):
                # tramo_carretera = trip.legs[1] if len(trip.legs) > 1 else trip.legs[0]
                tramo_carretera = trip.legs[-1]

            if tramo_carretera.operator:
                operador = tramo_carretera.operator.name
            if tramo_carretera.unit:
                unidad = tramo_carretera.unit.numero_economico

        # 5. Construcción del HTML con Estilo "Bento/SaaS" y el LOGO
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
                        <img src="{empresa_logo}" alt="Logotipo Rápidos 3T" style="max-width: 220px; height: auto;">
                    </div>

                    <div style="padding: 0 40px 40px 40px;">
                        <h2 style="color: #0f172a; font-size: 22px; margin-bottom: 10px;">¡Hola, {cliente_nombre}!</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Tu embarque presenta una nueva actualización reportada por nuestro centro de monitoreo:</p>
                        
                        <div style="display: inline-block; background-color: #be0811; color: #ffffff; padding: 6px 16px; border-radius: 50px; font-weight: 800; font-size: 11px; margin-bottom: 25px;">
                            {estatus_formateado}
                        </div>

                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #be0811;">
                            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Número de Servicio / Referencia</span>
                            <span style="color: #0f172a; font-size: 16px; font-weight: 700;">#{folio}</span>
                            <span style="color: #475569; font-size: 12px; margin-left: 10px;">Ref: {referencia}</span>
                        </div>

                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #be0811;">
                            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Ruta (Origen ➔ Destino)</span>
                            <span style="color: #0f172a; font-size: 14px; font-weight: 700;">{origen} ➔ {destino}</span>
                        </div>

                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #be0811;">
                            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Datos de Operación</span>
                            <div style="font-size: 13px; color: #0f172a; margin-top: 5px; line-height: 1.5;">
                                <strong>Unidad:</strong> {unidad} <br>
                                <strong>Contenedor:</strong> {contenedor} <br>
                                <strong>Operador:</strong> {operador}
                            </div>
                        </div>

                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #be0811;">
                            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Ubicación Reportada</span>
                            <span style="color: #0f172a; font-size: 14px; font-weight: 700;">{location}</span>
                            <br>
                            <span style="color: #64748b; font-size: 11px;">{event_time}</span>
                        </div>

                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 25px; border-left: 4px solid #be0811;">
                            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Estatus Final / Comentarios</span>
                            <span style="color: #475569; font-size: 13px; font-style: italic;">{comentario}</span>
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

        # 6. Armar el objeto MIME
        msg = MIMEMultipart("related")
        msg["From"] = f"{self.from_name} <{self.from_email}>"

        # Asignamos las cabeceras unidas por comas para los clientes de correo
        msg["To"] = ", ".join(final_to)

        # Solo agregamos la cabecera CC si realmente quedaron correos
        if final_cc:
            msg["Cc"] = ", ".join(final_cc)

        msg["Subject"] = template.asunto.replace("[SERVICIO_ID]", folio)

        msg.attach(MIMEText(html_content, "html"))

        # 7. Envío Real por SMTP
        try:
            logger.info(
                f"Iniciando envío de tracking a TO: {final_to} | CC: {final_cc} | BCC: {final_bcc}"
            )
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)

            # Mandamos a la lista completa por el ruteo interno del servidor usando destinatarios_totales
            server.send_message(
                msg, from_addr=self.from_email, to_addrs=destinatarios_totales
            )

            server.quit()
            logger.info(
                "Correo SaaS de Tracking enviado exitosamente con LOGO OFICIAL y deduplicación."
            )
            return True
        except Exception as e:
            logger.error(f"Error crítico en EmailService: {str(e)}")
            return False
