import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno para heredar tu conexión y modelos
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db
from app.integrations.sat.payment_service import PaymentComplementService
from app.models import models


def generar_pago_perfecto():
    db = next(get_db())

    # Los datos exactos extraídos de tu auditoría, mapeando la Serie correcta
    facturas_data = [
        {"id": 331, "folio": "17665", "serie": "CP", "monto": 85120.00},
        {"id": 222, "folio": "17559", "serie": "CP", "monto": 72800.00},
        {"id": 115, "folio": "9762", "serie": "F", "monto": 3074.00},
        {"id": 108, "folio": "17444", "serie": "CP", "monto": 45920.00},
        {"id": 105, "folio": "17441", "serie": "CP", "monto": 45920.00},
        {"id": 87, "folio": "17424", "serie": "CP", "monto": 45920.00},
        {"id": 745, "folio": "17388", "serie": "CP", "monto": 44800.00},
    ]

    print("\n" + "=" * 80)
    print("🚀 GENERANDO NUEVO COMPLEMENTO DE PAGO DESDE CERO (VÍA PAC)")
    print("=" * 80)

    try:
        # 1. Asegurar que las series "F" y "CP" estén inyectadas en la BD
        # para que tu integrador las lea al armar el XML.
        print("🛠️ Alineando series F y CP en la base de datos...")
        for f in facturas_data:
            db.execute(
                text("UPDATE receivable_invoices SET serie = :serie WHERE id = :id"),
                {"serie": f["serie"], "id": f["id"]},
            )
        db.commit()
        print("   ✅ Series actualizadas correctamente en 'receivable_invoices'.")

        # 2. Obtener el client_id (Hansa Meyer) desde la primera factura
        factura_ejemplo = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == 331)
            .first()
        )
        if not factura_ejemplo:
            print("❌ No se encontró la factura base en la BD.")
            return

        client_id = factura_ejemplo.client_id

        # 3. Preparar el payload exacto para tu motor de pagos (Mismos montos del XML original)
        pagos_payload = [
            {"invoice_id": f["id"], "monto_pagado": f["monto"]} for f in facturas_data
        ]

        # 4. Instanciar el servicio nativo de tu sistema y timbrar
        print(
            "⏳ Conectando con el PAC para timbrar el nuevo Complemento de Pago (Parcialidad 1)..."
        )
        service = PaymentComplementService(db)

        resultado = service.registrar_pago_y_timbrar_complemento(
            client_id=client_id,
            pagos_data=pagos_payload,
            forma_pago="03",  # Transferencia electrónica de fondos
            fecha_pago="2026-06-30T12:00:00",
            referencia="Pago Liberado Hansa Meyer",
            cuenta_deposito="072905010014973631",  # Tu cuenta (Banorte)
            user_id=1,  # Usuario admin por defecto
        )

        print("\n🎉 ¡TIMBRADO EXITOSO!")
        nuevo_uuid = resultado.get("data", {}).get("uuid", "N/A")
        print(f"👉 Nuevo UUID Oficial: {nuevo_uuid}")
        print(
            "👉 Como borramos el historial antes, el SAT y tu sistema lo registraron con Parcialidad 1."
        )

    except Exception as e:
        db.rollback()
        import traceback

        print(f"\n❌ Error al timbrar el pago vía PAC: {e}")
        traceback.print_exc()

    finally:
        db.close()

    print("=" * 80 + "\n")


if __name__ == "__main__":
    generar_pago_perfecto()
