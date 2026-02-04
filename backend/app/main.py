from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    'http://localhost:8000',
    'http://localhost:80',
    'http://127.0.0.1:8000',
    "http://127.0.0.1:5173",
    "http://23.29.114.149",
    "http://23.29.114.149:80",
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


# Incluir todas las rutas (el "cerebro" del sistema)
app.include_router(api_router, prefix="/api")
