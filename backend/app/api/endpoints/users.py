from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.crud import users as crud
from app.models import models
from app.schemas import users as schemas

router = APIRouter()


# =========================================================
# USERS
# =========================================================


@router.get("/usuarios", response_model=List[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_users(db, skip=skip, limit=limit)


@router.get("/usuarios/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.post("/usuarios", response_model=schemas.UserResponse)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # email unique (aunque tu db también lo impone)
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="El correo ya existe")

    # validar role_id si viene
    if payload.role_id is not None:
        role = crud.get_role(db, payload.role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

    return crud.create_user(db, payload)


@router.put("/usuarios/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db)
):
    # si cambia email, validar duplicado
    if payload.email:
        existing = crud.get_user_by_email(db, payload.email)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="El correo ya existe")

    # validar role_id si viene
    if payload.role_id is not None:
        role = crud.get_role(db, payload.role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

    user = crud.update_user(db, user_id, payload)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/usuarios/{user_id}/status")
def toggle_status(user_id: int, db: Session = Depends(get_db)):
    status_value = crud.toggle_user_status(db, user_id)
    if status_value is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"activo": status_value}


@router.post("/usuarios/{user_id}/reset-password")
def reset_password(
    user_id: int, payload: schemas.PasswordReset, db: Session = Depends(get_db)
):
    ok = crud.reset_password(db, user_id, payload.new_password)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Contraseña actualizada"}


@router.delete("/usuarios/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_user(db, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}


# =========================================================
# ROLES
# =========================================================


@router.get("/roles", response_model=List[schemas.RoleResponse])
def read_roles(db: Session = Depends(get_db)):
    return crud.get_roles(db)


@router.get("/roles/{role_id}", response_model=schemas.RoleResponse)
def read_role(role_id: int, db: Session = Depends(get_db)):
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


@router.post("/roles", response_model=schemas.RoleResponse)
def create_role(payload: schemas.RoleCreate, db: Session = Depends(get_db)):
    # name_key es unique en tu modelo
    if crud.get_role_by_key(db, payload.name_key):
        raise HTTPException(status_code=400, detail="Ya existe un rol con ese name_key")
    return crud.create_role(db, payload)


@router.put("/roles/{role_id}", response_model=schemas.RoleResponse)
def update_role(
    role_id: int, payload: schemas.RoleUpdate, db: Session = Depends(get_db)
):
    # si cambia name_key validar unique
    if payload.name_key:
        exists = crud.get_role_by_key(db, payload.name_key)
        if exists and exists.id != role_id:
            raise HTTPException(
                status_code=400, detail="Ya existe un rol con ese name_key"
            )

    role = crud.update_role(db, role_id, payload)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


@router.delete("/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    result = crud.delete_role(db, role_id)
    if result is False:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    if result is None:
        raise HTTPException(
            status_code=400, detail="No se puede eliminar: hay usuarios usando este rol"
        )
    return {"message": "Rol eliminado"}


# =========================================================
# MODULES (SystemConfig) - lo dejo igual que tú, solo alineado
# =========================================================

DEFAULT_MODULES = [
    {"id": "dashboard", "nombre": "Dashboard", "icono": "LayoutDashboard"},
    {"id": "monitoreo", "nombre": "Centro de Monitoreo", "icono": "Radio"},
    {"id": "clients", "nombre": "Clientes", "icono": "Users"},
    {"id": "flota", "nombre": "Flota", "icono": "Truck"},
    {"id": "combustible", "nombre": "Combustible", "icono": "Fuel"},
    {"id": "tarifas", "nombre": "Tarifas", "icono": "DollarSign"},
    {"id": "despacho", "nombre": "Despacho", "icono": "FileText"},
    {"id": "cxc", "nombre": "Cuentas por Cobrar", "icono": "Receipt"},
    {"id": "cxp", "nombre": "Cuentas por Pagar", "icono": "CreditCard"},
    {"id": "reportes", "nombre": "Reportes", "icono": "BarChart3"},
    {"id": "usuarios", "nombre": "Usuarios", "icono": "Shield"},
]


@router.get("/config/modules", response_model=List[schemas.ModuleSchema])
def get_modules(db: Session = Depends(get_db)):
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
        .first()
    )

    if not config:
        config = models.SystemConfig(
            key="modules_list",
            value=json.dumps(DEFAULT_MODULES),
            grupo="system",
            tipo="json",
            is_public=False,
        )
        db.add(config)
        db.commit()
        return DEFAULT_MODULES

    return json.loads(config.value)


@router.post("/config/modules", response_model=List[schemas.ModuleSchema])
def add_module(modulo: schemas.ModuleSchema, db: Session = Depends(get_db)):
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
        .first()
    )

    current_modules = json.loads(config.value) if config else list(DEFAULT_MODULES)

    if any(m["id"] == modulo.id for m in current_modules):
        raise HTTPException(status_code=400, detail="Ya existe un módulo con este ID")

    current_modules.append(modulo.model_dump())

    if config:
        config.value = json.dumps(current_modules)
    else:
        config = models.SystemConfig(
            key="modules_list",
            value=json.dumps(current_modules),
            grupo="system",
            tipo="json",
            is_public=False,
        )
        db.add(config)

    db.commit()
    return current_modules
