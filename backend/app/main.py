from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from datetime import datetime

from app.db.database import engine
from app.models import models
from app.api.api import api_router


# Crear tablas al inicio (esto se suele mover a Alembic en produccion, pero dejémoslo aqui por ahora)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rápidos 3T - TMS API",
    description="Sistema de Gestión de Transporte - Backend API Modular",
    version="1.0.0",
)

# Configuración CORS
origins = [
    "http://23.29.114.149",
    # "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check (Ruta raiz)
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Incluir todas las rutas API
app.include_router(api_router, prefix="/api")
app.mount("/static", StaticFiles(directory="app/uploads"), name="static")
