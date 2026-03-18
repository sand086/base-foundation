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


def get_indirect_categories(db: Session):
    return db.query(models.IndirectExpenseCategory).all()


def get_bank_accounts(db: Session):

    return db.query(models.BankAccount).all()


def get_bank_accounts(db: Session):
    return (
        db.query(models.BankAccount)
        .filter(models.BankAccount.record_status == "A")
        .all()
    )


def create_bank_account(db: Session, account: schemas.BankAccountCreate, user_id: int):
    db_account = models.BankAccount(**account.model_dump(), created_by_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


def get_bank_movements(db: Session):
    return (
        db.query(models.BankMovement).order_by(models.BankMovement.fecha.desc()).all()
    )
