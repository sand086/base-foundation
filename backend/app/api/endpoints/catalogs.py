from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import catalogs as schemas
from typing import List

router = APIRouter()


@router.get("/unit-types", response_model=List[schemas.UnitTypeBase])
def get_unit_types(db: Session = Depends(get_db)):
    # Retornamos todos los tipos, el frontend filtrará los activos para los selects
    return db.query(models.UnitTypeCatalog).all()


@router.post("/unit-types/bulk")
def save_unit_types_bulk(
    tipos: List[schemas.UnitTypeCreate], db: Session = Depends(get_db)
):
    """
    Sincroniza el catálogo completo.
    Si el ID existe, lo actualiza. Si no, lo crea.
    """
    for item in tipos:
        db_item = (
            db.query(models.UnitTypeCatalog)
            .filter(models.UnitTypeCatalog.id == item.id)
            .first()
        )

        if db_item:
            # Actualizar existente
            db_item.nombre = item.nombre
            db_item.icono = item.icono
            db_item.activo = item.activo
            db_item.descripcion = item.descripcion
        else:
            # Crear nuevo
            new_item = models.UnitTypeCatalog(**item.model_dump())
            db.add(new_item)

    db.commit()
    return {"message": "Catálogo actualizado correctamente"}
