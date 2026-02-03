from sqlalchemy.orm import Session
from app.models import models
from app.schemas import finance as schemas


def get_providers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Provider).offset(skip).limit(limit).all()


def create_provider(db: Session, provider: schemas.ProviderCreate):
    db_provider = models.Provider(**provider.model_dump())
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider


def delete_provider(db: Session, provider_id: str):
    provider = (
        db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    )
    if provider:
        db.delete(provider)
        db.commit()
        return True
    return False
