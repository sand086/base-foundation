from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import catalogs as schemas
from typing import List

router = APIRouter()

# --- CATÁLOGO: TIPOS DE UNIDADES ---


@router.get("/unit-types", response_model=List[schemas.UnitTypeBase])
def get_unit_types(db: Session = Depends(get_db)):
    return db.query(models.UnitTypeCatalog).all()


@router.post("/unit-types/bulk")
def save_unit_types_bulk(
    tipos: List[schemas.UnitTypeCreate], db: Session = Depends(get_db)
):
    for item in tipos:
        db_item = (
            db.query(models.UnitTypeCatalog)
            .filter(models.UnitTypeCatalog.id == item.id)
            .first()
        )
        if db_item:
            db_item.nombre = item.nombre
            db_item.icono = item.icono
            db_item.activo = item.activo
            db_item.descripcion = item.descripcion
        else:
            new_item = models.UnitTypeCatalog(**item.model_dump())
            db.add(new_item)
    db.commit()
    return {"message": "Catálogo actualizado correctamente"}


# --- CONFIGURACIÓN DEL SISTEMA (SystemConfig) ---


@router.get("/system-config", response_model=List[schemas.SystemConfigBase])
def get_system_config(db: Session = Depends(get_db)):
    """Ruta: /api/catalogs/system-config"""
    return db.query(models.SystemConfig).all()


@router.put("/system-config/{key}")
def update_system_config(
    key: str, data: schemas.SystemConfigUpdate, db: Session = Depends(get_db)
):
    """Ruta: /api/catalogs/system-config/{key}"""
    config = (
        db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    )

    if not config:
        # Opcional: Si la llave no existe, la creamos
        config = models.SystemConfig(key=key)
        db.add(config)

    config.value = data.value
    db.commit()
    db.refresh(config)
    return config


@router.get("/routes")
def get_routes_catalog(db: Session = Depends(get_db)):
    """Ruta final: /api/catalogs/routes"""
    # Usamos RateTemplate porque es donde guardas tus rutas origen-destino
    return db.query(models.RateTemplate).all()


@router.post("/routes")
def create_route_catalog(ruta: schemas.RouteCreate, db: Session = Depends(get_db)):
    # Lógica para crear una ruta simple
    new_route = models.RateTemplate(**ruta.model_dump())
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route


@router.delete("/routes/{route_id}")
def delete_route_catalog(route_id: int, db: Session = Depends(get_db)):
    route = (
        db.query(models.RateTemplate).filter(models.RateTemplate.id == route_id).first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(route)
    db.commit()
    return {"message": "Ruta eliminada"}
