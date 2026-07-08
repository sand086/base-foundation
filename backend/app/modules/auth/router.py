# --- Fuente: api_auth.py ---
import random
from datetime import datetime, timedelta
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    Request,
    UploadFile,
    File,
)
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError, jwt, ExpiredSignatureError
from app.core.security import verify_password
import requests  # <-- NUEVO: Para hacer la petición a Google reCAPTCHA

from app.db.database import get_db
from app.models import models
from app.core import security
from app.core.config import settings
from typing import List, Optional, Dict, Any

from . import schemas
from . import crud

from app.integrations.storage.storage import StorageService
from app.modules.monitoring.crud import log_audit

router = APIRouter(tags=["Authentication"])

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
BYPASS_AUTH = False


# -----------------------------------------------------------------------------
# DEPENDENCIES (VALIDACIÓN DE ACCESS TOKEN)
# -----------------------------------------------------------------------------
async def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.User:
    if BYPASS_AUTH:
        user = db.query(models.User).first()
        if not user:
            raise HTTPException(status_code=404, detail="No hay usuarios en la BD")
        return user

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

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Causa real: {str(e)} | Token: {str(token)[:20]}...",
        )

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
    cliente_ip = request.client.host if request.client else "Desconocida"

    # ==========================================
    # 0. VALIDACIÓN DE reCAPTCHA V3
    # ==========================================
    if (
        settings.GOOGLE_RECAPTCHA_V3_SECRET_KEY
    ):  # Solo validamos si la key existe en el .env
        recaptcha_url = "https://www.google.com/recaptcha/api/siteverify"
        recaptcha_payload = {
            "secret": settings.GOOGLE_RECAPTCHA_V3_SECRET_KEY,
            "response": request_data.recaptcha_token,
        }

        try:
            r = requests.post(recaptcha_url, data=recaptcha_payload, timeout=5)
            result = r.json()

            # Score de 0.0 a 1.0 (1.0 es muy seguro que es humano)
            if not result.get("success") or result.get("score", 0) < 0.5:
                print(
                    f"Bloqueo por Bot detectado en IP: {cliente_ip} - Score: {result.get('score')}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Validación de seguridad fallida. Nuestro sistema detectó actividad sospechosa (Bot).",
                )
        except requests.exceptions.RequestException:
            # Si Google falla en responder, permitimos el login por fallback o lo denegamos según tu preferencia.
            # Por ahora, si Google se cae, mejor dejar entrar al usuario (fail-open)
            print("Advertencia: No se pudo contactar al servidor de Google reCAPTCHA.")

    # ==========================================
    # 1. Buscar usuario
    # ==========================================
    user = db.query(models.User).filter(models.User.email == request_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # 2. Verificar password
    if not security.verify_password(request_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    # 3. Intercepción de Doble Factor (2FA)
    if user.is_2fa_enabled:
        # Generamos un token temporal (válido por 5 min) para este proceso
        temp_token = security.generate_temp_token(str(user.id))

        # ESCENARIO A: El admin activó el switch pero el usuario NO ha configurado su QR
        if not user.two_factor_secret:
            return schemas.LoginResponse(
                require_2fa=True,
                must_setup_2fa=True,  # <-- Avisamos a React que debe ir a /setup-2fa
                temp_token=temp_token,
                user=None,
                access_token=None,
                refresh_token=None,
            )

        # ESCENARIO B: El usuario ya tiene su dispositivo vinculado (Flujo normal)
        return schemas.LoginResponse(
            require_2fa=True,
            must_setup_2fa=False,  # <-- Avisamos a React que debe ir a /verify-2fa
            temp_token=temp_token,
            user=None,
            access_token=None,
            refresh_token=None,
        )

    # 4. Login Directo (Sin 2FA)
    access_token = security.create_access_token(subject=str(user.id))
    refresh_token = security.create_refresh_token(subject=str(user.id))

    # 5. Persistencia y Registro de Auditoría
    user.last_login = datetime.utcnow()
    user.refresh_token = refresh_token
    user.updated_by_id = (
        user.id
    )  # <--- AUDITORÍA: El propio usuario actualizó su registro al loguearse
    db.commit()

    log_audit(
        db=db,
        user_id=user.id,
        accion="Inicio de sesión exitoso",
        tipo_accion="login",
        modulo="Auth",
        detalles="Acceso mediante contraseña (Sin 2FA)",
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

        # 4. Registro de detalles silenciosa
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
    user.updated_by_id = user.id  # <--- AUDITORÍA
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
    current_user.updated_by_id = current_user.id  # <--- AUDITORÍA
    db.commit()

    # 2. Registrar en Registro de detalles
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
    current_user.updated_by_id = current_user.id  # <--- AUDITORÍA
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
    current_user.updated_by_id = current_user.id  # <--- AUDITORÍA
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


# =========================================================
# ROLES (Deben ir primero para evitar conflicto con {user_id})
# =========================================================


@router.get("/roles", response_model=List[schemas.RoleResponse])
def read_roles(db: Session = Depends(get_db)):
    """Lista todos los roles disponibles"""
    return crud.get_roles(db)


@router.post("/roles", response_model=schemas.RoleResponse)
def create_role(
    payload: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    # name_key es unique en el modelo
    if crud.get_role_by_key(db, payload.name_key):
        raise HTTPException(status_code=400, detail="Ya existe un rol con ese name_key")
    return crud.create_role(db, payload, current_user.id)  # <--- AUDITORÍA


@router.get("/roles/{role_id}", response_model=schemas.RoleResponse)
def read_role(role_id: int, db: Session = Depends(get_db)):
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


@router.put("/roles/{role_id}", response_model=schemas.RoleResponse)
def update_role(
    role_id: int,
    payload: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    if payload.name_key:
        exists = crud.get_role_by_key(db, payload.name_key)
        if exists and exists.id != role_id:
            raise HTTPException(
                status_code=400, detail="Ya existe un rol con ese name_key"
            )

    role = crud.update_role(db, role_id, payload, current_user.id)  # <--- AUDITORÍA
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    result = crud.delete_role(db, role_id, current_user.id)  # <--- AUDITORÍA
    if result is False:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    if result is None:
        raise HTTPException(
            status_code=400, detail="No se puede eliminar: hay usuarios usando este rol"
        )
    return {"message": "Rol eliminado"}


@router.get("/roles/{role_id}/permisos", response_model=Dict[str, Any])
def read_role_permissions(role_id: int, db: Session = Depends(get_db)):
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role.permisos or {}


# =========================================================
# AUDIT LOGS (Ruta estática)
# =========================================================


@router.get("/audit-logs")
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload

    logs = (
        db.query(models.AuditLog)
        .options(joinedload(models.AuditLog.user))
        .order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        usuario_nombre = "Sistema"
        if log.user:
            usuario_nombre = f"{log.user.nombre} {log.user.apellido or ''}".strip()

        result.append(
            {
                "id": str(log.id),
                "usuario": usuario_nombre,
                "accion": log.accion,
                "tipoAccion": log.tipo_accion,
                "modulo": log.modulo,
                "detalles": log.detalles or "",
                "ip": log.ip or "N/A",
                "fechaHora": log.created_at.isoformat(),
                "dispositivo": log.dispositivo or "N/A",
            }
        )
    return result


# =========================================================
# USERS - MI PERFIL
# =========================================================


@router.get("/me", response_model=schemas.UserResponse)
def read_user_me(current_user: models.User = Depends(get_current_active_user)):
    """Devuelve la información del usuario logueado"""
    return current_user


# =========================================================
# USERS - OPERACIONES GENERALES
# =========================================================


@router.get("", response_model=List[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)

    for user in users:
        user.password = security.decrypt_password(user.password_hash)

    return users


@router.post("", response_model=schemas.UserResponse)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="El correo ya existe")

    if payload.role_id is not None:
        role = crud.get_role(db, payload.role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

    user = crud.create_user(db, payload, current_user.id)  # <--- AUDITORÍA
    # Mandar contraseña desencriptada al crearlo
    user.password = security.decrypt_password(user.password_hash)
    return user


# =========================================================
# USERS - OPERACIONES POR ID (Al final para evitar conflictos)
# =========================================================


@router.get("/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Desencriptar
    user.password = security.decrypt_password(user.password_hash)
    return user


@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    if payload.email:
        existing = crud.get_user_by_email(db, payload.email)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="El correo ya existe")

    if payload.role_id is not None:
        role = crud.get_role(db, payload.role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol no encontrado")

    user = crud.update_user(db, user_id, payload, current_user.id)  # <--- AUDITORÍA
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Desencriptar tras actualizar
    user.password = security.decrypt_password(user.password_hash)
    return user


@router.patch("/{user_id}/status")
def toggle_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    status_value = crud.toggle_user_status(
        db, user_id, current_user.id
    )  # <--- AUDITORÍA
    if status_value is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"activo": status_value}


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: schemas.PasswordReset,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    ok = crud.reset_password(
        db, user_id, payload.new_password, current_user.id
    )  # <--- AUDITORÍA
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Contraseña actualizada"}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # <--- AUDITORÍA PARAM
):
    ok = crud.delete_user(db, user_id, current_user.id)  # <--- AUDITORÍA
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}


@router.post("/{user_id}/avatar")
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # 1. Verificar existencia del usuario
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Guardar físicamente usando el StorageService
    try:
        storage_data = StorageService.save_file(
            file, folder="avatars", prefix=f"USER_{user_id}"
        )

        # 3. Actualizar solo el campo avatar_url en la BD
        user.avatar_url = storage_data["url"]
        user.updated_by_id = (
            current_user.id
        )  # <--- AUDITORÍA: Registrar subida de avatar
        db.commit()
        db.refresh(user)

        return {"avatar_url": user.avatar_url}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al guardar imagen: {str(e)}"
        )


@router.post("/request-emergency-code")
async def request_emergency_code(
    payload: schemas.EmergencyRequest, db: Session = Depends(get_db)
):
    # 1. Validamos el token temporal del login previo
    user_id = security.decode_temp_token(payload.temp_token)
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no válido")

    # 2. Generamos código de 6 dígitos
    code = f"{random.randint(100000, 999999)}"

    # 3. Guardamos con expiración de 5 minutos
    user.emergency_code = code
    user.emergency_code_expires = datetime.utcnow() + timedelta(minutes=5)
    user.updated_by_id = (
        user.id
    )  # <--- AUDITORÍA: El propio usuario pidió el código de emergencia
    db.commit()

    # 4. DISPARAR EMAIL (Aquí llamas a tu EmailService)
    # email_service.send_2fa_emergency(user.email, code)

    return {"message": "Código enviado", "expires_in": 300}


class VerifyPasswordRequest(BaseModel):
    password: str


@router.post("/verify-password")
def verify_user_password(
    request: VerifyPasswordRequest,
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Verifica la contraseña del usuario en sesión para operaciones críticas.
    """
    #  FIX: Cambiado a current_user.password_hash
    if not security.verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña de autorización es incorrecta.",
        )
    return {"status": "success", "message": "Identidad confirmada."}


# =====================================================================
# SCRIPT TEMPORAL: MIGRACIÓN DE CONTRASEÑAS A ENCRIPTACIÓN REVERSIBLE
# =====================================================================


@router.post("/dev/migrar-contrasenas")
def migrar_todas_las_contrasenas(db: Session = Depends(get_db)):
    """
    Este endpoint recorre todos los usuarios y cambia su contraseña a "Temp086."
    usando la nueva encriptación reversible (Fernet).
    """
    from app.core import security

    # Obtener todos los usuarios, incluso los inactivos
    users = db.query(models.User).all()

    contador = 0
    for user in users:
        # Encriptamos la nueva contraseña temporal
        nuevo_hash_reversible = security.get_password_hash("Temp086.")
        user.password_hash = nuevo_hash_reversible
        contador += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Se han migrado {contador} usuarios. Su nueva contraseña visible es Temp086.",
    }


@router.post("/2fa/setup-temp", response_model=schemas.TwoFactorSetupResponse)
def setup_2fa_temp(
    temp_token: str = Body(..., embed=True), db: Session = Depends(get_db)
):
    # Validamos el token temporal
    user_id = security.decode_temp_token(temp_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Sesión expirada")

    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Generamos secreto y QR al vuelo
    secret = security.generate_2fa_secret()
    user.two_factor_secret = secret  # Lo guardamos provisionalmente
    user.updated_by_id = user.id  # <--- AUDITORÍA
    db.commit()

    totp = security.get_totp(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="TMS Sistema")

    return schemas.TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{security.generate_qr_code(uri)}",
        manual_entry_key=secret,
    )


# -----------------------------------------------------------------------------
# NUEVO: DEPENDENCY DE PERMISOS (RBAC)
# -----------------------------------------------------------------------------
class RequirePermission:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: models.User = Depends(get_current_active_user)):
        # 1. Bypass para Super Administradores (Opcional, ajusta el name_key a tu gusto)
        if current_user.role and current_user.role.name_key == "superadmin":
            return current_user

        # 2. Verificar que tenga rol y permisos asignados
        if not current_user.role or not current_user.role.permisos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. No tienes permisos configurados.",
            )

        permisos = current_user.role.permisos

        # 3. Lógica de evaluación flexible del JSONB
        # Soporta formato plano: {"finance:cancel_invoice": True}
        if (
            isinstance(permisos, dict)
            and permisos.get(self.required_permission) is True
        ):
            return current_user

        # Soporta formato anidado: {"finance": {"cancel_invoice": True}}
        parts = self.required_permission.split(":")
        if len(parts) == 2:
            module, action = parts
            if (
                isinstance(permisos.get(module), dict)
                and permisos[module].get(action) is True
            ):
                return current_user

        # Soporta formato de lista plana: ["finance:cancel_invoice"]
        if isinstance(permisos, list) and self.required_permission in permisos:
            return current_user

        # Si no pasó ninguna validación, se rechaza la petición
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permiso denegado. Requiere el privilegio: '{self.required_permission}'",
        )
