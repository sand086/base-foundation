import sys
import os
from zeep import Client

# Lista de WSDLs oficiales de Solución Factible
WSDLS_SOLUCION_FACTIBLE = [
    "https://solucionfactible.com/ws/services/Cancelacion?wsdl",
    "https://solucionfactible.com/ws/services/CFDI?wsdl",
    "https://solucionfactible.com/ws/services/Timbrado?wsdl",
]


def probar_wsdls():
    print("=" * 70)
    print("🔍 ESCANEO DE WSDLS DE SOLUCIÓN FACTIBLE")
    print("=" * 70)

    for wsdl_url in WSDLS_SOLUCION_FACTIBLE:
        print(f"\n📡 Probando conexión a: {wsdl_url}")
        try:
            client = Client(wsdl_url)
            print("   ✅ Conexión SOAP Exitosa!")
            print("   📋 Funciones encontradas:")

            operaciones = set()
            for service_obj in client.wsdl.services.values():
                for port_obj in service_obj.ports.values():
                    for op_name in port_obj.binding._operations.keys():
                        operaciones.add(op_name)

            for op in sorted(operaciones):
                print(f"      🔹 {op}")

        except Exception as e:
            print(f"   ❌ No se pudo conectar: {e}")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    probar_wsdls()
