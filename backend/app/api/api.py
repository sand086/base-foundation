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
    dashboard,
    notifications,
    terminals,
    catalogs,
)

api_router = APIRouter()

# --- SEGURIDAD Y USUARIOS ---
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])

# --- OPERACIÓN ---
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(units.router, prefix="/units", tags=["Unidades"])
api_router.include_router(operators.router, prefix="/operators", tags=["Operadores"])
api_router.include_router(trips.router, prefix="/trips", tags=["Viajes"])

# --- FINANZAS  ---
api_router.include_router(
    suppliers.router, prefix="/finance", tags=["Proveedores y CXP"]
)
api_router.include_router(finance.router, prefix="/finance", tags=["Finanzas"])

# --- RECEIVABLES ---
api_router.include_router(
    receivables.router, prefix="/receivables", tags=["Cuentas por Cobrar"]
)

# --- MANTENIMIENTO ---
api_router.include_router(
    maintenance.router, prefix="/maintenance", tags=["Mantenimiento"]
)

# --- LLANTAS, TARIFAS, GASOLINA ---
api_router.include_router(tires.router, prefix="/tires", tags=["Llantas"])
api_router.include_router(tolls.router, prefix="/tolls", tags=["Tarifas y Casetas"])
api_router.include_router(fuel.router, prefix="/fuel", tags=["Gasolina"])

# --- CATÁLOGOS  ---
api_router.include_router(
    catalogs_sat.router, prefix="/catalogs-sat", tags=["Catalogs SAT"]
)
api_router.include_router(
    catalogs.router, prefix="/catalogs", tags=["Catálogos Generales"]
)

# --- MARCAS ---
api_router.include_router(brands.router, tags=["Marcas"])
api_router.include_router(terminals.router, tags=["Terminales"])

# --- DASHBOARD Y NOTIFICACIONES ---
api_router.include_router(notifications.router, tags=["Notificaciones"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
