from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import clients as schemas
from app.crud import clients as crud  # Importamos el archivo CRUD nuevo

router = APIRouter()


@router.get("/clientes", response_model=List[schemas.ClientResponse])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_clients(db, skip=skip, limit=limit)


@router.get("/clientes/{client_id}", response_model=schemas.ClientResponse)
def read_client(client_id: str, db: Session = Depends(get_db)):
    db_client = crud.get_client(db, client_id=client_id)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return db_client


@router.post("/clientes", response_model=schemas.ClientResponse)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Client).filter(models.Client.rfc == client.rfc).first()
    if existing:
        raise HTTPException(status_code=400, detail="El RFC ya está registrado")
    return crud.create_client(db=db, client=client)


@router.put("/clientes/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: str, client: schemas.ClientUpdate, db: Session = Depends(get_db)
):
    db_client = crud.update_client(db, client_id=client_id, client_data=client)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return db_client


@router.delete("/clientes/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db)):
    success = crud.delete_client(db, client_id=client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado"}
