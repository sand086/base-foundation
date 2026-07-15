import sys
import os

# Asegurar que Python detecte la carpeta 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService
from sqlalchemy.orm.attributes import flag_modified


def fix_and_stamp():
    db = SessionLocal()
    try:
        # 1. Buscar la factura
        factura = (
            db.query(ReceivableInvoice).filter(ReceivableInvoice.id == 756).first()
        )

        if not factura:
            print("❌ No se encontró la factura 756.")
            return

        print(f"✅ Factura {factura.folio_interno} encontrada.")

        # 2. Corregir el JSON de los conceptos
        conceptos = factura.conceptos_detalle
        modificado = False

        for concepto in conceptos:
            if concepto.get("claveProdServ") == "78121605":
                print(
                    f"🔄 Cambiando clave de {concepto.get('descripcion')} a 78101802..."
                )
                concepto["claveProdServ"] = "78101802"
                modificado = True

        if modificado:
            # Reasignamos y marcamos como modificado para que SQLAlchemy guarde el JSONB
            factura.conceptos_detalle = conceptos
            flag_modified(factura, "conceptos_detalle")

            # Limpiamos el error viejo
            factura.detalle_sat = "Clave SAT corregida por código. Reintentando..."
            db.commit()
            print("💾 Base de datos actualizada correctamente.")

            # 3. Mandar a Timbrar
            print("🚀 Enviando a timbrar al SAT...")
            billing_service = BillingService(db)
            resultado = billing_service.timbrar_factura_existente(756)

            print(f"🎉 ¡ÉXITO! La factura se timbró correctamente.")
            print(f"📄 UUID Fiscal: {resultado.uuid}")
            print(f"🔗 Puedes descargar el PDF en: {resultado.pdf_url}")

        else:
            print(
                "⚠️ No se encontró la clave errónea en los conceptos. ¿Ya se había corregido?"
            )

    except Exception as e:
        db.rollback()
        print(f"❌ Ocurrió un error al intentar timbrar: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    fix_and_stamp()
