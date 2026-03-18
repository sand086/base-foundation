from __future__ import annotations

import json
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.services.storage import StorageService
from sqlalchemy.orm import Session


from app.db.database import get_db
from app.crud import users as crud
from app.models import models
from app.schemas import users as schemas
from app.api.endpoints.auth import get_current_active_user

router = APIRouter()

# =========================================================
# ROLES (Deben ir primero para evitar conflicto con {user_id})
# =========================================================


@router.get("/roles", response_model=List[schemas.RoleResponse])
def read_roles(db: Session = Depends(get_db)):
    """Lista todos los roles disponibles"""
    return crud.get_roles(db)


@router.post("/roles", response_model=schemas.RoleResponse)
def create_role(payload: schemas.RoleCreate, db: Session = Depends(get_db)):
    # name_key es unique en el modelo
    if crud.get_role_by_key(db, payload.name_key):
        raise HTTPException(status_code=400, detail="Ya existe un rol con ese name_key")
    return crud.create_role(db, payload)


@router.get("/roles/{role_id}", response_model=schemas.RoleResponse)
def read_role(role_id: int, db: Session = Depends(get_db)):
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


@router.put("/roles/{role_id}", response_model=schemas.RoleResponse)
def update_role(
    role_id: int, payload: schemas.RoleUpdate, db: Session = Depends(get_db)
):
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


@router.get("/roles/{role_id}/permisos", response_model=Dict[str, Any])
def read_role_permissions(role_id: int, db: Session = Depends(get_db)):
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role.permisos or {}


# =========================================================
# AUDIT LOGS (Ruta estática)
# =========================================================


@router.get("/audit-logs")
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload

    logs = (
        db.query(models.AuditLog)
        .options(joinedload(models.AuditLog.user))
        .order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        usuario_nombre = "Sistema"
        if log.user:
            usuario_nombre = f"{log.user.nombre} {log.user.apellido or ''}".strip()

        result.append(
            {
                "id": str(log.id),
                "usuario": usuario_nombre,
                "accion": log.accion,
                "tipoAccion": log.tipo_accion,
                "modulo": log.modulo,
                "detalles": log.detalles or "",
                "ip": log.ip or "N/A",
                "fechaHora": log.created_at.isoformat(),
                "dispositivo": log.dispositivo or "N/A",
            }
        )
    return result


# =========================================================
# USERS - MI PERFIL
# =========================================================


@router.get("/me", response_model=schemas.UserResponse)
def read_user_me(current_user: models.User = Depends(get_current_active_user)):
    """Devuelve la información del usuario logueado"""
    return current_user


# =========================================================
# USERS - OPERACIONES GENERALES
# =========================================================


@router.get("", response_model=List[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_users(db, skip=skip, limit=limit)


@router.post("", response_model=schemas.UserResponse)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="El correo ya existe")

    if payload.role_id is not None:
        role = crud.get_role(db, payload.role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

    return crud.create_user(db, payload)


# =========================================================
# USERS - OPERACIONES POR ID (Al final para evitar conflictos)
# =========================================================


@router.get("/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db)
):
    if payload.email:
        existing = crud.get_user_by_email(db, payload.email)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="El correo ya existe")

    if payload.role_id is not None:
        role = crud.get_role(db, payload.role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

    user = crud.update_user(db, user_id, payload)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{user_id}/status")
def toggle_status(user_id: int, db: Session = Depends(get_db)):
    status_value = crud.toggle_user_status(db, user_id)
    if status_value is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"activo": status_value}


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int, payload: schemas.PasswordReset, db: Session = Depends(get_db)
):
    ok = crud.reset_password(db, user_id, payload.new_password)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Contraseña actualizada"}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_user(db, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}


@router.post("/{user_id}/avatar")
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # 1. Verificar existencia del usuario
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Guardar físicamente usando el StorageService
    try:
        storage_data = StorageService.save_file(
            file, folder="avatars", prefix=f"USER_{user_id}"
        )

        # 3. Actualizar solo el campo avatar_url en la BD
        user.avatar_url = storage_data["url"]
        db.commit()
        db.refresh(user)

        return {"avatar_url": user.avatar_url}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al guardar imagen: {str(e)}"
        )
