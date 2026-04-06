from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

#  1. Importación de Routers de Dominios (Módulos)
from app.modules.auth.router import router as auth_router
from app.modules.catalogs.router import router as catalogs_router
from app.modules.clients.router import router as clients_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.fleet.router import router as fleet_router
from app.modules.logistics.router import router as logistics_router
from app.modules.finance.router import router as finance_router
from app.modules.suppliers.router import router as suppliers_router
from app.modules.maintenance.router import router as maintenance_router
from app.modules.monitoring.router import router as monitoring_router

#  2. Importación de Routers de Integraciones Externas
# Nota: Asegúrate de haber creado un router.py en app/integrations/sat que unifique billing y catalogs_sat
from app.integrations.sat.router import router as sat_router

app = FastAPI(title="TMS Backend FSD")
api_router = APIRouter(prefix="/api")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica tus dominios reales
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  3. Registro de Rutas en el api_router (quitamos el .app)
# Seguridad y Usuarios (Users ahora es parte de Auth)
api_router.include_router(auth_router, prefix="/auth")

# Catálogos y Dashboard
api_router.include_router(catalogs_router, prefix="/catalogs")
api_router.include_router(dashboard_router, prefix="/dashboard")

# Clientes y Operación Core
api_router.include_router(clients_router, prefix="/clients")
api_router.include_router(fleet_router, prefix="/fleet")
api_router.include_router(logistics_router, prefix="/logistics")

# Finanzas y Proveedores
api_router.include_router(finance_router, prefix="/finance")
api_router.include_router(suppliers_router, prefix="/suppliers")

# Maintenance y Monitoreo
api_router.include_router(maintenance_router, prefix="/maintenance")
api_router.include_router(monitoring_router, prefix="/monitoring")

# Integraciones Externas
api_router.include_router(sat_router, prefix="/sat")

# ⚠️ ¡MUY IMPORTANTE! Registrar el api_router en la app principal
app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "TMS API Modular (FSD) is running"}
