from fastapi import APIRouter

# Importamos los módulos nuevos y eliminamos los viejos (fleet, operations)
from app.api.endpoints import auth, users, clients, units, operators, trips, finance

api_router = APIRouter()

# Seguridad y Usuarios
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, tags=["Usuarios"])

# Operación Principal
api_router.include_router(clients.router, tags=["Clientes"])
api_router.include_router(units.router, tags=["Unidades"])
api_router.include_router(operators.router, tags=["Operadores"])
api_router.include_router(trips.router, tags=["Viajes"])

# Finanzas
api_router.include_router(finance.router, tags=["Finanzas"])
