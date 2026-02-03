from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any


# Lo que envía el usuario para loguearse
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Lo que responde el servidor (Token o Solicitud de 2FA)
class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[Dict[str, Any]] = None

    # Campos para flujo 2FA
    require_2fa: bool = False
    temp_token: Optional[str] = None


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


# Desactivar 2FA
class TwoFactorDisableRequest(BaseModel):
    code: str


# Cambio de contraseña
class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


# Respuesta de información del usuario
class UserInfoResponse(BaseModel):
    id: str
    nombre: str
    apellido: Optional[str] = None
    email: EmailStr
    telefono: Optional[str] = None
    puesto: Optional[str] = None
    role_id: str
    activo: bool
    is_2fa_enabled: bool
    avatar_url: Optional[str] = None
    last_login: Optional[str] = None
    permisos: Optional[Dict[str, Any]] = None
