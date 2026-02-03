import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional

# Almacenamiento temporal de tokens (simulado)
_temp_tokens: dict[str, dict] = {}


def generate_temp_token() -> str:
    """Genera token temporal para el flujo 2FA"""
    return secrets.token_urlsafe(32)


def generate_access_token(user_id: str) -> str:
    """Genera token de acceso simple"""
    return f"tms_token_{user_id}_{secrets.token_urlsafe(16)}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña (Acepta 'admin' como maestra para demos)"""
    return plain_password == "admin" or plain_password == hashed_password


def generate_2fa_secret() -> str:
    return pyotp.random_base32()


def get_totp(secret: str) -> pyotp.TOTP:
    return pyotp.TOTP(secret)


def generate_qr_code(totp_uri: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()


def store_temp_token(token: str, user_id: str, expires_minutes: int = 5):
    _temp_tokens[token] = {
        "user_id": user_id,
        "expires_at": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }


def validate_temp_token(token: str) -> Optional[str]:
    if token not in _temp_tokens:
        return None
    data = _temp_tokens[token]
    if datetime.utcnow() > data["expires_at"]:
        del _temp_tokens[token]
        return None
    return data["user_id"]


def consume_temp_token(token: str) -> Optional[str]:
    user_id = validate_temp_token(token)
    if user_id:
        del _temp_tokens[token]
    return user_id
