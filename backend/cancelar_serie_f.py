import sys
import os
import logging
from datetime import datetime, timezone

# 1. Aseguramos que los imports del backend funcionen
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.models.models import ReceivableInvoice, InvoiceStatus
    from app.db.database import SessionLocal
    from app.integrations.sat.billing_service import BillingService
    from app.integrations.sat.soap_client import create_pac_client
except ImportError as e:
    print(f"Error de importación: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# LISTA EXACTA DE UUIDS
UUIDS_A_CANCELAR = [
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


def procesar_cancelaciones_sat_directo():
    db = SessionLocal()
    pac = BillingService(db)  # Usamos tu clase solo para cargar configuraciones

    # Cargar certificados CSD para firmar la orden
    try:
        with open(pac.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(pac.path_key, "rb") as f_key:
            key_bytes = f_key.read()
    except Exception as e:
        logger.error(f"Error cargando certificados CSD: {e}")
        return

    # Crear el cliente SOAP del PAC directo
    client_zeep = create_pac_client(pac.wsdl_timbrado, pac.history)

    exitosos = 0
    errores = 0

    try:
        # Quitamos la restricción de estatus para atraparlas todas
        facturas = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.uuid.in_(UUIDS_A_CANCELAR),
                ReceivableInvoice.fecha_emision <= "2026-07-10",
                ReceivableInvoice.monto_total <= 2.00,
            )
            .all()
        )

        logger.info(
            f"¡Se encontraron {len(facturas)} facturas basura para ejecutar en el SAT!"
        )

        for factura in facturas:
            logger.info(
                f"==> Analizando {factura.folio_interno} | UUID: {factura.uuid}"
            )

            # Buscar la Factura Chida del mismo viaje para pasarla como sustituto
            factura_chida = None
            if factura.viaje_id:
                factura_chida = (
                    db.query(ReceivableInvoice)
                    .filter(
                        ReceivableInvoice.viaje_id == factura.viaje_id,
                        ReceivableInvoice.monto_total > 2.00,
                        ReceivableInvoice.uuid != None,
                        ReceivableInvoice.estatus != "cancelado",
                    )
                    .first()
                )

            if factura_chida and factura_chida.uuid:
                motivo = "01"
                uuid_sustituto = factura_chida.uuid
                logger.info(
                    f"    - Factura Chida encontrada: {factura_chida.folio_interno} ({uuid_sustituto}). Usando Motivo 01."
                )
            else:
                motivo = "02"
                uuid_sustituto = ""
                logger.info(f"    - No hay factura chida. Usando Motivo 02.")

            # FORMATO ESTRICTO DEL PAC: "UUID|Motivo|UuidSustitucion"
            uuid_formateado_sat = f"{factura.uuid.strip()}|{motivo}|{uuid_sustituto.strip() if uuid_sustituto else ''}"

            try:
                # Llamamos a Solución Factible saltando la "Auto-Corrección"
                resultado = client_zeep.service.cancelar(
                    usuario=pac.pac_user,
                    password=pac.pac_pass,
                    uuids=[uuid_formateado_sat],
                    derCertCSD=cer_bytes,
                    derKeyCSD=key_bytes,
                    contrasenaCSD=pac.key_password,
                )

                if int(getattr(resultado, "status", 0)) not in [200, 201, 202]:
                    raise Exception(f"Rechazo PAC: {resultado.mensaje}")

                res_sat = resultado.resultados[0]
                codigo_sat = int(getattr(res_sat, "status", 0))
                mensaje_sat = str(getattr(res_sat, "mensaje", "")).lower()

                # Si el SAT responde bien (201 en proceso, 202 cancelado previo)
                if (
                    codigo_sat in [201, 202]
                    or "proceso" in mensaje_sat
                    or "previamente cancelado" in mensaje_sat
                ):
                    factura.estatus = "cancelado"
                    factura.status_sat = (
                        "CANCELADO" if codigo_sat == 202 else "PROCESO_CANCELACION"
                    )
                    factura.fecha_cancelacion = datetime.now(timezone.utc)
                    factura.motivo_cancelacion = motivo
                    factura.detalle_sat = f"Cancelación SAT Exitosa. Motivo: {motivo}"
                    db.commit()
                    exitosos += 1
                    logger.info(f"    ✅ SAT ACEPTÓ LA CANCELACIÓN: {mensaje_sat}")
                else:
                    raise Exception(f"Rechazo SAT ({codigo_sat}): {res_sat.mensaje}")

            except Exception as e:
                error_str = str(e).lower()
                if "tardado demasiado" in error_str or "500" in error_str:
                    logger.warning(f"    ⚠️ SAT LENTO. Forzando local...")
                    factura.estatus = "cancelado"
                    factura.status_sat = "PROCESO_CANCELACION"
                    factura.fecha_cancelacion = datetime.now(timezone.utc)
                    factura.motivo_cancelacion = motivo
                    factura.detalle_sat = (
                        "Forzada localmente. SAT devolvió Timeout (500)."
                    )
                    db.commit()
                    exitosos += 1
                else:
                    logger.error(f"    ❌ ERROR: {str(e)}")
                    errores += 1

        logger.info(
            f"--- RESUMEN FINAL: {exitosos} aceptadas por SAT/BD, {errores} errores ---"
        )

    except Exception as e:
        logger.error(f"Error crítico: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    procesar_cancelaciones_sat_directo()
