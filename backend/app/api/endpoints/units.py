import os
import uuid
import pandas as pd
import unicodedata
import re  # 🚀 IMPORT PARA LIMPIAR EL "ECO-"
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.database import get_db
from app.models import models
from app.schemas import units as schemas
from app.schemas import tires as tires_schemas
from app.crud import units as crud
from fastapi.responses import FileResponse
from app.api.endpoints.auth import get_current_user
from app.models.models import User, Unit, BulkUploadHistory, UnitDocumentHistory

router = APIRouter()

UPLOAD_DIR = "app/uploads/bulk_unidades"
DOCS_DIR = "app/uploads/documents"

for directory in [UPLOAD_DIR, DOCS_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)


def normalize_header(header: str) -> str:
    header = str(header).lower().strip()
    header = "".join(
        c
        for c in unicodedata.normalize("NFD", header)
        if unicodedata.category(c) != "Mn"
    )
    return header.replace(" ", "_").replace(".", "").replace("-", "_")


def clean_eco_prefix(eco_str: str) -> str:
    if not eco_str:
        return ""
    eco_clean = eco_str.strip().upper()
    return re.sub(r"^ECO[-\s]?", "", eco_clean)


# --- RUTAS CRUD BÁSICAS ---


@router.get("/units", response_model=List[schemas.UnitResponse])
def read_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_units(db, skip=skip, limit=limit)


@router.post("/units", response_model=schemas.UnitResponse)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    # 🚀 LIMPIAMOS EL NÚMERO ANTES DE VALIDAR
    clean_eco = clean_eco_prefix(unit.numero_economico)

    if db.query(models.Unit).filter(models.Unit.numero_economico == clean_eco).first():
        raise HTTPException(
            status_code=400,
            detail="El número económico ya está registrado en el sistema.",
        )

    try:
        unit_data = unit.model_dump()
        unit_data.pop("public_id", None)
        unit_data["numero_economico"] = clean_eco  # 🚀 LO GUARDAMOS LIMPIO

        db_unit = models.Unit(
            **unit_data, public_id=f"UNT-{uuid.uuid4().hex[:8].upper()}"
        )

        db.add(db_unit)
        db.commit()
        db.refresh(db_unit)

        crud._update_unit_status(db, db_unit)
        db.commit()
        db.refresh(db_unit)

        return db_unit

    except IntegrityError as e:
        db.rollback()
        error_msg = str(e.orig)
        if "units_placas_key" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Error: Esas placas ya pertenecen a otra unidad registrada.",
            )
        if "units_numero_economico_key" in error_msg:
            raise HTTPException(
                status_code=400, detail="Error: El número económico ya está en uso."
            )
        if "units_vin_key" in error_msg:
            raise HTTPException(
                status_code=400, detail="Error: El número de serie (VIN) ya existe."
            )
        raise HTTPException(
            status_code=400,
            detail="Error de integridad: Verifique que no haya datos duplicados.",
        )


@router.put("/units/{unit_id}", response_model=schemas.UnitResponse)
def update_unit(unit_id: str, unit: schemas.UnitUpdate, db: Session = Depends(get_db)):
    try:
        # 🚀 LIMPIAMOS TAMBIÉN EN EDICIÓN
        if unit.numero_economico:
            unit.numero_economico = clean_eco_prefix(unit.numero_economico)

        db_unit = crud.update_unit(db, unit_id, unit)
        if not db_unit:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")
        return db_unit

    except IntegrityError as e:
        db.rollback()
        error_msg = str(e.orig)
        if "units_placas_key" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="No se pudo actualizar: Esas placas ya están asignadas a otra unidad.",
            )
        raise HTTPException(
            status_code=400, detail="Error al actualizar: Posible dato duplicado."
        )


@router.delete("/units/{unit_id}")
def delete_unit(unit_id: str, db: Session = Depends(get_db)):
    if not crud.delete_unit(db, unit_id):
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"message": "Unidad eliminada"}


