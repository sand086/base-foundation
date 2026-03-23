# backend/app/api/endpoints/catalogs_sat.py
from fastapi import APIRouter, Depends, HTTPException, status
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


# 🚀 Schema para Crear / Actualizar Productos SAT
class SatProductCreate(BaseModel):
    clave: str
    descripcion: str
    es_material_peligroso: str


class SatProductResponse(BaseModel):
    id: int
    clave: str
    descripcion: str
    es_material_peligroso: str
    # Opcional: puedes incluir 'activo: bool' si el frontend necesita saberlo,
    # pero como el GET solo trae los activos, no es estrictamente necesario.

    class Config:
        from_attributes = True


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
# ENDPOINTS CATÁLOGO SAT
# ==========================================


@router.get("/sat-products", response_model=List[SatProductResponse])
def get_sat_products(db: Session = Depends(get_db)):
    """Obtiene la lista de productos/servicios del catálogo del SAT"""
    productos = db.query(SatProduct).filter(SatProduct.activo == True).all()
    return productos


@router.post(
    "/sat-products",
    response_model=SatProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sat_product(payload: SatProductCreate, db: Session = Depends(get_db)):
    """Crea un nuevo producto/servicio en el catálogo del SAT"""
    # Verificamos si la clave ya existe y está activa para evitar duplicados
    existente = (
        db.query(SatProduct)
        .filter(SatProduct.clave == payload.clave, SatProduct.activo == True)
        .first()
    )

    if existente:
        raise HTTPException(
            status_code=400, detail="Esta clave SAT ya está registrada y activa."
        )

    nuevo_producto = SatProduct(
        clave=payload.clave,
        descripcion=payload.descripcion,
        es_material_peligroso=payload.es_material_peligroso,
        activo=True,  # Forzamos a que nazca activo
    )
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto


@router.put("/sat-products/{product_id}", response_model=SatProductResponse)
def update_sat_product(
    product_id: int, payload: SatProductCreate, db: Session = Depends(get_db)
):
    """Actualiza un producto del catálogo del SAT"""
    producto = (
        db.query(SatProduct)
        .filter(SatProduct.id == product_id, SatProduct.activo == True)
        .first()
    )
    if not producto:
        raise HTTPException(status_code=404, detail="Producto SAT no encontrado")

    producto.clave = payload.clave
    producto.descripcion = payload.descripcion
    producto.es_material_peligroso = payload.es_material_peligroso

    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/sat-products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sat_product(product_id: int, db: Session = Depends(get_db)):
    """Realiza un borrado lógico (soft delete) del producto SAT"""
    producto = db.query(SatProduct).filter(SatProduct.id == product_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto SAT no encontrado")

    # Soft Delete: Solo lo desactivamos
    producto.activo = False
    db.commit()
    return None


# ==========================================
# ENDPOINTS SYSTEM CONFIG
# ==========================================


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
