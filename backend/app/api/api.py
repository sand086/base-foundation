from fastapi import APIRouter

# Importamos los módulos nuevos y eliminamos los viejos (fleet, operations)
from app.api.endpoints import (
    auth,
    users,
    clients,
    units,
    operators,
    trips,
    finance,
    tires,
    maintenance,
    suppliers,
    tolls,
    fuel,
    catalogs_sat,
    receivables,
    brands,
    terminals,
)

api_router = APIRouter()

# Seguridad y Usuarios
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

api_router.include_router(users.router, tags=["Usuarios"])

# Operación Principal
api_router.include_router(clients.router, tags=["Clients"])
api_router.include_router(units.router, tags=["Unidades"])
api_router.include_router(operators.router, tags=["Operadores"])
api_router.include_router(trips.router, tags=["Viajes"])

# Finanzas
api_router.include_router(finance.router, tags=["Finanzas"])
api_router.include_router(tires.router, tags=["Llantas"])
api_router.include_router(tolls.router, tags=["Tarifas y Casetas"])
api_router.include_router(fuel.router, tags=["Gasolina"])

api_router.include_router(
    maintenance.router, prefix="/maintenance", tags=["Mantenimiento"]
)


api_router.include_router(
    suppliers.router, prefix="/finance", tags=["Proveedores y CXP"]
)

api_router.include_router(catalogs_sat.router, prefix="/catalogs", tags=["Catalogs"])
api_router.include_router(receivables.router, tags=["Cuentas por Cobrar"])

api_router.include_router(brands.router, tags=["Marcas"])

api_router.include_router(terminals.router, tags=["Terminales"])
