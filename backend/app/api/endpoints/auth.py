from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models import models
from app.schemas import auth as schemas
from app.core import security
from app.core.config import settings  # Asegúrate de tener esto o usar timedelta directo

# NOTA: Quitamos 'prefix' aquí porque ya lo defines en api.py como '/auth'
# Si lo dejas aquí, la ruta sería /api/auth/auth/login
router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    # 1. Buscar usuario
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        # Por seguridad, mismo error para usuario no encontrado o pass incorrecta
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # 2. Verificar password
    if not security.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    # 3. Verificar si tiene 2FA activado
    if user.is_2fa_enabled and user.two_factor_secret:
        # Generar token temporal para el paso 2
        temp_token = security.generate_temp_token(user.id)

        return schemas.LoginResponse(
            require_2fa=True,
            temp_token=temp_token,
            user={"nombre": user.nombre, "email": user.email},
        )

    # 4. Login directo (Sin 2FA)
    access_token = security.create_access_token(user.id)

    # Actualizar último login
    user.last_login = datetime.utcnow()
    db.commit()

    return schemas.LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "role_id": user.role_id,
            "avatar_url": user.avatar_url,
        },
    )


@router.post("/2fa/verify", response_model=schemas.LoginResponse)
def verify_2fa(request: schemas.TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    # Validar token temporal
    user_id = security.decode_temp_token(request.temp_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Sesión expirada o inválida")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validar código TOTP
    totp = security.get_totp(user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Código incorrecto")

    # Generar token real
    access_token = security.create_access_token(user.id)
    user.last_login = datetime.utcnow()
    db.commit()

    return schemas.LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "role_id": user.role_id,
            "avatar_url": user.avatar_url,
        },
    )


# --- Rutas protegidas para configurar 2FA (Requieren estar logueado) ---
# Nota: Para usar estas, necesitarás implementar una dependencia 'get_current_user'
# Por ahora las dejamos preparadas.


@router.get("/2fa/setup", response_model=schemas.TwoFactorSetupResponse)
def setup_2fa(user_id: str, db: Session = Depends(get_db)):
    # IMPORTANTE: En producción, no pasar user_id por parámetro,
    # obtenerlo del token de sesión actual (dependencies=[Depends(get_current_user)])

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    secret = security.generate_2fa_secret()
    totp = security.get_totp(secret)

    # Nombre que aparecerá en Google Authenticator
    uri = totp.provisioning_uri(name=user.email, issuer_name="TMS Sistema")

    # Guardamos el secreto temporalmente (o podrías guardarlo solo al confirmar)
    user.two_factor_secret = secret
    db.commit()

    return schemas.TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{security.generate_qr_code(uri)}",
        manual_entry_key=secret,
    )


@router.post("/2fa/enable")
def enable_2fa(
    request: schemas.TwoFactorEnableRequest,
    user_id: str = Body(..., embed=True),  # Temporal hasta tener current_user
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Configuración no iniciada")

    totp = security.get_totp(user.two_factor_secret)
    if not totp.verify(request.code):
        raise HTTPException(status_code=400, detail="Código incorrecto")

    user.is_2fa_enabled = True
    db.commit()
    return {"message": "2FA Activado correctamente"}
