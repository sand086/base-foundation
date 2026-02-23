from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File


from app.api.endpoints.auth import get_current_user

from app.services.storage import StorageService

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models import models
from app.models.models import User

from app.schemas import operators as schemas
from app.crud import operators as crud

router = APIRouter()


@router.get("/operators", response_model=List[schemas.OperatorResponse])
def read_operators(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_operators(db, skip, limit)


@router.post("/operators", response_model=schemas.OperatorResponse)
def create_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    if (
        db.query(models.Operator)
        .filter(models.Operator.license_number == operator.license_number)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Licencia ya registrada")
    return crud.create_operator(db, operator)


@router.put("/operators/{operator_id}", response_model=schemas.OperatorResponse)
def update_operator(
    operator_id: int,
    operator: schemas.OperatorUpdate,
    db: Session = Depends(get_db),  # <--- int
):
    db_op = crud.update_operator(db, operator_id, operator)
    if not db_op:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return db_op


@router.delete("/operators/{operator_id}")
def delete_operator(operator_id: int, db: Session = Depends(get_db)):
    if not crud.delete_operator(db, operator_id):
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return {"message": "Operador eliminado"}


@router.post("/operators/{operator_id}/documents/{doc_type}")
async def upload_operator_document(
    operator_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validar operador
    operator = (
        db.query(models.Operator).filter(models.Operator.id == operator_id).first()
    )
    if not operator:
        raise HTTPException(status_code=404, detail="Operador no encontrado")

    # 2. Guardar físico
    storage_data = StorageService.save_file(
        file, folder="operators", prefix=f"OP_{operator_id}"
    )

    # 3. Versionamiento: Desactivar la activa anterior
    db.query(models.OperatorDocumentHistory).filter(
        models.OperatorDocumentHistory.operator_id == operator_id,
        models.OperatorDocumentHistory.document_type == doc_type,
        models.OperatorDocumentHistory.is_active == True,
    ).update({"is_active": False})

    # 4. Calcular versión
    last_v = (
        db.query(func.max(models.OperatorDocumentHistory.version))
        .filter(
            models.OperatorDocumentHistory.operator_id == operator_id,
            models.OperatorDocumentHistory.document_type == doc_type,
        )
        .scalar()
        or 0
    )

    # 5. Crear registro
    new_doc = models.OperatorDocumentHistory(
        operator_id=operator_id,
        document_type=doc_type,
        filename=storage_data["filename"],
        file_url=storage_data["url"],
        file_size=storage_data["size"],
        mime_type=storage_data["mime_type"],
        version=last_v + 1,
        is_active=True,
        created_by_id=current_user.id,
    )

    # 6. Actualizar puntero en tabla principal (Opcional, muy útil)
    field_name = f"{doc_type}_url"
    if hasattr(operator, field_name):
        setattr(operator, field_name, storage_data["url"])

    db.add(new_doc)
    db.commit()
    return {"url": new_doc.file_url, "version": new_doc.version}


@router.get("/operators/{operator_id}/documents/{doc_type}/history")
def get_operator_document_history(
    operator_id: int, doc_type: str, db: Session = Depends(get_db)
):
    """Retorna todas las versiones de un documento específico de un operador"""
    return (
        db.query(models.OperatorDocumentHistory)
        .filter(
            models.OperatorDocumentHistory.operator_id == operator_id,
            models.OperatorDocumentHistory.document_type == doc_type,
        )
        .order_by(models.OperatorDocumentHistory.version.desc())
        .all()
    )
