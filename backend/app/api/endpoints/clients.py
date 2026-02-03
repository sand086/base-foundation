from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app import crud  # Asumiendo que tu crud.py sigue entero, lo importamos así

router = APIRouter()


@router.get("/clientes", response_model=List[schemas.ClientResponse])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.get_clients(db, skip=skip, limit=limit)


@router.get("/clientes/{client_id}", response_model=schemas.ClientResponse)
def get_client(client_id: str, db: Session = Depends(get_db)):
    client = crud.get_client(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.post("/clientes", response_model=schemas.ClientResponse, status_code=201)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Client).filter(models.Client.rfc == client.rfc).first()
    if existing:
        raise HTTPException(status_code=400, detail="RFC ya registrado")
    return crud.create_client(db, client)
