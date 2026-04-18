from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt, JWTError
from cryptography.fernet import Fernet
from app.core.config import settings
import pyotp
import qrcode
import io
import base64

# --- Configuración de JWT ---
ALGORITHM = "HS256"

# --- Configuración de Encriptación Bidireccional (Reversible) ---
# Intentamos obtener la llave desde las configuraciones (ej. .env).
# Si no existe, usamos una de fallback. (Asegúrate de que esta llave nunca cambie o no podrás desencriptar).
ENCRYPTION_KEY = getattr(
    settings, "ENCRYPTION_KEY", b"Gk2Q6-fF-O1_G_g3aL8dM7J3KxR_vT8Y0Z_uW9aXzYQ="
)
cipher_suite = Fernet(ENCRYPTION_KEY)


# --- Contraseñas (Encriptación Reversible) ---
def get_password_hash(password: str) -> str:
    """Encripta la contraseña de forma bidireccional (reversible)"""
    if not password:
        return ""
    # Encriptamos el string y lo guardamos como un texto base64
    return cipher_suite.encrypt(password.encode("utf-8")).decode("utf-8")


def decrypt_password(encrypted_password: str) -> str:
    """Desencripta la contraseña para verla en texto plano"""
    if not encrypted_password:
        return ""
    try:
        return cipher_suite.decrypt(encrypted_password.encode("utf-8")).decode("utf-8")
    except Exception:
        # IMPORTANTE: Si la contraseña era de las antiguas (Argon2), fallará al desencriptar.
        # Esto atrapa el error para que el sistema no se caiga.
        return ""


def verify_password(plain_password: str, encrypted_password: str) -> bool:
    """Verifica si la contraseña plana coincide con la desencriptada"""
    return plain_password == decrypt_password(encrypted_password)


# --- Tokens JWT ---
def create_access_token(subject: Union[str, Any]) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": str(subject), "exp": expire, "type": "access"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: Union[str, Any]) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
    )
    # Importante: type "refresh"
    to_encode = {"sub": str(subject), "exp": expire, "type": "refresh"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def generate_temp_token(user_id: str) -> str:
    """Genera un token temporal de 5 minutos solo para verificar 2FA"""
    expire = datetime.utcnow() + timedelta(minutes=5)
    to_encode = {"sub": str(user_id), "exp": expire, "type": "2fa_temp"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_temp_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "2fa_temp":
            return None
        return payload.get("sub")
    except JWTError:
        return None


# --- 2FA (Google Authenticator) ---
def generate_2fa_secret() -> str:
    return pyotp.random_base32()


def get_totp(secret: str):
    return pyotp.TOTP(secret)


def generate_qr_code(uri: str) -> str:
    """Genera imagen QR en base64"""
    img = qrcode.make(uri)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")
