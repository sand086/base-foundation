from sqlalchemy.orm import Session
from app.models import models
from app.schemas import operators as schemas


def get_operators(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Operator).offset(skip).limit(limit).all()


def get_operator(db: Session, operator_id: str):
    return db.query(models.Operator).filter(models.Operator.id == operator_id).first()


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
    for key, value in operator_data.model_dump(exclude_unset=True).items():
        setattr(db_op, key, value)
    db.commit()
    db.refresh(db_op)
    return db_op


def delete_operator(db: Session, operator_id: str):
    op = get_operator(db, operator_id)
    if op:
        db.delete(op)
        db.commit()
        return True
    return False
