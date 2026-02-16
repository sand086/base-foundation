from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.db.database import Base, engine
from datetime import datetime
from fastapi.staticfiles import StaticFiles

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rápidos 3T - TMS API",
    description="Sistema de Gestión de Transporte - Backend API Modular",
    version="1.0.0",
)

# --- CORRECCIÓN CORS: Permisivo para desarrollo ---
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://23.29.114.149"],# Usar ["*"] permite cualquier origen (IP, localhost, dominios, etc.)
    # Esto elimina el error 400 en OPTIONS inmediatamente.
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Rutas
app.include_router(api_router, prefix="/api")
app.mount("/static", StaticFiles(directory="app/uploads"), name="static")


@app.get("/")
def read_root():
    return {"message": "TMS API is running"}
