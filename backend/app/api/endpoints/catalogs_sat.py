# backend/app/api/endpoints/catalogs_sat.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.models.models import SatProduct
from app import models


router = APIRouter()

# ==========================================
# SCHEMAS (PYDANTIC) LOCALES
# ==========================================


class SatProductResponse(BaseModel):
    id: int
    clave: str
    descripcion: str
    es_material_peligroso: str

    class Config:
        from_attributes = True


# 🚀 Añadimos los esquemas que faltaban para System Config
class SystemConfigSchema(BaseModel):
    key: str
    value: str
    grupo: str
    tipo: str
    is_public: bool

    class Config:
        from_attributes = True


class UpdateConfigPayload(BaseModel):
    value: str


# ==========================================
# ENDPOINTS
# ==========================================


@router.get("/sat-products", response_model=List[SatProductResponse])
def get_sat_products(db: Session = Depends(get_db)):
    """Obtiene la lista de productos/servicios del catálogo del SAT"""
    productos = db.query(SatProduct).filter(SatProduct.activo == True).all()
    return productos


@router.get("/system-config", response_model=List[SystemConfigSchema])
def get_system_config(db: Session = Depends(get_db)):
    """Obtiene la configuración global del sistema"""
    return db.query(models.SystemConfig).all()


@router.put("/system-config/{key}")
def update_system_config(
    key: str, payload: UpdateConfigPayload, db: Session = Depends(get_db)
):
    """Actualiza un valor de la configuración del sistema"""
    config = (
        db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    config.value = payload.value
    db.commit()
    return {"message": "Configuración actualizada"}
