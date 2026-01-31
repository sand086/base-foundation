"""
Authentication & 2FA Module for TMS
Endpoints for login, 2FA setup and verification
"""
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

import models
from database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# ============= SCHEMAS =============


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    require_2fa: bool = False
    temp_token: Optional[str] = None
    user: Optional[dict] = None


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded QR code image
    manual_entry_key: str


class TwoFactorVerifyRequest(BaseModel):
    code: str
    temp_token: Optional[str] = None  # Used during login flow


class TwoFactorEnableRequest(BaseModel):
    code: str  # Must verify code before enabling


# ============= HELPER FUNCTIONS =============


def generate_temp_token() -> str:
    """Generate a temporary token for 2FA verification flow"""
    return secrets.token_urlsafe(32)


def generate_access_token(user_id: str) -> str:
    """
    Generate access token for authenticated user
    In production, use JWT with proper signing
    """
    # Simple token for demo - in production use python-jose JWT
    return f"tms_token_{user_id}_{secrets.token_urlsafe(16)}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash
    In production, use passlib with bcrypt
    """
    # Demo: simple comparison (replace with bcrypt in production)
    # For demo, accept "admin" as password for any user
    return plain_password == "admin" or plain_password == hashed_password


def generate_2fa_secret() -> str:
    """Generate a new TOTP secret"""
    return pyotp.random_base32()


def get_totp(secret: str) -> pyotp.TOTP:
    """Get TOTP object for a secret"""
    return pyotp.TOTP(secret)


def generate_qr_code(totp_uri: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


# Temporary token storage (in production, use Redis)
_temp_tokens: dict[str, dict] = {}


def store_temp_token(token: str, user_id: str, expires_minutes: int = 5):
    """Store temporary token for 2FA verification"""
    _temp_tokens[token] = {
        "user_id": user_id,
        "expires_at": datetime.utcnow() + timedelta(minutes=expires_minutes)
    }


def validate_temp_token(token: str) -> Optional[str]:
    """Validate temp token and return user_id if valid"""
    if token not in _temp_tokens:
        return None
    
    data = _temp_tokens[token]
    if datetime.utcnow() > data["expires_at"]:
        del _temp_tokens[token]
        return None
    
    return data["user_id"]


def consume_temp_token(token: str) -> Optional[str]:
    """Validate and consume (delete) temp token"""
    user_id = validate_temp_token(token)
    if user_id:
        del _temp_tokens[token]
    return user_id


# ============= ENDPOINTS =============


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint with 2FA support
    
    Returns:
    - If 2FA disabled: access_token directly
    - If 2FA enabled: require_2fa=true with temp_token
    """
    # Find user by email
    user = db.query(models.User).filter(
        models.User.email == request.email
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Check if user is active
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    
    # Check if 2FA is enabled
    if user.is_2fa_enabled and user.two_factor_secret:
        # Return 202 with temp token - requires 2FA verification
        temp_token = generate_temp_token()
        store_temp_token(temp_token, user.id)
        
        return LoginResponse(
            require_2fa=True,
            temp_token=temp_token,
            user={"nombre": user.nombre, "email": user.email}
        )
    
    # No 2FA - return access token directly (RETROCOMPATIBLE)
    access_token = generate_access_token(user.id)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "role_id": user.role_id
        }
    )


@router.post("/2fa/verify", response_model=LoginResponse)
def verify_2fa(request: TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify 2FA code during login
    Requires temp_token from initial login response
    """
    if not request.temp_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token temporal requerido"
        )
    
    # Validate and consume temp token
    user_id = consume_temp_token(request.temp_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token temporal inválido o expirado"
        )
    
    # Get user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario no encontrado o 2FA no configurado"
        )
    
    # Verify TOTP code
    totp = get_totp(user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de verificación inválido"
        )
    
    # 2FA verified - issue access token
    access_token = generate_access_token(user.id)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "role_id": user.role_id
        }
    )


@router.get("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(
    user_id: str,  # In production, extract from JWT token
    db: Session = Depends(get_db)
):
    """
    Generate 2FA setup data (secret + QR code)
    User must verify a code before 2FA is actually enabled
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Generate new secret
    secret = generate_2fa_secret()
    
    # Create TOTP with app name
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="Rápidos 3T - TMS"
    )
    
    # Generate QR code
    qr_code_base64 = generate_qr_code(provisioning_uri)
    
    # Store secret temporarily (not enabled yet)
    user.two_factor_secret = secret
    db.commit()
    
    return TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_code_base64}",
        manual_entry_key=secret
    )


@router.post("/2fa/enable")
def enable_2fa(
    request: TwoFactorEnableRequest,
    user_id: str,  # In production, extract from JWT token
    db: Session = Depends(get_db)
):
    """
    Enable 2FA after verifying a valid code
    This confirms the user has correctly set up their authenticator app
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primero debe ejecutar /2fa/setup"
        )
    
    # Verify code before enabling
    totp = get_totp(user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido. Verifique su aplicación autenticadora."
        )
    
    # Enable 2FA
    user.is_2fa_enabled = True
    db.commit()
    
    return {"message": "2FA activado exitosamente", "is_2fa_enabled": True}


@router.post("/2fa/disable")
def disable_2fa(
    request: TwoFactorVerifyRequest,
    user_id: str,  # In production, extract from JWT token
    db: Session = Depends(get_db)
):
    """
    Disable 2FA (requires valid code for security)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if not user.is_2fa_enabled or not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA no está activado"
        )
    
    # Verify code before disabling
    totp = get_totp(user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código inválido"
        )
    
    # Disable 2FA
    user.is_2fa_enabled = False
    user.two_factor_secret = None
    db.commit()
    
    return {"message": "2FA desactivado", "is_2fa_enabled": False}


@router.get("/2fa/status")
def get_2fa_status(
    user_id: str,  # In production, extract from JWT token
    db: Session = Depends(get_db)
):
    """Check if 2FA is enabled for user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return {
        "is_2fa_enabled": user.is_2fa_enabled,
        "has_secret": user.two_factor_secret is not None
    }
