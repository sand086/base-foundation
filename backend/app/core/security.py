from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import pyotp
import qrcode
import io
import base64

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
ALGORITHM = "HS256"


# --- Contraseñas ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# --- Tokens JWT ---
def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"sub": str(subject), "exp": expire, "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


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
