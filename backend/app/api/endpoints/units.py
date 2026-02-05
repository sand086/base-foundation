"""
Module for handling unit-related API endpoints.
This module provides REST API endpoints for managing units (vehicles) in the system,
including CRUD operations and bulk upload functionality. It handles file uploads,
database operations, and maintains a history of bulk upload transactions.
Classes:
    None
Functions:
    read_units: Retrieve a paginated list of units from the database.
    create_unit: Create a new unit with validation for duplicate economic numbers.
    update_unit: Update an existing unit by ID.
    delete_unit: Delete a unit by ID.
    upload_units_bulk: Upload and process multiple units from a CSV or Excel file.
    download_upload: Download a previously uploaded file by upload history ID.
Routes:
    GET /units - List all units with pagination
    POST /units - Create a new unit
    PUT /units/{unit_id} - Update an existing unit
    DELETE /units/{unit_id} - Delete a unit
    POST /bulk-upload - Upload multiple units from file
    GET /download-upload/{upload_id} - Download a previously uploaded file
Dependencies:
    - FastAPI: Web framework
    - SQLAlchemy: ORM for database operations
    - pandas: Data processing for file parsing
    - UUID: Unique file identifier generation
    - Authentication: Requires active user for bulk upload endpoint
Constants:
    UPLOAD_DIR (str): Directory path for storing uploaded files
"""
import os
import uuid
import pandas as pd
import unicodedata
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import units as schemas
from app.crud import units as crud
from shutil import copyfileobj
from fastapi.responses import FileResponse
from app.api.endpoints.auth import get_current_user
from app.models.models import User, Unit, BulkUploadHistory

router = APIRouter()
UPLOAD_DIR = "app/uploads/bulk_unidades"

@router.get("/units", response_model=List[schemas.UnitResponse])
def read_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_units(db, skip=skip, limit=limit)


@router.post("/units", response_model=schemas.UnitResponse)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    if (
        db.query(models.Unit)
        .filter(models.Unit.numero_economico == unit.numero_economico)
        .first()
    ):
        raise HTTPException(status_code=400, detail="El número económico ya existe")
    return crud.create_unit(db, unit)


@router.put("/units/{unit_id}", response_model=schemas.UnitResponse)
def update_unit(unit_id: str, unit: schemas.UnitUpdate, db: Session = Depends(get_db)):
    db_unit = crud.update_unit(db, unit_id, unit)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return db_unit


@router.delete("/units/{unit_id}")
def delete_unit(unit_id: str, db: Session = Depends(get_db)):
    if not crud.delete_unit(db, unit_id):
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"message": "Unidad eliminada"}


@router.post("/bulk-upload")
async def upload_units_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Crear carpeta si no existe
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    # 2. Generar nombre único para el archivo
    file_extension = os.path.splitext(file.filename)[1]
    stored_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    # 3. Guardar el archivo físicamente
    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        # 4. Leer el archivo (CSV o Excel) para procesar los datos
        if file_extension == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        # Esto convierte ['Número Económico', 'Año'] en ['numero_economico', 'ano']
        df.columns = [normalize_header(c) for c in df.columns]
        
        # Depuración: Imprimir columnas encontradas (ver en la terminal donde corre uvicorn)
        print(f"Columnas detectadas: {df.columns.tolist()}")

        units_inserted = 0
        # Lógica de inserción en la base de datos (Unidades)
        for _, row in df.iterrows():
            # Validar campo obligatorio clave
            eco = str(row.get('numero_economico', '')).strip()
            if not eco or eco == 'nan': 
                continue # Saltar filas vacías

            # Verificar si ya existe para no romper con error de duplicado
            existing = db.query(Unit).filter(Unit.numero_economico == eco).first()
            if existing:
                continue # O podrías hacer un update aquí

            new_unit = Unit(
                numero_economico=eco,
                placas=str(row.get('placas', 'SIN-PLACA')).strip(),
                vin=str(row.get('vin', '')),
                marca=str(row.get('marca', 'GENERICO')),
                modelo=str(row.get('modelo', 'GENERICO')),
                year=int(row['year']) if pd.notnull(row.get('year')) else 2024,
                tipo=str(row.get('tipo', 'full')).lower(), # enum en minúscula
                
                # Nuevos campos (Usamos .get con nombres normalizados)
                tipo_1=str(row.get('tipo_1', 'TRACTOCAMION')),
                tipo_carga=str(row.get('tipo_carga', 'General')),
                
                # Fechas: Pandas es inteligente, pero hay que manejar nulos
                seguro_vence=pd.to_datetime(row['seguro_vence']).date() if pd.notnull(row.get('seguro_vence')) else None,
                verificacion_humo_vence=pd.to_datetime(row.get('verificacion_humo', None)).date() if pd.notnull(row.get('verificacion_humo')) else None,
                verificacion_fisico_mecanica_vence=pd.to_datetime(row.get('verificacion_fisico_mecanica', None)).date() if pd.notnull(row.get('verificacion_fisico_mecanica')) else None,
            )
            db.add(new_unit)
            units_inserted += 1
        
        # 5. Registrar en el historial de cargas masivas
        history = BulkUploadHistory(
            filename=file.filename,
            stored_filename=stored_filename,
            file_path=file_path,
            upload_type="unidades",
            status="completado",
            user_id=current_user.id
        )
        db.add(history)
        db.commit()

        return {"status": "success", "records": len(df)}

    except Exception as e:
        db.rollback()
        # Si falla, marcamos como error en el historial (opcional)
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

# Endpoint para descargar archivos antiguos
@router.get("/download-upload/{upload_id}")
async def download_upload(upload_id: int, db: Session = Depends(get_db)):
    record = db.query(BulkUploadHistory).get(upload_id)
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(record.file_path, filename=record.filename)


def normalize_header(header: str) -> str:
    """Convierte 'Número Económico' a 'numero_economico'"""
    # 1. Minúsculas
    header = str(header).lower().strip()
    # 2. Quitar acentos (Número -> Numero)
    header = ''.join(c for c in unicodedata.normalize('NFD', header) if unicodedata.category(c) != 'Mn')
    # 3. Reemplazar espacios por guiones bajos
    header = header.replace(' ', '_').replace('.', '').replace('-', '_')
    return header