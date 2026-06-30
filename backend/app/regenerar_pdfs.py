import os
import sys

# Asegurarnos de que Python reconozca la carpeta actual como base
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.integrations.sat.billing_service import BillingService


def arreglar_pdfs():
    db = SessionLocal()
    try:
        print(
            "⏳ Iniciando la regeneración masiva de PDFs. Esto puede tomar varios minutos..."
        )
        billing_svc = BillingService(db)

        resultados = billing_svc.regenerar_todos_los_pdfs()

        print("\n✅ PROCESO FINALIZADO:")
        print(f"   - Total procesadas: {resultados['total_encontradas']}")
        print(f"   - Exitosas: {resultados['exitosas']}")
        print(f"   - Con error: {resultados['con_error']}")

        # Si quieres ver qué facturas fallaron, puedes descomentar esto:
        if resultados["con_error"] > 0:
            for detalle in resultados["detalle"]:
                if "ERROR" in detalle["status"]:
                    print(f"Error en Factura ID {detalle['id']}: {detalle['status']}")

    except Exception as e:
        print(f"❌ Ocurrió un error crítico: {str(e)}")
    finally:
        db.close()
        print("🔌 Conexión a la base de datos cerrada.")


if __name__ == "__main__":
    arreglar_pdfs()
