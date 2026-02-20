from sqlalchemy.orm import Session

from app.models import models
from app.models.models import RecordStatus
from app.schemas import operators as schemas


# =========================================================
# OPERATORS - CRUD con AuditMixin + Soft Delete (E)
# Reglas:
# - No mostrar record_status = E
# - record_status = I sí se muestra
# - Delete => record_status = E (no delete físico)
# - Update puede cambiar record_status si viene explícito (A/I)
# =========================================================


def get_operators(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Operator)
        .filter(models.Operator.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Operator.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_operator(db: Session, operator_id: str):
    return (
        db.query(models.Operator)
        .filter(
            models.Operator.id == operator_id,
            models.Operator.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_operator(db: Session, operator: schemas.OperatorCreate):
    db_op = models.Operator(**operator.model_dump())
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


def update_operator(
    db: Session, operator_id: str, operator_data: schemas.OperatorUpdate
):
    db_op = get_operator(db, operator_id)
    if not db_op:
        return None

    data = operator_data.model_dump(exclude_unset=True)

    # Actualiza solo lo que venga (y evita pisar con None salvo que tu schema lo mande explícito)
    for key, value in data.items():
        if value is not None:
            setattr(db_op, key, value)

    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


def delete_operator(db: Session, operator_id: str):
    db_op = (
        db.query(models.Operator)
        .filter(
            models.Operator.id == operator_id,
            models.Operator.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not db_op:
        return False

    db_op.record_status = RecordStatus.ELIMINADO
    db.add(db_op)
    db.commit()
    return True
