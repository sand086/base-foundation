from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import finance as schemas
from app.crud import finance as crud

router = APIRouter()


@router.get("/providers", response_model=List[schemas.ProviderResponse])
def read_providers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_providers(db, skip, limit)


@router.post("/providers", response_model=schemas.ProviderResponse)
def create_provider(provider: schemas.ProviderCreate, db: Session = Depends(get_db)):
    if db.query(models.Provider).filter(models.Provider.rfc == provider.rfc).first():
        raise HTTPException(status_code=400, detail="RFC ya registrado")
    return crud.create_provider(db, provider)


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: str, db: Session = Depends(get_db)):
    if not crud.delete_provider(db, provider_id):
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado"}
