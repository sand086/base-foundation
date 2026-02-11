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
    POST /units/bulk-upload - Upload multiple units from file
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
from app.models.models import User, Unit, BulkUploadHistory, UnitDocumentHistory
from fastapi.staticfiles import StaticFiles

router = APIRouter()
# Directorios
UPLOAD_DIR = "app/uploads/bulk_unidades"
DOCS_DIR = "app/uploads/documents"

for directory in [UPLOAD_DIR, DOCS_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)


def normalize_header(header: str) -> str:
    """Normaliza encabezados de Excel (ej: 'Número Económico' -> 'numero_economico')"""
    header = str(header).lower().strip()
    header = ''.join(c for c in unicodedata.normalize('NFD', header) if unicodedata.category(c) != 'Mn')
    header = header.replace(' ', '_').replace('.', '').replace('-', '_')
    return header

# --- RUTAS CRUD BÁSICAS ---

@router.get("/units", response_model=List[schemas.UnitResponse])
def read_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_units(db, skip=skip, limit=limit)


@router.post("/units", response_model=schemas.UnitResponse)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    # 1. Validar duplicados
    if db.query(models.Unit).filter(models.Unit.numero_economico == unit.numero_economico).first():
        raise HTTPException(status_code=400, detail="El número económico ya existe")
    
    # 2. Preparar datos (Corregir nombres de campos que no coinciden)
    unit_data = unit.model_dump() # O unit.dict() en versiones viejas de Pydantic
    
    # Mapeo manual: El esquema recibe 'tarjeta_circulacion', pero el modelo usa '_url'
    if "tarjeta_circulacion" in unit_data:
        unit_data["tarjeta_circulacion_url"] = unit_data.pop("tarjeta_circulacion")

    # 3. Crear instancia del modelo
    db_unit = models.Unit(
        **unit_data,
        public_id=str(uuid.uuid4())
    )
    
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


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


@router.post("/units/bulk-upload")
async def upload_units_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    print(f"Usuario que sube el archivo: {file.filename}")
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
                continue 

            existing = db.query(Unit).filter(Unit.numero_economico == eco).first()
            if existing:
                continue 

            # --- CORRECCIÓN AQUÍ ---
            # Forzamos .lower() y .strip() para limpiar espacios y mayúsculas
            tipo_limpio = str(row.get('tipo', 'full')).strip().lower()
            status_limpio = str(row.get('status', 'disponible')).strip().lower()
            
            # Mapeo de seguridad por si el Excel trae "Sencillo" o "Tracto"
            if tipo_limpio not in ['sencillo', 'full', 'rabon', 'tracto', 'dolly', 'trailer', 'camioneta', 'camion', 'otro']:
                tipo_limpio = 'full' # Valor por defecto seguro

            new_unit = Unit(
                public_id=str(uuid.uuid4()),
                numero_economico=eco,
                placas=str(row.get('placas', 'SIN-PLACA')).strip(),
                vin=str(row.get('vin', '')),
                marca=str(row.get('marca', 'GENERICO')),
                modelo=str(row.get('modelo', 'GENERICO')),
                year=int(row['year']) if pd.notnull(row.get('year')) else 2024,
                
                # Usamos las variables limpias
                tipo=tipo_limpio, 
                status=status_limpio,

                tipo_1=str(row.get('tipo_1', 'TRACTOCAMION')),
                tipo_carga=str(row.get('tipo_carga', 'General')),
                
                seguro_vence=pd.to_datetime(row['seguro_vence'], dayfirst=True).date() if pd.notnull(row.get('seguro_vence')) else None,
                verificacion_humo_vence=pd.to_datetime(row.get('verificacion_humo', None), dayfirst=True).date() if pd.notnull(row.get('verificacion_humo')) else None,
                verificacion_fisico_mecanica_vence=pd.to_datetime(row.get('verificacion_fisico_mecanica', None), dayfirst=True).date() if pd.notnull(row.get('verificacion_fisico_mecanica')) else None,
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




@router.get("/units/{term}", response_model=schemas.UnitResponse)
def read_unit(term: str, db: Session = Depends(get_db)):
    """
    Busca una unidad por ID (entero) o por Número Económico (texto).
    """
    # Intentamos buscar por ID numérico primero
    if term.isdigit():
        db_unit = crud.get_unit(db, unit_id=int(term))
        if db_unit:
            return db_unit

    # Si no es ID o no se encontró, buscamos por Número Económico
    # (Decodificamos URL por si viene con espacios como 'Eco%2002')
    from urllib.parse import unquote
    term_decoded = unquote(term)
    
    db_unit = crud.get_unit_by_eco(db, numero_economico=term_decoded)
    if db_unit:
        return db_unit
        
    raise HTTPException(status_code=404, detail="Unidad no encontrada")



# Endpoint para obtener el historial
@router.get("/units/{unit_id}/documents/{doc_type}/history")
def get_document_history(
    unit_id: int, 
    doc_type: str, 
    db: Session = Depends(get_db)
):
    history = db.query(UnitDocumentHistory)\
        .filter(UnitDocumentHistory.unit_id == unit_id, UnitDocumentHistory.document_type == doc_type)\
        .order_by(UnitDocumentHistory.uploaded_at.desc())\
        .all()
    return history


# Guardar Llantas (Bulk Update)
@router.put("/units/{unit_term}/tires", response_model=List[schemas.TireResponse])
def update_unit_tires(
    unit_term: str,
    tires: List[schemas.TireCreate],
    db: Session = Depends(get_db)
):
    # Resolver unidad
    unit = None
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))
    if not unit:
        unit = crud.get_unit_by_eco(db, unit_term)
        
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    # Reemplazar llantas
    db.query(models.Tire).filter(models.Tire.unit_id == unit.id).delete()
    
    new_tires = []
    for t in tires:
        tire_db = models.Tire(**t.dict(), unit_id=unit.id)
        db.add(tire_db)
        new_tires.append(tire_db)
    
    db.commit()
    for t in new_tires: db.refresh(t)
        
    return new_tires

