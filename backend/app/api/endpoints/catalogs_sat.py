# backend/app/api/endpoints/catalogs_sat.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.models.models import SatProduct

router = APIRouter()


# Schema (Pydantic) rápido para la respuesta
class SatProductResponse(BaseModel):
    id: int
    clave: str
    descripcion: str
    es_material_peligroso: str

    class Config:
        from_attributes = True


@router.get("/sat-products", response_model=List[SatProductResponse])
def get_sat_products(db: Session = Depends(get_db)):
    """Obtiene la lista de productos/servicios del catálogo del SAT"""
    productos = db.query(SatProduct).filter(SatProduct.activo == True).all()
    return productos
