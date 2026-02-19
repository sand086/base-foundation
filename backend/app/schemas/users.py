from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import RecordStatus  # ajusta ruta real


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
    # name_key = Column(String(50), unique=True, nullable=False)
    name_key: str = Field(..., max_length=50)

    # nombre = Column(String(50), nullable=False)
    nombre: str = Field(..., max_length=50)

    # descripcion = Column(String(200))
    descripcion: Optional[str] = Field(default=None, max_length=200)

    # permisos = Column(JSONB, default=dict)
    permisos: Dict[str, Any] = Field(default_factory=dict)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(ORMBase):
    name_key: Optional[str] = Field(default=None, max_length=50)
    nombre: Optional[str] = Field(default=None, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=200)
    permisos: Optional[Dict[str, Any]] = None


class RoleResponse(RoleBase):
    id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# USERS
# =========================================================


class UserBase(ORMBase):
    # email = Column(String(100), unique=True, nullable=False)
    email: EmailStr

    # nombre/apellido
    nombre: str = Field(..., max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)

    # telefono/puesto/avatar_url
    telefono: Optional[str] = Field(default=None, max_length=20)
    puesto: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    # role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))
    role_id: Optional[int] = None

    # activo = Column(Boolean, default=True)
    activo: bool = True

    # preferencias = JSONB default {"theme":"system","notifications":True}
    preferencias: Dict[str, Any] = Field(
        default_factory=lambda: {"theme": "system", "notifications": True}
    )

    # is_2fa_enabled = Column(Boolean, default=False)
    is_2fa_enabled: bool = False

    # last_login = Column(DateTime(timezone=True))
    last_login: Optional[datetime] = None


class UserCreate(ORMBase):
    email: EmailStr
    password: str = Field(..., min_length=8)

    nombre: str = Field(..., max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)

    telefono: Optional[str] = Field(default=None, max_length=20)
    puesto: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    role_id: Optional[int] = None
    activo: bool = True
    preferencias: Optional[Dict[str, Any]] = (
        None  # si no mandas, usas default del modelo
    )


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


class UserResponse(UserBase):
    id: int

    # opcional: devolver role anidado para evitar N requests
    role: Optional[RoleResponse] = None

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class PasswordReset(ORMBase):
    new_password: str = Field(..., min_length=8)
