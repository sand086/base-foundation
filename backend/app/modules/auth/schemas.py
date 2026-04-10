# --- Fuente: schemas_auth.py ---
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, Dict, Any
from datetime import datetime


# Esquema básico de Usuario para respuestas de Auth
class RoleAuthSchema(BaseModel):
    id: int
    name_key: str
    nombre: str
    permisos: Optional[Dict[str, Any]] = {}

    model_config = ConfigDict(from_attributes=True)


class UserAuthSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # <-- Sintaxis V2

    id: int
    nombre: str
    email: EmailStr
    role_id: Optional[int] = None
    avatar_url: Optional[str] = None
    role: Optional[RoleAuthSchema] = None


# Lo que envía el usuario para loguearse
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Lo que responde el servidor (Token o Solicitud de 2FA)
class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserAuthSchema] = None
    require_2fa: bool = False
    temp_token: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


# Verificación del código 2FA
class TwoFactorVerifyRequest(BaseModel):
    temp_token: str
    code: str


# Respuesta para configurar 2FA (QR)
class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 image
    manual_entry_key: str


# Activar 2FA
class TwoFactorEnableRequest(BaseModel):
    code: str
    user_id: int


# --- NUEVOS SCHEMAS PARA SYSTEM CONFIG (Para que funcione el adminService) ---


class SystemConfig(BaseModel):
    key: str
    value: str
    grupo: str
    tipo: str
    is_public: bool

    class Config:
        from_attributes = True


class UpdateConfigPayload(BaseModel):
    value: str


# Respuesta de información detallada del usuario
class UserInfoResponse(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    email: EmailStr
    telefono: Optional[str] = None
    puesto: Optional[str] = None
    role_id: Optional[int] = None  # <--- CORREGIDO: de str a int
    activo: bool
    is_2fa_enabled: bool
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None  # <--- CORREGIDO: de str a datetime
    permisos: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# --- Fuente: schemas_users.py ---


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
    name_key: str
    nombre: str
    descripcion: Optional[str] = None

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    permisos: Optional[Dict[str, Any]] = {}
    model_config = ConfigDict(from_attributes=True)


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


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nombre: Optional[str] = Field(default=None, max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)

    telefono: Optional[str] = Field(default=None, max_length=20)
    puesto: Optional[str] = Field(default=None, max_length=100)

    avatar_url: Optional[str] = None

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


class EmergencyRequest(BaseModel):
    temp_token: str
