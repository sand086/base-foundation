import logging
from datetime import datetime
from sqlalchemy.orm import Session

try:
    from app.db.database import SessionLocal
except ImportError:
    from app.db.session import SessionLocal

from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService
from app.integrations.sat.soap_client import get_timbrado_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cancelacion_simultanea")


def ejecutar_cancelacion_simultanea():
    db: Session = SessionLocal()
    try:
        # IDs exactos de la BD
        id_nominal = 883
        id_comercial = 884

        logger.info("=========================================================")
        logger.info(f"1. PREPARANDO CANCELACIÓN SIMULTÁNEA")
        logger.info("=========================================================")

        nominal = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == id_nominal)
            .first()
        )
        comercial = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == id_comercial)
            .first()
        )

        if not nominal or not comercial:
            logger.error("❌ Error: No se encontraron las facturas en la BD.")
            return

        logger.info(f"• UUID Nominal: {nominal.uuid}")
        logger.info(f"• UUID Comercial: {comercial.uuid}")

        # Instanciamos el servicio (para reutilizar sus configuraciones de CSD)
        billing_service = BillingService(db)

        # Obtenemos las credenciales
        config = billing_service.configs["timbrado"]
        usuario = config["usuario"]
        password = config["password"]

        # Extraemos el CSD
        csd_base64, key_base64, csd_pass = billing_service._get_csd_credentials()

        # Construimos el payload especial para Solución Factible
        # Formato esperado: UUID1|Motivo1|UUIDSustituto1, UUID2|Motivo2|UUIDSustituto2...
        # Como usamos motivo 02, no enviamos UUID sustituto
        uuids_payload = f"{comercial.uuid}|02|,{nominal.uuid}|02|"

        logger.info(f"\n2. ENVIANDO PETICIÓN AL PAC CON EL PAYLOAD: {uuids_payload}")

        client = get_timbrado_client()

        # Llamada directa al método SOAP `cancelar`
        response = client.service.cancelar(
            usuario=usuario,
            password=password,
            uuids=uuids_payload,
            derCertCSD=csd_base64,
            derKeyCSD=key_base64,
            contrasenaCSD=csd_pass,
        )

        logger.info("\n3. PROCESANDO RESPUESTA DEL SAT:")

        # Validamos el estado general del PAC
        if response.status != 200:
            logger.error(
                f"❌ Error de autenticación o conexión con el PAC: {response.mensaje}"
            )
            return

        # Analizamos el resultado para CADA UUID (Solución Factible devuelve una lista en `resultados`)
        errores_detectados = False

        # Dependiendo de la librería Zeep, `resultados` puede ser una lista o un solo objeto
        resultados_list = (
            response.resultados
            if isinstance(response.resultados, list)
            else [response.resultados]
        )

        for res in resultados_list:
            if res.statusUUID in (201, 202):
                logger.info(
                    f"✅ ÉXITO: {res.uuid} -> {res.mensaje} (Status: {res.statusUUID})"
                )
            else:
                logger.error(
                    f"⚠️ PROBLEMA CON: {res.uuid} -> {res.mensaje} (Status: {res.statusUUID})"
                )
                errores_detectados = True

        # ---------------------------------------------------------
        # PASO 4: ACTUALIZACIÓN EN BD SÓLO SI NO HUBO ERRORES
        # ---------------------------------------------------------
        if not errores_detectados:
            logger.info("\n4. ACTUALIZANDO ESTATUS EN LA BASE DE DATOS...")
            fecha_canc = datetime.utcnow()

            comercial.status_sat = "CANCELADO"
            comercial.estatus = "cancelado"
            comercial.fecha_cancelacion = fecha_canc
            comercial.motivo_cancelacion = "02"
            comercial.detalle_sat = (
                "Cancelada simultáneamente con Carta Porte (Motivo 02)."
            )

            nominal.status_sat = "CANCELADO"
            nominal.estatus = "cancelado"
            nominal.fecha_cancelacion = fecha_canc
            nominal.motivo_cancelacion = "02"
            nominal.detalle_sat = (
                "Cancelada simultáneamente con la Comercial (Motivo 02)."
            )

            db.commit()

            logger.info("=========================================================")
            logger.info("🎉 ¡AMBAS FACTURAS FUERON CANCELADAS SIMULTÁNEAMENTE! 🎉")
            logger.info("=========================================================")
        else:
            logger.warning(
                "\n⚠️ SE DETECTARON ERRORES POR PARTE DEL SAT. NO SE ACTUALIZÓ LA BD LOCAL."
            )

    except Exception as e:
        logger.error(f"❌ Error crítico en ejecución: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar_cancelacion_simultanea()
