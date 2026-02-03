from fastapi import APIRouter
from app.api.endpoints import auth, clients, fleet, operations, finance, users

api_router = APIRouter()

# Aquí conectamos cada módulo con su prefijo
api_router.include_router(auth.router)  # El auth que arreglamos antes
api_router.include_router(clients.router, tags=["Clientes"])
api_router.include_router(fleet.router, tags=["Flota"])
api_router.include_router(operations.router, tags=["Operaciones"])
api_router.include_router(finance.router, tags=["Finanzas"])
api_router.include_router(users.router, tags=["Usuarios"])
