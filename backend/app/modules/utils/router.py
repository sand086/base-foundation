import os
import shutil
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.models import models
from app.models.models import Client, Operator, Unit

router = APIRouter(tags=["Utilities"])

#  DICCIONARIO DE SEGURIDAD (WHITELIST)
# Solo permitimos validar estas tablas y las conectamos a su Modelo real de SQLAlchemy
ALLOWED_MODELS = {
    "clients": Client,
    "operators": Operator,
    "units": Unit,
    # "units": Unit, etc...
}

RECEIPT_MODELS = {
    "cxp_payment": {"model": models.InvoicePayment, "column": "comprobante_url"},
    "cxc_payment": {
        "model": models.ReceivableInvoicePayment,
        "column": "comprobante_url",
    },
    "bank_movement": {"model": models.BankMovement, "column": "comprobante_url"},
    "trip_delivery": {"model": models.Trip, "column": "comprobante_entrega_url"},
}


class ValidationResponse(BaseModel):
    is_valid: bool
    error: Optional[str] = None


@router.get("/validate-field", response_model=ValidationResponse)
def validate_dynamic_field(
    table: str = Query(..., description="Nombre de la tabla permitida"),
    field: str = Query(..., description="Nombre de la columna"),
    value: str = Query(..., description="Valor a validar"),
    exclude_id: Optional[int] = Query(
        None, description="ID a ignorar (útil al editar)"
    ),
    db: Session = Depends(get_db),
):
    # 1. Seguridad: Verificar que la tabla existe en la Whitelist
    if table not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400, detail="Tabla no permitida para validación"
        )

    model = ALLOWED_MODELS[table]

    # 2. Seguridad: Verificar que la columna existe en el modelo
    if not hasattr(model, field):
        raise HTTPException(status_code=400, detail="La columna especificada no existe")

    column = getattr(model, field)

    # 3. Validación de Longitud (Dinámica desde el modelo SQLAlchemy)
    col_type = getattr(column, "type", None)
    if col_type and hasattr(col_type, "length") and col_type.length:
        if len(value) > col_type.length:
            return ValidationResponse(
                is_valid=False,
                error=f"Supera la longitud máxima de {col_type.length} caracteres.",
            )

    # 4. Validación de Duplicados (Unicidad)
    query = db.query(model).filter(column == value)

    # Si estamos editando, ignoramos el ID del registro actual para que no choque consigo mismo
    if exclude_id:
        query = query.filter(model.id != exclude_id)

    exists = query.first()

    if exists:
        return ValidationResponse(
            is_valid=False, error="Este valor ya está registrado y no puede duplicarse."
        )

    # Si pasa todo...
    return ValidationResponse(is_valid=True, error=None)


@router.post("/upload-receipt/{entity_type}/{entity_id}")
def upload_generic_receipt(
    entity_type: str,
    entity_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if entity_type not in RECEIPT_MODELS:
        raise HTTPException(status_code=400, detail="Tipo de entidad no soportada")

    config = RECEIPT_MODELS[entity_type]
    model_class = config["model"]
    col_name = config["column"]

    # Verificar que el registro exista
    record = db.query(model_class).filter(model_class.id == entity_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    # Guardar archivo físico
    upload_dir = f"app/uploads/receipts/{entity_type}"
    os.makedirs(upload_dir, exist_ok=True)

    clean_filename = f"{entity_id}_{file.filename}".replace(" ", "_")
    file_location = os.path.join(upload_dir, clean_filename)

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url_publica = f"/static/receipts/{entity_type}/{clean_filename}"

    # Actualizar la BD dinámicamente
    setattr(record, col_name, url_publica)
    db.commit()

    return {"message": "Archivo subido", "url": url_publica}


@router.get("/receipt/{entity_type}/{entity_id}/history")
def get_receipt_history(
    entity_type: str, entity_id: int, db: Session = Depends(get_db)
):
    """Simula el formato de historial para que el Frontend Component funcione nativo"""
    if entity_type not in RECEIPT_MODELS:
        return []

    config = RECEIPT_MODELS[entity_type]
    model_class = config["model"]
    col_name = config["column"]

    record = db.query(model_class).filter(model_class.id == entity_id).first()

    # Si no hay registro o no hay URL, devolvemos array vacío
    if not record or not getattr(record, col_name):
        return []

    url = getattr(record, col_name)
    filename = url.split("/")[-1]

    # Devolvemos el JSON exacto que tu DocumentUploadManager.tsx espera
    return [
        {
            "id": entity_id,  # Usamos el ID del registro como ID del doc
            "filename": filename,
            "file_url": url,
            "version": 1,
            "is_active": True,
            "created_at": getattr(
                record, "updated_at", getattr(record, "created_at", None)
            ),
        }
    ]


@router.delete("/receipt/{entity_type}/{entity_id}")
def delete_generic_receipt(
    entity_type: str, entity_id: int, db: Session = Depends(get_db)
):
    if entity_type not in RECEIPT_MODELS:
        raise HTTPException(status_code=400, detail="Tipo no soportado")

    config = RECEIPT_MODELS[entity_type]
    model_class = config["model"]
    col_name = config["column"]

    record = db.query(model_class).filter(model_class.id == entity_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    # Borramos la URL de la base de datos (Se podría borrar el archivo físico aquí si quieres)
    setattr(record, col_name, None)
    db.commit()

    return {"message": "Comprobante eliminado"}
