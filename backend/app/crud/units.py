from sqlalchemy.orm import Session
from app.models import models
from app.schemas import units as schemas
from datetime import datetime


def get_units(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Unit).offset(skip).limit(limit).all()


def get_unit(db: Session, unit_id: str):
    return db.query(models.Unit).filter(models.Unit.id == unit_id).first()


def create_unit(db: Session, unit: schemas.UnitCreate):
    db_unit = models.Unit(**unit.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


def update_unit(db: Session, unit_id: str, unit_data: schemas.UnitUpdate):
    db_unit = get_unit(db, unit_id)
    if not db_unit:
        return None

    for key, value in unit_data.model_dump(exclude_unset=True).items():
        setattr(db_unit, key, value)

    db_unit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_unit)
    return db_unit


def delete_unit(db: Session, unit_id: str):
    unit = get_unit(db, unit_id)
    if unit:
        db.delete(unit)
        db.commit()
        return True
    return False
