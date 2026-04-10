# C:\xampp\htdocs\github\base-foundation\backend\test_schemas.py

import httpx
import sys


def verificar_schemas():
    print("\n" + "=" * 60)
    print("🚀 INICIANDO AUDITORÍA MASIVA DE SCHEMAS VS MODELS 🚀")
    print("=" * 60 + "\n")

    # TOKEN PROPORCIONADO POR EL USUARIO
    TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzc1NjIxODE4LCJ0eXBlIjoiYWNjZXNzIn0.wBXEo9oGIL1OJLlXtXnfC-x6j8ZHYnQ9TEmV4jgguto"
    headers = {"Authorization": f"Bearer {TOKEN}"}

    # URL BASE DE TU SERVIDOR CORRIENDO LOCALMENTE
    BASE_URL = "http://localhost:8000"

    # RUTAS BASADAS EN TUS MÓDULOS
    rutas_a_probar = [
        # Auth & Users
        "/api/auth",
        "/api/auth/roles",
        "/api/auth/audit-logs",
        # Clients
        "/api/clients",
        # Fleet
        "/api/fleet/units",
        "/api/fleet/operators",
        "/api/fleet/tires",
        # Maintenance
        "/api/maintenance/mechanics",
        "/api/maintenance/work-orders",
        # Suppliers
        "/api/suppliers",
        # Settings / Catalogs
        "/api/catalogs/terminals",
        "/api/sat/sat-products",
        # Dashboard
        "/api/dashboard/stats?start_date=2024-01-01&end_date=2024-12-31",
    ]

    errores = []

    try:
        # Usamos un Timeout alto por si alguna consulta es pesada
        with httpx.Client(base_url=BASE_URL, headers=headers, timeout=15.0) as client:
            for ruta in rutas_a_probar:
                try:
                    response = client.get(ruta)

                    if response.status_code == 500:
                        try:
                            error_detail = response.json()
                        except:
                            error_detail = response.text

                        errores.append(
                            f"❌ Error 500 en {ruta}\n   Detalle Pydantic: {error_detail}\n"
                        )
                        print(f"❌ FALLÓ: {ruta}")

                    elif response.status_code == 401:
                        print(
                            f"⚠️ TOKEN INVÁLIDO para: {ruta} (Revisa que tu token no haya expirado)"
                        )
                    elif response.status_code == 403:
                        print(f" PERMISO DENEGADO para: {ruta}")
                    elif response.status_code == 404:
                        print(
                            f"👻 NO ENCONTRADO: {ruta} (Puede que la ruta exacta sea distinta)"
                        )
                    else:
                        print(f"✅ OK ({response.status_code}): {ruta}")

                except httpx.RequestError as exc:
                    print(f"💥 ERROR DE PETICIÓN en {ruta}: {exc}")
                    errores.append(f"💥 ERROR DE Petición en {ruta}: {exc}\n")

    except httpx.ConnectError:
        print("\n💥 ERROR CRÍTICO: No se pudo conectar a http://localhost:8000")
        print(
            " ASEGÚRATE de tener otra consola abierta corriendo: python -m uvicorn app.main:app --reload"
        )
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 ERROR INESPERADO: {str(e)}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" RESULTADOS FINALES ")
    print("=" * 60)

    if errores:
        for error in errores:
            print(error)
        print(
            " Tienes desajustes entre tus Models y Schemas. Busca el campo que dice 'missing' o 'Field required' en el detalle."
        )
    else:
        print(
            "🎉 ¡PERFECTO! Todas las rutas fueron probadas y no hubo ningún Error 500."
        )
        print(
            "Tus Schemas de Pydantic y tus Models de SQLAlchemy coinciden exactamente."
        )
    print("=" * 60 + "\n")


if __name__ == "__main__":
    verificar_schemas()
