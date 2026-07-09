import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
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

            # Mandamos a la lista completa por el ruteo interno del servidor
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

    def send_cfdi_email(
        self,
        correo_cliente: str,
        cliente_nombre: str,
        folio_interno: str,
        uuid: str,
        xml_path: str,
        pdf_path: str,
        tipo_documento: str = "Complemento de Pago"
    ):
        """
        Envía Facturas o Complementos de Pago al cliente con sus adjuntos (XML y PDF).
        CANDADO APLICADO: Evita enviar el mismo UUID dos veces.
        """
        if not uuid or uuid == "PENDIENTE_SAT":
            logger.warning(f"Abortando envío: El documento {folio_interno} no tiene un UUID válido.")
            return False

        # =========================================================================
        #  CANDADO BÓVEDA: VERIFICACIÓN DE UUID YA ENVIADO
        # =========================================================================
        # Ruta dinámica asegurando que esté en la raíz del proyecto (donde se ejecuta)
        base_path = Path(os.getenv("APP_BASE_PATH", Path(__file__).resolve().parents[3]))
        lock_file = base_path / "storage" / "correos_enviados_uuid.log"
        
        # Asegurar que el directorio exista
        os.makedirs(os.path.dirname(lock_file), exist_ok=True)

        try:
            if os.path.exists(lock_file):
                with open(lock_file, "r") as f:
                    enviados = f.read().splitlines()
                    if uuid in enviados:
                        logger.info(
                            f"🛡️ CANDADO ACTIVO: El UUID {uuid} ({folio_interno}) ya fue enviado anteriormente. "
                            "Abortando envío duplicado silenciosamente."
                        )
                        return True  # Finge éxito para no romper el flujo de la aplicación
        except Exception as e:
            logger.error(f"Error al verificar el candado de correos: {e}")

        if not correo_cliente:
            logger.warning("No hay correo de cliente para enviar el CFDI.")
            return False

        # =========================================================================
        #  PREPARACIÓN Y ENVÍO DEL CORREO DE FACTURACIÓN
        # =========================================================================
        msg = MIMEMultipart("mixed")
        msg["From"] = f"Rápidos 3T | Facturación <{self.from_email}>"
        msg["To"] = correo_cliente
        msg["Subject"] = f"Rápidos 3T - Su {tipo_documento} {folio_interno} ha sido generado"

        # Cuerpo del correo
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 2px;">RÁPIDOS 3T</h1>
                    <p style="color: #94a3b8; font-size: 11px; margin-top: 5px;">DEPARTAMENTO DE FACTURACIÓN Y COBRANZA</p>
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 15px;">Estimado(a) {cliente_nombre},</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                        Adjunto a este correo encontrará los archivos XML y PDF correspondientes a su <strong>{tipo_documento}</strong> con el folio interno <strong>{folio_interno}</strong>.
                    </p>
                    <div style="background-color: #f1f5f9; border-left: 4px solid #be0811; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                        <span style="display: block; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Folio Fiscal (UUID)</span>
                        <span style="color: #0f172a; font-size: 14px; font-weight: 600;">{uuid}</span>
                    </div>
                    <p style="color: #475569; font-size: 14px; margin-top: 30px;">
                        Agradecemos su preferencia y nos reiteramos a sus apreciables órdenes.<br>
                        <strong>El Equipo de Rápidos 3T</strong>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        body = MIMEMultipart("alternative")
        body.attach(MIMEText(html_content, "html"))
        msg.attach(body)

        # Adjuntar XML de forma segura
        if os.path.exists(xml_path):
            with open(xml_path, "rb") as f:
                xml_attachment = MIMEApplication(f.read(), _subtype="xml")
                xml_attachment.add_header("Content-Disposition", "attachment", filename=os.path.basename(xml_path))
                msg.attach(xml_attachment)
        else:
            logger.warning(f"No se encontró el archivo XML en la ruta: {xml_path}")
        
        # Adjuntar PDF de forma segura
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                pdf_attachment = MIMEApplication(f.read(), _subtype="pdf")
                pdf_attachment.add_header("Content-Disposition", "attachment", filename=os.path.basename(pdf_path))
                msg.attach(pdf_attachment)
        else:
            logger.warning(f"No se encontró el archivo PDF en la ruta: {pdf_path}")

        # Ejecución del envío
        try:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg, from_addr=self.from_email, to_addrs=[correo_cliente])
            server.quit()
            
            # =========================================================================
            #  REGISTRAR UUID COMO ENVIADO EXITOSAMENTE
            # =========================================================================
            try:
                with open(lock_file, "a") as f:
                    f.write(f"{uuid}\n")
            except Exception as file_e:
                logger.error(f"Fallo al escribir en el log de correos enviados: {file_e}")

            logger.info(f"✅ Correo de {tipo_documento} enviado exitosamente a {correo_cliente} (UUID: {uuid})")
            return True
        except Exception as e:
            logger.error(f"❌ Error enviando correo de CFDI: {str(e)}")
            return False