# (Tarifas y Proveedores)

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()


@router.get("/tarifas/por-subcliente/{sub_client_id}")
def get_tariffs_by_subclient(sub_client_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.Tariff)
        .filter(models.Tariff.sub_client_id == sub_client_id)
        .all()
    )


@router.post("/tariffs/bulk", tags=["Carga Masiva"])
def create_tariffs_bulk(
    tariffs: List[schemas.TariffCreate], db: Session = Depends(get_db)
):
    try:
        db_tariffs = [models.Tariff(**t.model_dump()) for t in tariffs]
        db.add_all(db_tariffs)
        db.commit()
        return {
            "message": f"Se cargaron {len(db_tariffs)} tarifas",
            "status": "success",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Error al cargar tarifas: {str(e)}"
        )


@router.post("/providers/bulk", tags=["Carga Masiva"])
def create_providers_bulk(
    providers: List[schemas.ProviderCreate], db: Session = Depends(get_db)
):
    try:
        db_providers = [models.Provider(**prov.model_dump()) for prov in providers]
        db.add_all(db_providers)
        db.commit()
        return {
            "message": f"Se cargaron {len(db_providers)} proveedores",
            "status": "success",
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El RFC de un proveedor ya existe.")
