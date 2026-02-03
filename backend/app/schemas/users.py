from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# --- USUARIOS ---
class UserBase(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    email: EmailStr
    telefono: Optional[str] = None
    puesto: Optional[str] = None
    role_id: str
    activo: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    puesto: Optional[str] = None
    role_id: Optional[str] = None
    activo: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    is_2fa_enabled: bool = False

    class Config:
        from_attributes = True


class PasswordReset(BaseModel):
    new_password: str


# --- MÓDULOS / PERMISOS (ESTA ES LA CLASE QUE TE FALTABA) ---
class ModuleSchema(BaseModel):
    id: str
    nombre: str
    icono: str = "Shield"
    descripcion: Optional[str] = None


# --- ROLES ---
class RoleBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    permisos: Optional[Dict[str, Any]] = None


class RoleCreate(RoleBase):
    id: str


class RoleUpdate(BaseModel):
    permisos: Dict[str, Any]


class RoleResponse(RoleBase):
    id: str

    class Config:
        from_attributes = True
