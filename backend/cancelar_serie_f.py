from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging

# Ajusta estas importaciones a la ruta real de tu proyecto
from app.models import ReceivableInvoice, InvoiceStatus

# Configuración básica de logs para que veas qué pasa en la consola
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ejecutar_limpieza_facturas_a_peso(db: Session, pac_service):
    """
    Script para cancelar facturas de a peso rezagadas ante el PAC y actualizar la BD.
    pac_service: Instancia de tu clase o cliente que se comunica con el PAC.
    """

    uuids_a_cancelar = [
        "D1265D4D-1FBA-4AB6-A598-532690D31EA8",
        "2E9C5835-81F8-4F60-A5A3-9451A210C2A6",
        "B94D92E2-10E6-4F4E-B82E-59AA42B45301",
        "D7B0E9A7-F4C4-4475-9C23-F9C3942C5427",
        "94AFEDDB-575A-4962-BB5A-7B1A172E5EDA",
        "86CBBCD5-61A4-432E-88EA-1CDF41157714",
        "8B7F47C7-8271-4B9F-B87E-34F7A416C8C2",
        "BA8FDBC2-715D-4489-92DA-1711FD35997A",
        "F5678ADD-F1C0-439E-95A9-35F0BB2A9D88",
        "80F4431B-176B-42D8-B099-3BBC49EFB9EB",
        "A7F6A479-C8D2-4DFE-A112-A51D6856EA4B",
        "68C29111-598D-44C6-B621-4FC204B2F2BE",
        "8DCA8F7F-FAD8-4881-8E88-3A5DBBEAA04B",
        "079A64FA-22E2-4C95-A0B3-1348E770310F",
        "D48E6CB2-029D-4170-95ED-6C623303E243",
        "C7631815-B11B-4498-B54F-8346D6100FE5",
        "087D3D40-E9D7-47EF-AA3A-0DC81FE782FD",
        "ECD2409A-9214-489A-9E93-A262B6EB5C63",
        "88A0965A-5ED2-4A4C-B326-72D0BA045598",
        "56DC94AC-3FF7-4F6C-A35B-FF961F8391E1",
        "5336ED63-E2C8-4C6A-A970-E0A61265B49D",
        "500D7E5D-B4D8-456F-B457-46B41165733E",
        "44DE87D3-34D2-475F-ACD7-2EA6A8A8F618",
        "25702E9F-A2A7-44E4-B1F8-A37859070036",
        "1A665DEB-7796-4155-A9C9-FE19C833068D",
        "515AA91C-1A46-4F47-810D-2BB59B40480D",
        "7A0A656C-2BA7-46CE-B626-F2BEDAB35576",
        "A5C972CC-0188-4D28-A445-8B8B9393331D",
        "71AF703B-9936-459E-BE72-021D5D659A86",
        "A49D121F-90FD-491D-94C1-4B42C09F4EC7",
        "70780AC6-2B5E-42B4-80C1-93C2715C1D4E",
        "3BB0F311-CAA0-411C-AA94-81DA65C24D9B",
        "3CBCBCA8-AEE5-48E6-AC9C-879A8D06A05A",
        "A82ECBAB-3BD4-4E85-AFD1-273A8BB34B64",
        "77FC0780-00A9-477F-B685-A4F1971308C5",
        "7D9DB2B8-953B-43BE-A933-7B7F008601C2",
        "BC6CC157-C3FD-4240-884F-EB7F055A6A63",
        "84D410C5-F825-4990-B2B5-38E73FB75214",
    ]

    logger.info("Buscando facturas en la base de datos...")

    # 1. Traer facturas usando el Candado de Seguridad Extremo (monto <= 2.00)
    facturas = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.uuid.in_(uuids_a_cancelar),
            ReceivableInvoice.estatus != InvoiceStatus.CANCELADO,
            ReceivableInvoice.monto_total <= 2.00,
        )
        .all()
    )

    if not facturas:
        logger.info("No se encontraron facturas pendientes de a peso con esos UUIDs.")
        return

    exitosos = 0
    errores = 0

    # 2. Iterar cada factura y mandar a cancelar
    for factura in facturas:
        try:
            logger.info(f"Procesando cancelación ante PAC para UUID: {factura.uuid}")

            # --- LLAMADA AL PAC ---
            # Reemplaza 'cancelar_cfdi' por el nombre del método real que uses en tu sistema.
            # Motivo 02 = "Comprobante emitido con errores sin relación"
            respuesta_pac = pac_service.cancelar_cfdi(uuid=factura.uuid, motivo="02")

            # 3. Si el PAC no dio error, actualizamos la base de datos
            factura.estatus = InvoiceStatus.CANCELADO
            factura.fecha_cancelacion = datetime.now(timezone.utc)
            factura.motivo_cancelacion = "02"

            # Agregamos la nota personalizada que pediste
            factura.detalle_sat = "Cancelación manual por tiempo"

            exitosos += 1

        except Exception as e:
            # Si el PAC falla, cachamos el error, no actualizamos la BD y seguimos con la siguiente
            logger.error(f"Fallo al cancelar UUID {factura.uuid}: {str(e)}")
            factura.detalle_sat = f"Error en intento de cancelación manual: {str(e)}"
            factura.intentos_cancelacion += 1
            errores += 1

    # 4. Confirmar todos los cambios en la base de datos
    try:
        db.commit()
        logger.info(f"PROCESO TERMINADO | Exitosas: {exitosos} | Fallidas: {errores}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error catastrófico al guardar en la BD: {str(e)}")