@router.post("/units/{unit_term}/documents/{doc_type}")
async def upload_unit_document(
    unit_term: str,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Buscar unidad
    unit = None
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))
    if not unit:
        unit = crud.get_unit_by_eco(db, unit_term)
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    # 2. Guardar archivo físico
    file_ext = os.path.splitext(file.filename)[1]
    unique_name = f"{unit.numero_economico}_{doc_type}_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(DOCS_DIR, unique_name)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_url = f"/static/documents/{unique_name}"

    # 3. Guardar en Historial (VERSIONAMIENTO)
    # Esta es la parte que te faltaba porque la función anterior la ocultaba
    history_record = UnitDocumentHistory(
        unit_id=unit.id,
        document_type=doc_type,
        filename=file.filename,
        file_url=file_url,
        file_size=len(content),
        uploaded_by=current_user.id 
    )
    db.add(history_record)

    # 4. Actualizar registro principal
    if doc_type == "poliza_seguro":
        unit.poliza_seguro_url = file_url
    elif doc_type == "verificacion_humo":
        unit.verificacion_humo_url = file_url
    elif doc_type == "verificacion_fisico_mecanica":
        unit.verificacion_fisico_mecanica_url = file_url
    elif doc_type == "tarjeta_circulacion":
        unit.tarjeta_circulacion_url = file_url
    elif doc_type == "permiso_sct":
        unit.permiso_sct_url = file_url
    elif doc_type == "caat":
        unit.caat_url = file_url

    db.commit()
    db.refresh(unit)
    
    return {
        "url": file_url, 
        "filename": unique_name, 
        "message": "Archivo subido y versionado correctamente"
    }

@router.put("/units/{unit_term}/tires", response_model=List[schemas.TireResponse])
def update_unit_tires(
    unit_term: str,
    tires: List[schemas.TireCreate],
    db: Session = Depends(get_db)
):
    # 1. Buscar unidad
    unit = None
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))
    if not unit:
        unit = crud.get_unit_by_eco(db, unit_term)
        
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    # 2. Reemplazar llantas (Estrategia simple: Borrar y Crear)
    db.query(models.Tire).filter(models.Tire.unit_id == unit.id).delete()
    
    new_tires = []
    for t in tires:
        # Convertir esquema a modelo
        tire_db = models.Tire(**t.model_dump(), unit_id=unit.id)
        db.add(tire_db)
        new_tires.append(tire_db)
    
    db.commit()
    
    # Refrescar para obtener IDs
    for t in new_tires:
        db.refresh(t)
        
    return new_tires