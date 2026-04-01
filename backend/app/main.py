from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.api import api_router
from app.db.database import Base, engine
from datetime import datetime
from fastapi.staticfiles import StaticFiles
import traceback
import os

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rápidos 3T - TMS API",
    description="Sistema de Gestión de Transporte - Backend API Modular",
    version="1.0.0",
)

# ---  CONFIGURACIÓN CORS CORRECTA ---
# REGLA: allow_credentials=True OBLIGA a definir las URLs exactas, no se puede usar "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://localhost:5173",
    ],  # Agregamos los puertos más comunes de React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- INTERCEPTOR DE ERRORES DEFINITIVO ---
# Garantiza que cualquier error 500 se imprima en consola y no sea ocultado por CORS
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("\n" + "error " * 25)
    print(f"  ERROR FATAL EN RUTA: {request.url.path}")
    traceback.print_exc()  # Imprime el error exacto y la línea que falló
    print("error " * 25 + "\n")

    return JSONResponse(
        status_code=500,
        content={"message": "Error interno del servidor", "detalle": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )


# Health Check
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Rutas
app.include_router(api_router, prefix="/api")

upload_path = "app/uploads"
if not os.path.exists(upload_path):
    os.makedirs(upload_path)
app.mount("/api/static", StaticFiles(directory="app/uploads"), name="static")


@app.get("/")
def read_root():
    return {"message": "TMS API is running"}
