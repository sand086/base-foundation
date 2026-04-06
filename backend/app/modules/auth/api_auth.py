from datetime import datetime
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    Request,
)
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.db.database import get_db
from app.models import models
from app.schemas import auth as schemas
from app.core import security
from app.core.config import settings

# Importamos nuestra función de auditoría
from app.crud.audit import log_audit

router = APIRouter(tags=["Authentication"])

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


# -----------------------------------------------------------------------------
# DEPENDENCIES (VALIDACIÓN DE ACCESS TOKEN)
# -----------------------------------------------------------------------------
async def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )

        # Verificamos que sea un token de acceso, no de refresh ni temporal
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=401, detail="Tipo de token inválido para esta operación"
            )

        token_sub = payload.get("sub")
        if token_sub is None:
            raise HTTPException(status_code=401, detail="Token inválido")

        user_id = int(token_sub)

    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="No se pudo validar el token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


async def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user


# -----------------------------------------------------------------------------
# ENDPOINTS
# -----------------------------------------------------------------------------


@router.post("/login", response_model=schemas.LoginResponse)
def login(
    request_data: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)
):
    # 1. Buscar usuario
    user = db.query(models.User).filter(models.User.email == request_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # 2. Verificar password
    if not security.verify_password(request_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    # 3. Flujo 2FA (Retorno anticipado con token temporal)
    if user.is_2fa_enabled and user.two_factor_secret:
        temp_token = security.generate_temp_token(str(user.id))
        return schemas.LoginResponse(
            require_2fa=True,
            temp_token=temp_token,
            user=None,
            access_token=None,
            refresh_token=None,
        )

    # 4. Login Directo (Sin 2FA)
    access_token = security.create_access_token(subject=str(user.id))
    refresh_token = security.create_refresh_token(subject=str(user.id))

    # 5. Persistencia y Auditoría
    user.last_login = datetime.utcnow()
    user.refresh_token = refresh_token  # 💾 Guardamos en BD para validación
    db.commit()

    cliente_ip = request.client.host if request.client else "Desconocida"
    log_audit(
        db=db,
        user_id=user.id,
        accion="Inicio de sesión exitoso",
        tipo_accion="login",
        modulo="Auth",
        detalles="Acceso mediante contraseña y Refresh Token generado",
        ip=cliente_ip,
        dispositivo=request.headers.get("user-agent", "Desconocido")[:250],
    )

    return schemas.LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        require_2fa=False,
        user=user,
    )


@router.post("/refresh", response_model=schemas.LoginResponse)
def refresh_token(
    payload: schemas.RefreshRequest, request: Request, db: Session = Depends(get_db)
):
    """
    Usa el Refresh Token (7 días) para obtener un nuevo Access Token (12 horas).
    """
    try:
        # 1. Validar firma y expiración del JWT
        data = jwt.decode(
            payload.refresh_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )

        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token no es de tipo Refresh")

        user_id = data.get("sub")

        # 2. Validar contra la Base de Datos (Seguridad extra: Revocación)
        user = (
            db.query(models.User)
            .filter(
                models.User.id == user_id,
                models.User.refresh_token == payload.refresh_token,
            )
            .first()
        )

        if not user or not user.activo:
            raise HTTPException(
                status_code=401, detail="Sesión expirada o cuenta inhabilitada"
            )

        # 3. Generar nuevo Access Token
        new_access_token = security.create_access_token(subject=user.id)

        # 4. Auditoría silenciosa
        cliente_ip = request.client.host if request.client else "Desconocida"
        log_audit(
            db=db,
            user_id=user.id,
            accion="Renovación de token",
            tipo_accion="refresh",
            modulo="Auth",
            detalles="Se generó nuevo Access Token de 12h",
            ip=cliente_ip,
            dispositivo=request.headers.get("user-agent", "Desconocido")[:250],
        )

        return schemas.LoginResponse(
            access_token=new_access_token,
            refresh_token=user.refresh_token,  # Mantenemos el mismo refresh
            user=user,
        )
    except JWTError:
        raise HTTPException(
            status_code=401, detail="La sesión ha caducado por completo"
        )


@router.post("/verify-2fa", response_model=schemas.LoginResponse)
def verify_2fa(
    request_data: schemas.TwoFactorVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    # Validar token temporal
    user_id_str = security.decode_temp_token(request_data.temp_token)
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Sesión temporal expirada")

    user_id = int(user_id_str)
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user or not user.activo:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o inactivo")

    # Validar código TOTP
    totp = security.get_totp(user.two_factor_secret)
    if not totp.verify(request_data.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Código incorrecto")

    # Login Exitoso - Generar ambos tokens
    access_token = security.create_access_token(subject=str(user.id))
    refresh_token = security.create_refresh_token(subject=str(user.id))

    user.last_login = datetime.utcnow()
    user.refresh_token = refresh_token
    db.commit()

    cliente_ip = request.client.host if request.client else "Desconocida"
    log_audit(
        db=db,
        user_id=user.id,
        accion="Inicio de sesión 2FA exitoso",
        tipo_accion="login",
        modulo="Auth",
        detalles="Acceso verificado con código de autenticador",
        ip=cliente_ip,
        dispositivo=request.headers.get("user-agent", "Desconocido")[:250],
    )

    return schemas.LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        require_2fa=False,
        user=user,
    )


@router.post("/logout")
def logout(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Invalida el Refresh Token del usuario en la base de datos.
    """
    # 1. Limpiar el token en la DB
    current_user.refresh_token = None
    db.commit()

    # 2. Registrar en Auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    log_audit(
        db=db,
        user_id=current_user.id,
        accion="Cierre de sesión",
        tipo_accion="logout",
        modulo="Auth",
        detalles="Sesión cerrada y Refresh Token invalidado",
        ip=cliente_ip,
        dispositivo=request.headers.get("user-agent", "Desconocido")[:250],
    )

    return {"message": "Sesión cerrada correctamente"}


# --- Rutas Protegidas (Configuración) ---


@router.get("/2fa/setup", response_model=schemas.TwoFactorSetupResponse)
def setup_2fa(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    secret = security.generate_2fa_secret()
    totp = security.get_totp(secret)

    uri = totp.provisioning_uri(name=current_user.email, issuer_name="TMS Sistema")

    current_user.two_factor_secret = secret
    db.commit()

    return schemas.TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{security.generate_qr_code(uri)}",
        manual_entry_key=secret,
    )


@router.post("/2fa/enable")
def enable_2fa(
    request_data: schemas.TwoFactorEnableRequest,
    request: Request,  # <--- Agregado para auditoría
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != request_data.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    if not current_user.two_factor_secret:
        raise HTTPException(
            status_code=400, detail="Debe solicitar configuración primero"
        )

    totp = security.get_totp(current_user.two_factor_secret)
    if not totp.verify(request_data.code):
        raise HTTPException(status_code=400, detail="Código incorrecto")

    current_user.is_2fa_enabled = True
    db.commit()

    # ==========================================
    # AUDITORÍA: Registrar Activación de 2FA
    # ==========================================
    cliente_ip = request.client.host if request.client else "Desconocida"

    log_audit(
        db=db,
        user_id=current_user.id,
        accion="Activó Autenticación de Dos Factores",
        tipo_accion="seguridad",
        modulo="Seguridad",
        detalles="2FA habilitado correctamente",
        ip=cliente_ip,
        dispositivo=request.headers.get("user-agent", "Desconocido")[:250],
    )

    return {"message": "2FA Activado correctamente"}
