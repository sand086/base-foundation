from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import RecordStatus


# =========================================================
# Base helper
# =========================================================


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ModuleSchema(ORMBase):
    id: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=100)
    icono: str = Field(default="Shield", max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=200)


# =========================================================
# ROLES
# =========================================================


class RoleBase(ORMBase):
    # Model: roles.name_key (unique, not null)
    name_key: str = Field(..., max_length=50)

    # Model: roles.nombre (not null)
    nombre: str = Field(..., max_length=50)

    # Model: roles.descripcion (nullable)
    descripcion: Optional[str] = Field(default=None, max_length=200)

    # Model: roles.permisos (JSONB default dict)
    permisos: Dict[str, Any] = Field(default_factory=dict)


class RoleCreate(RoleBase):
    """
    Nota: AuditMixin lo llena BD (record_status, created_at, updated_at, etc.)
    """

    model_config = ConfigDict(extra="ignore")


class RoleUpdate(ORMBase):
    name_key: Optional[str] = Field(default=None, max_length=50)
    nombre: Optional[str] = Field(default=None, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=200)
    permisos: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="ignore")


class RoleResponse(RoleBase):
    id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # Comentario (raro en tu esquema anterior):
    # Antes lo tenías como Optional[...] = None; si ya estás estandarizando,
    # mejor tiparlo estricto como arriba para detectar inconsistencias.


# =========================================================
# USERS
# =========================================================


class UserBase(ORMBase):
    # Model: users.email (unique, not null)
    email: EmailStr

    # Model: users.nombre (not null), users.apellido (nullable)
    nombre: str = Field(..., max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)

    # Model: users.telefono/puesto/avatar_url (nullable)
    telefono: Optional[str] = Field(default=None, max_length=20)
    puesto: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    # Model: users.role_id (FK roles.id, nullable)
    role_id: Optional[int] = None

    # Model: users.activo (boolean default True)
    activo: bool = True

    # Model: users.preferencias (JSONB default {"theme":"system","notifications":True})
    preferencias: Dict[str, Any] = Field(
        default_factory=lambda: {"theme": "system", "notifications": True}
    )

    # Model: users.is_2fa_enabled (bool default False)
    is_2fa_enabled: bool = False

    # Model: users.last_login (datetime nullable)
    last_login: Optional[datetime] = None


class UserCreate(ORMBase):
    """
    Comentario raro/importante:
    - En el modelo NO existe campo `password`, existe `password_hash`.
      Este schema está bien para recibir password "plano" en API,
      pero asegúrate de hashearlo en tu service y guardarlo en password_hash.
    - two_factor_secret NO lo pidas aquí (lo genera/activa tu flujo 2FA).
    """

    email: EmailStr
    password: str = Field(..., min_length=8)

    nombre: str = Field(..., max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)

    telefono: Optional[str] = Field(default=None, max_length=20)
    puesto: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    role_id: Optional[int] = None
    activo: bool = True

    # Si no mandas, tu service puede dejar None y que aplique el default de BD/modelo
    preferencias: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="ignore")


class UserUpdate(ORMBase):
    email: Optional[EmailStr] = None
    nombre: Optional[str] = Field(default=None, max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)

    telefono: Optional[str] = Field(default=None, max_length=20)
    puesto: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    role_id: Optional[int] = None
    activo: Optional[bool] = None
    preferencias: Optional[Dict[str, Any]] = None
    is_2fa_enabled: Optional[bool] = None
    last_login: Optional[datetime] = None

    model_config = ConfigDict(extra="ignore")


class UserResponse(UserBase):
    id: int

    # Anidado opcional (evita N requests)
    role: Optional[RoleResponse] = None

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # Comentario raro/importante:
    # El modelo tiene `two_factor_secret`, pero NO conviene exponerlo en respuesta.
    # Si necesitas mostrar algo al front, mejor expón solo flags (is_2fa_enabled) y/o QR provisioned aparte.


class PasswordReset(ORMBase):
    new_password: str = Field(..., min_length=8)

    model_config = ConfigDict(extra="ignore")
