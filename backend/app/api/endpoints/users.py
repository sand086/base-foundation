from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import users as schemas
import uuid
import json

router = APIRouter()

# ==========================================
# 1. GESTIÓN DE USUARIOS (CRUD Básico)
# ==========================================


@router.get("/usuarios", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.post("/usuarios", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="El correo ya existe")

    # Generar ID único
    db_user = models.User(
        id=f"USR-{uuid.uuid4().hex[:8].upper()}",
        email=user.email,
        password_hash=user.password,  # En prod usar hashing
        nombre=user.nombre,
        apellido=user.apellido,
        telefono=user.telefono,
        puesto=user.puesto,
        role_id=user.role_id,
        activo=user.activo,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/usuarios/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: str, user_update: schemas.UserUpdate, db: Session = Depends(get_db)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    for key, value in user_update.model_dump(exclude_unset=True).items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.patch("/usuarios/{user_id}/status")
def toggle_status(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    user.activo = not user.activo
    db.commit()
    return {"status": user.activo}


@router.post("/usuarios/{user_id}/reset-password")
def reset_password(
    user_id: str, payload: schemas.PasswordReset, db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    user.password_hash = payload.new_password
    db.commit()
    return {"message": "Contraseña actualizada"}


# ==========================================
# 2. GESTIÓN DE ROLES (CRUD)
# ==========================================


@router.get("/roles", response_model=List[schemas.RoleResponse])
def get_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()


@router.post("/roles", response_model=schemas.RoleResponse)
def create_role(role: schemas.RoleCreate, db: Session = Depends(get_db)):
    # Validar duplicados
    if db.query(models.Role).filter(models.Role.id == role.id).first():
        raise HTTPException(status_code=400, detail="El ID del rol ya existe")

    db_role = models.Role(
        id=role.id,
        nombre=role.nombre,
        descripcion=role.descripcion,
        permisos=role.permisos,
    )
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


@router.put("/roles/{role_id}")
def update_role_permissions(
    role_id: str, payload: schemas.RoleUpdate, db: Session = Depends(get_db)
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Actualizar solo permisos
    role.permisos = payload.permisos
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}")
def delete_role(role_id: str, db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Verificar si tiene usuarios asignados
    if db.query(models.User).filter(models.User.role_id == role_id).first():
        raise HTTPException(
            status_code=400, detail="No se puede eliminar: Hay usuarios usando este rol"
        )

    db.delete(role)
    db.commit()
    return {"message": "Rol eliminado"}


# ==========================================
# 3. GESTIÓN DE CATÁLOGO DE MÓDULOS (Permisos Dinámicos)
# ==========================================

# Lista por defecto para cuando el sistema inicia de cero
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
    """Obtiene la lista de módulos/permisos disponibles"""
    # Buscamos en la tabla de configuración
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
        .first()
    )

    if not config:
        # Si no existe, guardamos los default y los retornamos
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
    """Agrega un nuevo módulo al catálogo"""
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
        .first()
    )

    current_modules = []
    if config:
        current_modules = json.loads(config.value)
    else:
        current_modules = DEFAULT_MODULES

    # Validar que no exista el ID
    for m in current_modules:
        if m["id"] == modulo.id:
            raise HTTPException(
                status_code=400, detail="Ya existe un módulo con este ID"
            )

    # Agregar y guardar
    current_modules.append(modulo.model_dump())

    if config:
        config.value = json.dumps(current_modules)
    else:
        config = models.SystemConfig(
            key="modules_list", value=json.dumps(current_modules)
        )
        db.add(config)

    db.commit()
    return current_modules
