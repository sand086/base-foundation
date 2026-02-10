from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import clients as schemas
from app.crud import clients as crud

router = APIRouter()

# RUTAS EN INGLÉS (/clients) + IDs NUMÉRICOS (int)

@router.get("/clients", response_model=List[schemas.ClientResponse])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_clients(db, skip=skip, limit=limit)


@router.get("/clients/{client_id}", response_model=schemas.ClientResponse)
def read_client(client_id: int, db: Session = Depends(get_db)): # <--- Cambio a int
    db_client = crud.get_client(db, client_id=client_id)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client


@router.post("/clients", response_model=schemas.ClientResponse)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Client).filter(models.Client.rfc == client.rfc).first()
    if existing:
        raise HTTPException(status_code=400, detail="El RFC ya está registrado")
    return crud.create_client(db=db, client=client)


@router.put("/clients/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: int, client: schemas.ClientUpdate, db: Session = Depends(get_db) # <--- Cambio a int
):
    db_client = crud.update_client(db, client_id=client_id, client_data=client)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client


@router.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)): # <--- Cambio a int
    success = crud.delete_client(db, client_id=client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}