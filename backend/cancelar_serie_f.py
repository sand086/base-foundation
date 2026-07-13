import sys
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

# Importamos directamente el cliente del PAC y la configuración
# NOTA: Ajusta 'PACSoapClient' y 'cancelar_cfdi' a los nombres reales que usas en tu código
from app.integrations.sat.soap_client import PACSoapClient  #
from app.core.config import settings  # [cite: 2]

# =====================================================================
# DATOS EXTRAÍDOS DE LA IMAGEN SAT
# =====================================================================
UUID_A_CANCELAR = "58D2B363-1721-4E5E-8105-B42D56BD5EAA"
RFC_EMISOR = "RTX110624KP5"
RFC_RECEPTOR = "HMG980427Q42"
TOTAL = 44800.00
MOTIVO_SAT = "02"  # Errores sin relación
# =====================================================================


def cancelar_directo_pac():
    print("\n" + "=" * 80)
    print(f"🚀 INICIANDO CANCELACIÓN DIRECTA (SIN BD) DEL UUID: {UUID_A_CANCELAR}")
    print("=" * 80)

    try:
        # 1. Instanciamos el cliente del PAC sin involucrar la base de datos local
        # Pásale las credenciales que tu cliente necesite desde tu config.py[cite: 2]
        pac_client = PACSoapClient(
            usuario=settings.PAC_USER,
            password=settings.PAC_PASSWORD,
            entorno=settings.ENVIRONMENT,
        )

        print(f"\n⏳ Enviando orden de cancelación al SAT/PAC (Motivo {MOTIVO_SAT})...")

        # 2. Ejecutamos la cancelación directa
        # Para cancelar, el PAC siempre pide UUID, RFCs y a veces el Total
        respuesta = pac_client.cancelar_cfdi(
            uuid=UUID_A_CANCELAR,
            rfc_emisor=RFC_EMISOR,
            rfc_receptor=RFC_RECEPTOR,
            total=TOTAL,
            motivo=MOTIVO_SAT,
        )

        print("✅ ¡Orden de cancelación procesada por el PAC exitosamente!")
        print(f"📄 Respuesta cruda del PAC: {respuesta}")
        print("-" * 80)
        print("🚨 ATENCIÓN: Según el SAT, esta factura es 'Cancelable con aceptación'.")
        print(
            "🚨 El receptor (HANSA MEYER GLOBAL TRANSPORT) debe autorizarla en su buzón tributario."
        )
        print("-" * 80)

    except Exception as e:
        error_msg = str(e).lower()
        if (
            "ya se encuentra cancelado" in error_msg
            or "comprobante cancelado" in error_msg
        ):
            print("ℹ️ El SAT informa que esta factura YA ESTABA CANCELADA previamente.")
        else:
            print(f"❌ Error al contactar al SAT/PAC: {e}")


if __name__ == "__main__":
    cancelar_directo_pac()
