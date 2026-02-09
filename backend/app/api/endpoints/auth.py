from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.db.database import get_db
from app.models import models
from app.schemas import auth as schemas
from app.core import security
from app.core.config import settings

router = APIRouter(tags=["Authentication"])

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# -----------------------------------------------------------------------------
# DEPENDENCIES (Moveremos esto aquí para uso local en este archivo)
# -----------------------------------------------------------------------------
async def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(reusable_oauth2)
) -> models.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_sub = payload.get("sub")
        if token_sub is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # CONVERSION CRITICA: JWT guarda string, DB usa Integer
        user_id = int(token_sub) 
        
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="No se pudo validar el token")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user


# -----------------------------------------------------------------------------
# ENDPOINTS
# -----------------------------------------------------------------------------

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

    # 3. Flujo 2FA (Retorno anticipado)
    if user.is_2fa_enabled and user.two_factor_secret:
        # Generar token temporal
        # Convertimos ID a string para el token, pero sabiendo que es int originalmente
        temp_token = security.generate_temp_token(str(user.id)) 

        return schemas.LoginResponse(
            require_2fa=True,
            temp_token=temp_token,
            user=None # No enviamos datos completos hasta verificar
        )

    # 4. Login Directo (Sin 2FA)
    access_token = security.create_access_token(subject=str(user.id))

    # Actualizar último login
    user.last_login = datetime.utcnow()
    db.commit()

    return schemas.LoginResponse(
        access_token=access_token,
        require_2fa=False,
        user=user # Pydantic hará el map de user.id (int) a schema.id (int)
    )


@router.post("/2fa/verify", response_model=schemas.LoginResponse)
def verify_2fa(request: schemas.TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    # Validar token temporal
    user_id_str = security.decode_temp_token(request.temp_token)
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Sesión expirada o inválida")

    user_id = int(user_id_str) # Conversión a int
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validar código TOTP
    totp = security.get_totp(user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Código incorrecto")

    # Login Exitoso
    access_token = security.create_access_token(subject=str(user.id))
    user.last_login = datetime.utcnow()
    db.commit()

    return schemas.LoginResponse(
        access_token=access_token,
        require_2fa=False,
        user=user
    )


# --- Rutas Protegidas (Configuración) ---

@router.get("/2fa/setup", response_model=schemas.TwoFactorSetupResponse)
def setup_2fa(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    secret = security.generate_2fa_secret()
    totp = security.get_totp(secret)
    
    uri = totp.provisioning_uri(name=current_user.email, issuer_name="TMS Sistema")

    # Guardamos temporalmente el secreto
    current_user.two_factor_secret = secret
    db.commit()

    return schemas.TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{security.generate_qr_code(uri)}",
        manual_entry_key=secret,
    )


@router.post("/2fa/enable")
def enable_2fa(
    request: schemas.TwoFactorEnableRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Verificamos que el usuario logueado sea el mismo que el request (seguridad extra)
    if current_user.id != request.user_id:
         raise HTTPException(status_code=403, detail="No autorizado")

    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Debe solicitar configuración primero")

    totp = security.get_totp(current_user.two_factor_secret)
    if not totp.verify(request.code):
        raise HTTPException(status_code=400, detail="Código incorrecto")

    current_user.is_2fa_enabled = True
    db.commit()
    
    return {"message": "2FA Activado correctamente"}