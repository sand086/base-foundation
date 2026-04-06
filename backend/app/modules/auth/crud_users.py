from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import models
from app.models.models import RecordStatus
from app.schemas import users as schemas
from app.core.security import get_password_hash


# =========================================================
# USERS
# =========================================================


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.User)
        .options(joinedload(models.User.role))
        .filter(models.User.record_status != RecordStatus.ELIMINADO)
        .order_by(models.User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_user(db: Session, user_id: int):
    return (
        db.query(models.User)
        .options(joinedload(models.User.role))
        .filter(
            models.User.id == user_id,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def get_user_by_email(db: Session, email: str):
    return (
        db.query(models.User)
        .filter(
            models.User.email == email,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_user(db: Session, payload: schemas.UserCreate):
    """
    - Hashea password -> password_hash
    - Si preferencias viene None, NO la mandamos para que aplique default del modelo.
    """
    data = payload.model_dump(
        exclude={"password"},
        exclude_unset=True,
        exclude_none=True,  # <- CLAVE para preferencias=None
    )

    db_user = models.User(
        **data,
        password_hash=get_password_hash(payload.password),
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return get_user(db, db_user.id)


def update_user(db: Session, user_id: int, payload: schemas.UserUpdate):
    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not user:
        return None

    data = payload.model_dump(exclude_unset=True)

    # bloquear auditoría / record_status (se controla por delete)
    for k in (
        "created_at",
        "updated_at",
        "created_by_id",
        "updated_by_id",
        "record_status",
    ):
        data.pop(k, None)

    for k, v in data.items():
        setattr(user, k, v)

    db.add(user)
    db.commit()
    db.refresh(user)
    return get_user(db, user_id)


def toggle_user_status(db: Session, user_id: int):
    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not user:
        return None

    user.activo = not bool(user.activo)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.activo


def reset_password(db: Session, user_id: int, new_password: str):
    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not user:
        return False

    user.password_hash = get_password_hash(new_password)
    db.add(user)
    db.commit()
    return True


def delete_user(db: Session, user_id: int):
    """
    Soft delete:
    - record_status = ELIMINADO
    - activo = False
    """
    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not user:
        return False

    user.record_status = RecordStatus.ELIMINADO
    user.activo = False
    db.add(user)
    db.commit()
    return True


# =========================================================
# ROLES
# =========================================================


def get_roles(db: Session):
    return (
        db.query(models.Role)
        .filter(models.Role.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Role.id.asc())
        .all()
    )


def get_role(db: Session, role_id: int):
    return (
        db.query(models.Role)
        .filter(
            models.Role.id == role_id,
            models.Role.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def get_role_by_key(db: Session, name_key: str):
    return (
        db.query(models.Role)
        .filter(
            models.Role.name_key == name_key,
            models.Role.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_role(db: Session, payload: schemas.RoleCreate):
    data = payload.model_dump(exclude_unset=True)
    db_role = models.Role(**data)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


def update_role(db: Session, role_id: int, payload: schemas.RoleUpdate):
    role = (
        db.query(models.Role)
        .filter(
            models.Role.id == role_id,
            models.Role.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not role:
        return None

    data = payload.model_dump(exclude_unset=True)

    for k in (
        "created_at",
        "updated_at",
        "created_by_id",
        "updated_by_id",
        "record_status",
    ):
        data.pop(k, None)

    for k, v in data.items():
        setattr(role, k, v)

    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role_id: int):
    role = (
        db.query(models.Role)
        .filter(
            models.Role.id == role_id,
            models.Role.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not role:
        return False

    in_use = (
        db.query(models.User)
        .filter(
            models.User.role_id == role_id,
            models.User.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if in_use:
        return None  # “no se puede borrar, está en uso”

    role.record_status = RecordStatus.ELIMINADO
    db.add(role)
    db.commit()
    return True
