from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any


# Esquema básico de Usuario para respuestas de Auth
class UserAuthSchema(BaseModel):
    id: int  # <--- IMPORTANTE: Ahora es int
    nombre: str
    email: EmailStr
    role_id: Optional[int] = None # Puede ser int o null
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True # Antes orm_mode = True

# Lo que envía el usuario para loguearse
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Lo que responde el servidor (Token o Solicitud de 2FA)
class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserAuthSchema] = None

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
    user_id: int


# Desactivar 2FA
class TwoFactorDisableRequest(BaseModel):
    code: str
    user_id: int


# Cambio de contraseña
class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


# Respuesta de información del usuario
class UserInfoResponse(BaseModel):
    id: int
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
