import sys
from pathlib import Path
from sqlalchemy import text
import inspect

# Configurar el entorno para heredar los módulos
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db


def localizar_y_reconstruir_com():
    db = next(get_db())
    uuid_target = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"

    print("\n" + "=" * 80)
    print("🔍 ESCANEANDO BASE DE DATOS PARA LOCALIZAR EL COMPLEMENTO DE PAGO (COM)")
    print("=" * 80)

    tabla_encontrada = None
    record_id = None

    # 1. Búsqueda universal: Escaneamos todas las tablas que tengan una columna 'uuid'
    try:
        query_tablas = text("""
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'uuid' AND table_schema = 'public'
        """)
        tablas = db.execute(query_tablas).fetchall()

        for t in tablas:
            t_name = t[0]
            try:
                query_search = text(f"SELECT id FROM {t_name} WHERE uuid = :uuid")
                res = db.execute(query_search, {"uuid": uuid_target}).fetchone()
                if res:
                    record_id = res[0]
                    tabla_encontrada = t_name
                    break
            except:
                continue
    except Exception as e:
        print(f"❌ Error durante el escaneo de tablas: {e}")

    if not tabla_encontrada:
        print("❌ No se encontró el UUID del pago en ninguna tabla del sistema.")
        db.close()
        return

    print(f"🎯 ¡Encontrado! Tabla: '{tabla_encontrada}' | ID del Registro: {record_id}")
    print("-" * 80)

    # 2. Invocar al motor correcto para fabricar el PDF
    try:
        if "payment" in tabla_encontrada or tabla_encontrada == "payments":
            print("🚀 Detectado como documento de Pago. Levantando PaymentService...")
            from app.integrations.sat.payment_service import PaymentService

            # Intentamos instanciar el servicio pasándole la sesión de la BD
            try:
                service = PaymentService(db)
            except:
                service = PaymentService()

            # Buscamos formas comunes en las que tu service genera el PDF por ID
            ejecutado = False
            metodos_a_probar = [
                "regenerar_pdf",
                "generar_pdf",
                "reconstruir_pdf_pago",
                "generar_pdf_pago",
            ]

            for metodo in metodos_a_probar:
                if hasattr(service, metodo):
                    print(f"⏳ Ejecutando service.{metodo}({record_id})...")
                    getattr(service, metodo)(record_id)
                    print(f"✅ PDF regenerado usando método público '{metodo}'.")
                    ejecutado = True
                    break

            # Si no hay método público directo con ID, usamos el método interno pasándole el objeto ORM
            if not ejecutado:
                from app.models import models

                model_class = None
                for name, obj in inspect.getmembers(models):
                    if (
                        inspect.isclass(obj)
                        and hasattr(obj, "__tablename__")
                        and obj.__tablename__ == tabla_encontrada
                    ):
                        model_class = obj
                        break

                if model_class:
                    pago_obj = (
                        db.query(model_class)
                        .filter(model_class.id == record_id)
                        .first()
                    )
                    if pago_obj:
                        print(
                            "⏳ Ejecutando el motor interno _generar_pdf_pago con el objeto..."
                        )
                        try:
                            service._generar_pdf_pago(pago_obj)
                            ejecutado = True
                        except:
                            service._generar_pdf_pago(pago_obj, db)
                            ejecutado = True
                        print("✅ PDF regenerado usando el método interno.")

            if ejecutado:
                print(
                    "\n🎉 ¡Éxito absoluto! El archivo PDF ha sido sembrado en el almacenamiento local."
                )
            else:
                print(
                    "⚠️ No pudimos ejecutar el disparador automático. Revisa los métodos de PaymentService."
                )

        else:
            # Caída de emergencia si resultaba estar en otra tabla de facturas
            print(
                "❗ Registro localizado en tabla de facturas estándar. Ejecutando api_billing..."
            )
            from app.integrations.sat.api_billing import reconstruir_pdf_factura

            reconstruir_pdf_factura(invoice_id=record_id, db=db)
            print("✅ PDF Factura reconstruido.")

    except Exception as e:
        print(f"❌ Error crítico durante la reconstrucción del PDF: {e}")
    finally:
        db.close()
        print("=" * 80 + "\n")


if __name__ == "__main__":
    localizar_y_reconstruir_com()
