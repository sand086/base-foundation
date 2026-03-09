from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import Brand
from app.schemas.brand import BrandResponse, BrandCreate

router = APIRouter()


@router.get("/brand", response_model=List[BrandResponse])
def get_brands(db: Session = Depends(get_db)):
    return (
        db.query(Brand)
        .filter(Brand.record_status == "A")
        .order_by(Brand.nombre.asc())
        .all()
    )


@router.post("/brand", response_model=BrandResponse)
def create_brand(obj_in: BrandCreate, db: Session = Depends(get_db)):
    # Evitar duplicados por nombre
    nombre_limpio = obj_in.nombre.strip().upper()

    # Buscamos si ya existe para no duplicar
    existing = db.query(Brand).filter(Brand.nombre == nombre_limpio).first()
    if existing:
        return existing

    # Si no existe, la creamos
    new_brand = Brand(
        nombre=nombre_limpio,
        tipo_activo=obj_in.tipo_activo.upper() if obj_in.tipo_activo else None,
        record_status="A",
    )
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)
    return new_brand
