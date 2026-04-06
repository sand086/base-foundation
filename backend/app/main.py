from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. Importamos los routers directamente de sus dominios (Módulos)
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.clients.router import router as clients_router
from app.modules.fleet.router import router as fleet_router
from app.modules.logistics.router import router as logistics_router
from app.modules.finance.router import router as finance_router
from app.modules.suppliers.router import router as suppliers_router
from app.modules.maintenance.router import router as maintenance_router
from app.modules.monitoring.router import router as monitoring_router

# 🔌 2. Importamos los routers de Integraciones Externas
from app.integrations.sat.router import router as sat_router

app = FastAPI(title="TMS Backend FSD")

# Configuración de CORS, etc...
app.add_middleware(CORSMiddleware, ...)

# 🔌 3. "Enchufamos" los dominios a la App principal
# Seguridad y Usuarios
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")

# Catálogos y Clientes
app.include_router(clients_router, prefix="/clients")

# Operación Core
app.include_router(fleet_router, prefix="/fleet")  # Units, Operators, Tires, Fuel
app.include_router(logistics_router, prefix="/logistics")  # Trips, Tolls

# Finanzas
app.include_router(finance_router, prefix="/finance")  # Receivables, Tesorería
app.include_router(suppliers_router, prefix="/suppliers")  # Payables

# Mantenimiento y Monitoreo
app.include_router(maintenance_router, prefix="/maintenance")
app.include_router(monitoring_router, prefix="/monitoring")

# Integraciones
app.include_router(sat_router, prefix="/sat")
