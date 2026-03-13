from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from pydantic import BaseModel
from typing import List
from app.api.endpoints.auth import get_current_user

router = APIRouter()


# Esquemas rápidos
class TerminalBase(BaseModel):
    nombre: str


class TerminalResponse(TerminalBase):
    id: int
    record_status: str


@router.get("/terminals", response_model=List[TerminalResponse])
def get_terminals(search: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Terminal).filter(models.Terminal.record_status == "A")
    if search:
        query = query.filter(models.Terminal.nombre.ilike(f"%{search}%"))
    return query.order_by(models.Terminal.nombre.asc()).all()


@router.post("/terminals", response_model=TerminalResponse)
def create_terminal(
    data: TerminalBase, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    # Verificar si ya existe (ignorando mayúsculas/minúsculas)
    exist = (
        db.query(models.Terminal)
        .filter(models.Terminal.nombre.ilike(data.nombre))
        .first()
    )
    if exist:
        if exist.record_status != "A":
            exist.record_status = "A"
            db.commit()
            db.refresh(exist)
            return exist
        return exist  # Si ya existe y está activa, solo la devolvemos

    new_terminal = models.Terminal(
        nombre=data.nombre.upper().strip(), created_by_id=user.id
    )
    db.add(new_terminal)
    db.commit()
    db.refresh(new_terminal)
    return new_terminal


@router.delete("/terminals/{terminal_id}")
def delete_terminal(
    terminal_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    terminal = db.query(models.Terminal).get(terminal_id)
    if not terminal:
        raise HTTPException(status_code=404)
    terminal.record_status = "E"
    terminal.updated_by_id = user.id
    db.commit()
    return {"message": "Terminal eliminada"}


@router.put("/terminals/{terminal_id}")
def update_terminal(
    terminal_id: int,
    data: TerminalBase,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    terminal = db.query(models.Terminal).get(terminal_id)
    if not terminal:
        raise HTTPException(status_code=404)
    terminal.nombre = data.nombre.upper().strip()
    terminal.updated_by_id = user.id
    db.commit()
    db.refresh(terminal)
    return terminal
