from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

# Importamos las piezas que acabamos de crear
from app.db.database import get_db
from app.models import models
from app.schemas import auth as schemas
from app.core import security

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    # 1. Buscar usuario
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # 2. Verificar password
    if not security.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    # 3. Verificar si tiene 2FA activado
    if user.is_2fa_enabled and user.two_factor_secret:
        temp_token = security.generate_temp_token()
        security.store_temp_token(temp_token, user.id)
        return schemas.LoginResponse(
            require_2fa=True,
            temp_token=temp_token,
            user={"nombre": user.nombre, "email": user.email},
        )

    # 4. Login directo (Sin 2FA)
    access_token = security.generate_access_token(user.id)
    user.last_login = datetime.utcnow()
    db.commit()

    return schemas.LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "role_id": user.role_id,
        },
    )


@router.post("/2fa/verify", response_model=schemas.LoginResponse)
def verify_2fa(request: schemas.TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    if not request.temp_token:
        raise HTTPException(status_code=400, detail="Token requerido")

    user_id = security.consume_temp_token(request.temp_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token expirado")

    user = db.query(models.User).filter(models.User.id == user_id).first()

    totp = security.get_totp(user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Código inválido")

    access_token = security.generate_access_token(user.id)
    user.last_login = datetime.utcnow()
    db.commit()

    return schemas.LoginResponse(
        access_token=access_token,
        user={"id": user.id, "nombre": user.nombre, "email": user.email},
    )


@router.get("/2fa/setup", response_model=schemas.TwoFactorSetupResponse)
def setup_2fa(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)

    secret = security.generate_2fa_secret()
    totp = security.get_totp(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="TMS")

    user.two_factor_secret = secret
    db.commit()

    return schemas.TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{security.generate_qr_code(uri)}",
        manual_entry_key=secret,
    )


@router.post("/2fa/enable")
def enable_2fa(
    request: schemas.TwoFactorEnableRequest, user_id: str, db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    totp = security.get_totp(user.two_factor_secret)
    if not totp.verify(request.code):
        raise HTTPException(status_code=400, detail="Código incorrecto")

    user.is_2fa_enabled = True
    db.commit()
    return {"message": "2FA Activado"}
