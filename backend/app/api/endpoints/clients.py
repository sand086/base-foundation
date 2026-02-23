from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.models.models import User, ClientDocumentHistory, Client, AuditLog
from app.schemas import clients as schemas
from app.schemas.clients import ClientDocumentResponse

from app.crud import clients as crud
from app.api.endpoints.auth import get_current_user
from fastapi import UploadFile, File
from sqlalchemy import func

from app.services.storage import StorageService


router = APIRouter()


@router.get("/clients", response_model=List[schemas.ClientResponse])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_clients(db, skip=skip, limit=limit)


@router.get("/clients/{client_id}", response_model=schemas.ClientResponse)
def read_client(client_id: int, db: Session = Depends(get_db)):  # <--- Cambio a int
    db_client = crud.get_client(db, client_id=client_id)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client


@router.post("/clients", response_model=schemas.ClientResponse)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Client).filter(models.Client.rfc == client.rfc).first()
    if existing:
        raise HTTPException(status_code=400, detail="El RFC ya está registrado")
    return crud.create_client(db=db, client=client)


@router.put("/clients/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: int,
    client: schemas.ClientUpdate,
    db: Session = Depends(get_db),  # <--- Cambio a int
):
    db_client = crud.update_client(db, client_id=client_id, client_data=client)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client


@router.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):  # <--- Cambio a int
    success = crud.delete_client(db, client_id=client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}


@router.post("/clients/{client_id}/documents/{doc_type}")
async def upload_client_document(
    client_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verificar existencia del cliente
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # 2. Guardar archivo físico usando el StorageService
    storage_data = StorageService.save_file(
        file, folder="clients", prefix=f"CLI_{client_id}"
    )

    # 3. Desactivar versión activa actual (Atomic Update)
    db.query(ClientDocumentHistory).filter(
        ClientDocumentHistory.client_id == client_id,
        ClientDocumentHistory.document_type == doc_type,
        ClientDocumentHistory.is_active == True,
    ).update({"is_active": False})

    # 4. Calcular siguiente número de versión
    last_v = (
        db.query(func.max(ClientDocumentHistory.version))
        .filter(
            ClientDocumentHistory.client_id == client_id,
            ClientDocumentHistory.document_type == doc_type,
        )
        .scalar()
        or 0
    )

    # 5. Crear nueva versión del documento
    new_doc = ClientDocumentHistory(
        client_id=client_id,
        document_type=doc_type,
        filename=storage_data["filename"],
        file_url=storage_data["url"],
        file_size=storage_data["size"],
        mime_type=storage_data["mime_type"],
        version=last_v + 1,
        is_active=True,
        created_by_id=current_user.id,
    )

    db.add(new_doc)

    # 6. (Opcional) Actualizar URL en la tabla principal si tienes el campo
    # Por ejemplo: si doc_type es 'rfc', actualiza client.rfc_url
    field_name = f"{doc_type}_url"
    if hasattr(client, field_name):
        setattr(client, field_name, storage_data["url"])

    db.commit()
    db.refresh(new_doc)

    return {
        "url": new_doc.file_url,
        "version": new_doc.version,
        "message": "Documento versionado con éxito",
    }


@router.get("/clients/{client_id}/documents/{doc_type}/history")
def get_client_document_history(
    client_id: int, doc_type: str, db: Session = Depends(get_db)
):
    """Retorna todas las versiones de un documento específico de un cliente"""
    return (
        db.query(ClientDocumentHistory)
        .filter(
            ClientDocumentHistory.client_id == client_id,
            ClientDocumentHistory.document_type == doc_type,
        )
        .order_by(ClientDocumentHistory.version.desc())
        .all()
    )


@router.delete("/documents/{document_id}")
async def delete_client_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Obtener el documento
    doc = (
        db.query(ClientDocumentHistory)
        .filter(ClientDocumentHistory.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # 2. Guardar en Auditoría antes de borrar
    audit_entry = AuditLog(
        user_id=current_user.id,
        accion=f"Eliminó versión v{doc.version} del documento: {doc.filename}",
        tipo_accion="eliminar",
        modulo="Clientes/Expediente",
        detalles=f"Cliente ID: {doc.client_id}, Tipo Doc: {doc.document_type}",
    )
    db.add(audit_entry)

    # 3. Borrado lógico (Soft Delete)
    doc.record_status = "E"
    if doc.is_active:
        doc.is_active = False

    db.commit()
    return {"message": "Documento eliminado correctamente"}
