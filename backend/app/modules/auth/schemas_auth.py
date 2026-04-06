from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, Dict, Any
from datetime import datetime


# Esquema básico de Usuario para respuestas de Auth
class UserAuthSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # <-- Sintaxis V2

    id: int
    nombre: str
    email: EmailStr
    role_id: Optional[int] = None
    avatar_url: Optional[str] = None


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