@router.post("/units/bulk-upload")
async def upload_units_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_extension = os.path.splitext(file.filename)[1]
    stored_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        if file_extension == ".csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        df.columns = [normalize_header(c) for c in df.columns]
        units_inserted = 0

        for _, row in df.iterrows():
            eco = str(row.get("numero_economico", "")).strip()
            if not eco or eco == "nan":
                continue

            clean_eco = clean_eco_prefix(eco)

            existing = db.query(Unit).filter(Unit.numero_economico == clean_eco).first()
            if existing:
                continue

            tipo_limpio = str(row.get("tipo", "full")).strip().lower()
            status_limpio = str(row.get("status", "disponible")).strip().lower()

            if tipo_limpio not in [
                "sencillo",
                "full",
                "rabon",
                "tracto",
                "dolly",
                "trailer",
                "camioneta",
                "camion",
                "otro",
            ]:
                tipo_limpio = "full"

            new_unit = Unit(
                public_id=f"UNT-{uuid.uuid4().hex[:8].upper()}",
                numero_economico=clean_eco,
                placas=str(row.get("placas", "SIN-PLACA")).strip(),
                vin=str(row.get("vin", "")),
                marca=str(row.get("marca", "GENERICO")),
                modelo=str(row.get("modelo", "GENERICO")),
                year=int(row["year"]) if pd.notnull(row.get("year")) else 2024,
                tipo=tipo_limpio,
                status=status_limpio,
                tipo_1=str(row.get("tipo_1", "TRACTOCAMION")),
                tipo_carga=str(row.get("tipo_carga", "General")),
                seguro_vence=(
                    pd.to_datetime(row["seguro_vence"], dayfirst=True).date()
                    if pd.notnull(row.get("seguro_vence"))
                    else None
                ),
                verificacion_humo_vence=(
                    pd.to_datetime(
                        row.get("verificacion_humo", None), dayfirst=True
                    ).date()
                    if pd.notnull(row.get("verificacion_humo"))
                    else None
                ),
                verificacion_fisico_mecanica_vence=(
                    pd.to_datetime(
                        row.get("verificacion_fisico_mecanica", None), dayfirst=True
                    ).date()
                    if pd.notnull(row.get("verificacion_fisico_mecanica"))
                    else None
                ),
            )
            db.add(new_unit)
            units_inserted += 1

        history = BulkUploadHistory(
            filename=file.filename,
            stored_filename=stored_filename,
            file_path=file_path,
            upload_type="unidades",
            status="completado",
            user_id=current_user.id,
        )
        db.add(history)
        db.commit()

        return {"status": "success", "records": len(df)}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error procesando archivo: {str(e)}"
        )


@router.get("/download-upload/{upload_id}")
async def download_upload(upload_id: int, db: Session = Depends(get_db)):
    record = db.query(BulkUploadHistory).get(upload_id)
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(record.file_path, filename=record.filename)


@router.get("/units/{term}", response_model=schemas.UnitResponse)
def read_unit(term: str, db: Session = Depends(get_db)):
    if term.isdigit():
        db_unit = crud.get_unit(db, unit_id=int(term))
        if db_unit:
            return db_unit

    from urllib.parse import unquote

    term_decoded = unquote(term)
    db_unit = crud.get_unit_by_eco(db, numero_economico=term_decoded)
    if db_unit:
        return db_unit
    raise HTTPException(status_code=404, detail="Unidad no encontrada")


@router.get("/units/{unit_id}/documents/{doc_type}/history")
def get_document_history(unit_id: int, doc_type: str, db: Session = Depends(get_db)):
    history = (
        db.query(UnitDocumentHistory)
        .filter(
            UnitDocumentHistory.unit_id == unit_id,
            UnitDocumentHistory.document_type == doc_type,
        )
        .order_by(UnitDocumentHistory.uploaded_at.desc())
        .all()
    )
    return history


@router.put("/units/{unit_term}/tires", response_model=List[tires_schemas.TireResponse])
def update_unit_tires(
    unit_term: str, tires: List[tires_schemas.TireCreate], db: Session = Depends(get_db)
):
    unit = None
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))
    if not unit:
        unit = crud.get_unit_by_eco(db, unit_term)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    db.query(models.Tire).filter(models.Tire.unit_id == unit.id).update(
        {"record_status": models.RecordStatus.ELIMINADO.value}
    )
    new_tires = []
    for t in tires:
        tire_db = models.Tire(**t.dict(), unit_id=unit.id)
        db.add(tire_db)
        new_tires.append(tire_db)

    db.commit()
    for t in new_tires:
        db.refresh(t)
    return new_tires


@router.post("/units/{unit_term}/documents/{doc_type}")
async def upload_unit_document(
    unit_term: str,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = None
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))
    if not unit:
        unit = crud.get_unit_by_eco(db, unit_term)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    file_ext = os.path.splitext(file.filename)[1]
    unique_name = f"{unit.numero_economico}_{doc_type}_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(DOCS_DIR, unique_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    file_url = f"/static/documents/{unique_name}"
    history_record = UnitDocumentHistory(
        unit_id=unit.id,
        document_type=doc_type,
        filename=file.filename,
        file_url=file_url,
        file_size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(history_record)

    if doc_type == "poliza_seguro":
        unit.poliza_seguro_url = file_url
    elif doc_type == "verificacion_humo":
        unit.verificacion_humo_url = file_url
    elif doc_type == "verificacion_fisico_mecanica":
        unit.verificacion_fisico_mecanica_url = file_url
    elif doc_type == "tarjeta_circulacion_folio":
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
        "message": "Archivo subido y versionado correctamente",
    }


@router.patch("/units/{unit_id}/load-status", response_model=schemas.UnitResponse)
def update_unit_load_status(
    unit_id: int, load_status: bool, db: Session = Depends(get_db)
):
    db_unit = crud.get_unit(db, unit_id=unit_id)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    db_unit.is_loaded = load_status
    db.commit()
    db.refresh(db_unit)
    return db_unit
