from sqlalchemy.orm import Session
from app.models import models
from app.schemas import units as schemas
from datetime import datetime


def get_units(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Unit).offset(skip).limit(limit).all()


def get_unit(db: Session, unit_id: int):
    return db.query(models.Unit).filter(models.Unit.id == unit_id).first()

def get_unit_by_eco(db: Session, numero_economico: str):
    return db.query(models.Unit).filter(models.Unit.numero_economico == numero_economico).first()


def create_unit(db: Session, unit: schemas.UnitCreate):
    db_unit = models.Unit(**unit.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


def update_unit(db: Session, unit_id: str, unit_data: schemas.UnitUpdate):
    # +++ CORRECCIÓN: Convertir unit_id a int si es posible +++
    try:
        uid = int(unit_id)
        db_unit = get_unit(db, uid)
    except ValueError:
        return None # No es un ID válido
    
    if not db_unit:
        return None

    for key, value in unit_data.model_dump(exclude_unset=True).items():
        setattr(db_unit, key, value)

    db_unit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_unit)
    return db_unit

def delete_unit(db: Session, unit_id: str):
    # +++ CORRECCIÓN: Convertir a int +++
    try:
        uid = int(unit_id)
        unit = get_unit(db, uid)
    except ValueError:
        return False

    if unit:
        db.delete(unit)
        db.commit()
        return True
    return False
