import os
import uuid
import pandas as pd
import unicodedata
import re
import logging
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.models import models
from app.models.models import User, Unit, BulkUploadHistory, UnitDocumentHistory

from app.modules.auth.router import get_current_user
from app.integrations.storage.storage import StorageService
from app.modules.logistics.crud import get_last_unit_odometer

#  importacion LOCAL (FSD): Solo busca en la misma carpeta "fleet"
from . import schemas, crud

logger = logging.getLogger(__name__)

#  ÚNICA INSTANCIA DEL ROUTER
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


# =========================================================
# UNITS (Unidades)
# =========================================================


@router.get("/units", response_model=List[schemas.UnitResponse], tags=["Fleet - Units"])
def read_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_units(db, skip=skip, limit=limit)


@router.post("/units", response_model=schemas.UnitResponse, tags=["Fleet - Units"])
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    clean_eco = clean_eco_prefix(unit.numero_economico)
    if db.query(models.Unit).filter(models.Unit.numero_economico == clean_eco).first():
        raise HTTPException(
            status_code=400,
            detail="El número económico ya está registrado en el sistema.",
        )

    try:
        unit_data = unit.model_dump()
        unit_data.pop("public_id", None)
        unit_data["numero_economico"] = clean_eco

        db_unit = models.Unit(
            **unit_data, public_id=f"UNT-{uuid.uuid4().hex[:8].upper()}"
        )
        db.add(db_unit)
        db.commit()
        db.refresh(db_unit)

        # Si tu crud.py no tiene esta función, puedes comentarla temporalmente
        if hasattr(crud, "_update_unit_status"):
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


@router.post("/units/bulk-upload", tags=["Fleet - Units"])
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


@router.get("/units/download-upload/{upload_id}", tags=["Fleet - Units"])
async def download_upload(upload_id: int, db: Session = Depends(get_db)):
    record = db.query(BulkUploadHistory).get(upload_id)
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(record.file_path, filename=record.filename)


@router.get(
    "/units/{term}", response_model=schemas.UnitResponse, tags=["Fleet - Units"]
)
def read_unit(term: str, db: Session = Depends(get_db)):
    from urllib.parse import unquote

    term_decoded = unquote(term)

    # 1. SIEMPRE buscar por económico primero (es lo que viaja en la URL)
    db_unit = crud.get_unit_by_eco(db, numero_economico=term_decoded)
    if db_unit:
        return db_unit

    # 2. Si no lo encuentra por económico, y resulta que es un número, intentar por ID interno
    if term.isdigit():
        db_unit = crud.get_unit(db, unit_id=int(term))
        if db_unit:
            return db_unit

    raise HTTPException(status_code=404, detail="Unidad no encontrada")


@router.put(
    "/units/{unit_id}", response_model=schemas.UnitResponse, tags=["Fleet - Units"]
)
def update_unit(unit_id: str, unit: schemas.UnitUpdate, db: Session = Depends(get_db)):
    try:
        if unit.numero_economico:
            unit.numero_economico = clean_eco_prefix(unit.numero_economico)

        mandatory_fields = ["marca", "modelo", "tipo", "tipo_1"]
        for field in mandatory_fields:
            val = getattr(unit, field, None)
            if val is None or str(val).strip() == "":
                setattr(unit, field, "N/A")

        unique_fields = ["vin", "placas", "permiso_sct_folio", "caat_folio"]
        for field in unique_fields:
            if hasattr(unit, field) and getattr(unit, field) == "":
                setattr(unit, field, None)

        db_unit = crud.update_unit(db, unit_id, unit)
        if not db_unit:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")
        return db_unit

    except IntegrityError as e:
        db.rollback()
        raw_error = str(e.orig).lower()
        if "unique" in raw_error or "already exists" in raw_error:
            raise HTTPException(
                status_code=400,
                detail="Dato duplicado: Verifique que las placas, VIN o económico no existan ya.",
            )
        raise HTTPException(status_code=400, detail=f"Error de integridad: {raw_error}")


@router.delete("/units/{unit_id}", tags=["Fleet - Units"])
def delete_unit(unit_id: str, db: Session = Depends(get_db)):
    if not crud.delete_unit(db, unit_id):
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"message": "Unidad eliminada"}


@router.get("/units/{unit_id}/documents/{doc_type}/history", tags=["Fleet - Units"])
def get_document_history(unit_id: int, doc_type: str, db: Session = Depends(get_db)):
    return (
        db.query(UnitDocumentHistory)
        .filter(
            UnitDocumentHistory.unit_id == unit_id,
            UnitDocumentHistory.document_type == doc_type,
        )
        .order_by(UnitDocumentHistory.uploaded_at.desc())
        .all()
    )


@router.put(
    "/units/{unit_term}/tires",
    response_model=List[schemas.TireResponse],
    tags=["Fleet - Units"],
)
def update_unit_tires(
    unit_term: str, tires: List[schemas.TireCreate], db: Session = Depends(get_db)
):
    unit = None
    # 1. Intentamos buscar por ID interno si es un dígito
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))

    # 2. Si falló la búsqueda por ID, buscamos por número económico (Ej: "02")
    if not unit:
        from urllib.parse import unquote

        unit = crud.get_unit_by_eco(db, numero_economico=unquote(unit_term))

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


@router.post("/units/{unit_term}/documents/{doc_type}", tags=["Fleet - Units"])
async def upload_unit_document(
    unit_term: str,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = None
    # 1. Intentamos buscar por ID interno si es un dígito
    if unit_term.isdigit():
        unit = crud.get_unit(db, int(unit_term))

    # 2. Si falló la búsqueda por ID, buscamos por número económico (Ej: "02")
    if not unit:
        from urllib.parse import unquote

        unit = crud.get_unit_by_eco(db, numero_economico=unquote(unit_term))

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
    return {"url": file_url, "filename": unique_name, "message": "Archivo versionado"}


@router.patch(
    "/units/{unit_id}/load-status",
    response_model=schemas.UnitResponse,
    tags=["Fleet - Units"],
)
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


# =====================================================================
# ENDPOINT PARA PERSISTENCIA DE ODÓMETRO (ESCALERITA)
# =====================================================================
@router.get("/units/{unit_id}/last-odometer")
def get_unit_last_odometer(unit_id: int, db: Session = Depends(get_db)):
    """
    Devuelve el último odómetro registrado para una unidad específica.
    Busca primero en la liquidación del último viaje (TripLeg) y
    luego en el último vale de combustible (FuelLog).
    """
    try:
        # Llamamos a la función que Elena ya había construido en el CRUD
        last_odo = get_last_unit_odometer(db, unit_id)

        # Devolvemos el JSON exacto que espera tu React
        return {"last_odometer": last_odo}

    except Exception as e:
        print(f"Error obteniendo odómetro para unidad {unit_id}: {e}")
        # Si algo falla, devolvemos 0 para que el Frontend no se bloquee
        return {"last_odometer": 0}


# =========================================================
# OPERATORS (Operadores)
# =========================================================


@router.get(
    "/operators",
    response_model=List[schemas.OperatorResponse],
    tags=["Fleet - Operators"],
)
def read_operators(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_operators(db, skip, limit)


@router.post(
    "/operators", response_model=schemas.OperatorResponse, tags=["Fleet - Operators"]
)
def create_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    if (
        db.query(models.Operator)
        .filter(models.Operator.license_number == operator.license_number)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Licencia ya registrada")
    return crud.create_operator(db, operator)


@router.put(
    "/operators/{operator_id}",
    response_model=schemas.OperatorResponse,
    tags=["Fleet - Operators"],
)
def update_operator(
    operator_id: int, operator: schemas.OperatorUpdate, db: Session = Depends(get_db)
):
    db_op = crud.update_operator(db, operator_id, operator)
    if not db_op:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return db_op


@router.delete("/operators/{operator_id}", tags=["Fleet - Operators"])
def delete_operator(operator_id: int, db: Session = Depends(get_db)):
    if not crud.delete_operator(db, operator_id):
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return {"message": "Operador eliminado"}


@router.post(
    "/operators/{operator_id}/documents/{doc_type}", tags=["Fleet - Operators"]
)
async def upload_operator_document(
    operator_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    operator = (
        db.query(models.Operator).filter(models.Operator.id == operator_id).first()
    )
    if not operator:
        raise HTTPException(status_code=404, detail="Operador no encontrado")

    storage_data = StorageService.save_file(
        file, folder="operators", prefix=f"OP_{operator_id}"
    )

    db.query(models.OperatorDocumentHistory).filter(
        models.OperatorDocumentHistory.operator_id == operator_id,
        models.OperatorDocumentHistory.document_type == doc_type,
        models.OperatorDocumentHistory.is_active == True,
    ).update({"is_active": False})

    last_v = (
        db.query(func.max(models.OperatorDocumentHistory.version))
        .filter(
            models.OperatorDocumentHistory.operator_id == operator_id,
            models.OperatorDocumentHistory.document_type == doc_type,
        )
        .scalar()
        or 0
    )

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

    field_name = f"{doc_type}_url"
    if hasattr(operator, field_name):
        setattr(operator, field_name, storage_data["url"])

    db.add(new_doc)
    db.commit()
    return {"url": new_doc.file_url, "version": new_doc.version}


@router.get(
    "/operators/{operator_id}/documents/{doc_type}/history", tags=["Fleet - Operators"]
)
def get_operator_document_history(
    operator_id: int, doc_type: str, db: Session = Depends(get_db)
):
    return (
        db.query(models.OperatorDocumentHistory)
        .filter(
            models.OperatorDocumentHistory.operator_id == operator_id,
            models.OperatorDocumentHistory.document_type == doc_type,
        )
        .order_by(models.OperatorDocumentHistory.version.desc())
        .all()
    )


# =========================================================
# TIRES (Llantas)
# =========================================================


@router.get("/tires", response_model=List[schemas.TireResponse], tags=["Fleet - Tires"])
def read_tires(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_tires(db, skip, limit)


@router.get(
    "/tires/{tire_id}", response_model=schemas.TireResponse, tags=["Fleet - Tires"]
)
def read_tire(tire_id: int, db: Session = Depends(get_db)):
    tire = crud.get_tire(db, tire_id)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return tire


@router.post(
    "/tires",
    response_model=schemas.TireResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Fleet - Tires"],
)
def create_tire(tire: schemas.TireCreate, db: Session = Depends(get_db)):
    # 1. Validación normal si la llanta existe y está activa
    if crud.get_tire_by_code(db, tire.codigo_interno):
        raise HTTPException(
            status_code=400, detail="El código de llanta ya existe y está activo."
        )

    # 2. Bloque ultra seguro para atrapar duplicados ocultos y forzarlos a la pantalla
    try:
        return crud.create_tire(db, tire)
    except Exception as e:
        db.rollback()
        error_str = str(e).lower()

        # Si la base de datos se queja de un duplicado (UniqueViolation / IntegrityError)
        if (
            "unique" in error_str
            or "duplicate" in error_str
            or "integrity" in error_str
        ):
            raise HTTPException(
                status_code=400,
                detail="Error: Este código interno ya fue registrado anteriormente (quizás se eliminó). Intenta con otro código.",
            )

        # Si es cualquier otro error, lo mandamos a pantalla también para que sepas qué es
        raise HTTPException(
            status_code=400, detail=f"Fallo al guardar la llanta en BD: {str(e)}"
        )


@router.post("/tires/{tire_id}/assign", tags=["Fleet - Tires"])
def assign_tire(
    tire_id: int, payload: schemas.AssignTirePayload, db: Session = Depends(get_db)
):
    try:
        tire = crud.assign_tire(db, tire_id, payload)
        if not tire:
            raise HTTPException(status_code=404, detail="Llanta no encontrada")
        return {"message": "Asignación exitosa", "id": tire.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tires/{tire_id}/maintenance", tags=["Fleet - Tires"])
def maintenance_tire(
    tire_id: int, payload: schemas.MaintenanceTirePayload, db: Session = Depends(get_db)
):
    tire = crud.register_maintenance(db, tire_id, payload)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return {"message": "Maintenance registrado", "id": tire.id}


@router.put(
    "/tires/{tire_id}", response_model=schemas.TireResponse, tags=["Fleet - Tires"]
)
def update_tire(
    tire_id: int, tire_in: schemas.TireUpdate, db: Session = Depends(get_db)
):
    tire = crud.update_tire(db, tire_id, tire_in)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return tire


@router.delete("/tires/{tire_id}", tags=["Fleet - Tires"])
def delete_tire(tire_id: int, db: Session = Depends(get_db)):
    if not crud.delete_tire(db, tire_id):
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return {"message": "Llanta eliminada"}


# =========================================================
# FUEL LOGS (Combustible)
# =========================================================


@router.get(
    "/fuel-logs", response_model=List[schemas.FuelLogResponse], tags=["Fleet - Fuel"]
)
def get_fuel_logs(
    unit_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        stmt = (
            select(models.FuelLog)
            .options(
                joinedload(models.FuelLog.unit),
                joinedload(models.FuelLog.operator),
                joinedload(models.FuelLog.created_by),
                joinedload(models.FuelLog.trip_leg),
            )
            .where(models.FuelLog.record_status == "A")
        )

        if unit_id is not None:
            stmt = stmt.where(models.FuelLog.unit_id == unit_id)
        stmt = stmt.order_by(models.FuelLog.fecha_hora.desc())

        result = db.execute(stmt)
        return result.scalars().unique().all()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": "Error al consultar fuel logs", "error": str(e)},
        )


@router.post(
    "/fuel-logs", response_model=List[schemas.FuelLogResponse], tags=["Fleet - Fuel"]
)
async def create_fuel_log(
    unit_id: int = Form(...),
    operator_id: int = Form(...),
    trip_id: Optional[int] = Form(None),
    trip_leg_id: Optional[int] = Form(None),
    fecha_hora: str = Form(...),
    estacion: str = Form("No especificada"),
    litros_diesel: float = Form(0.0),
    precio_diesel: float = Form(0.0),
    litros_urea: float = Form(0.0),
    precio_urea: float = Form(0.0),
    odometro: int = Form(0),
    # --- NUEVOS CAMPOS MOTOGENERADOR ---
    is_motogenerator: bool = Form(False),
    horometro: Optional[float] = Form(None),
    # -----------------------------------
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if litros_diesel <= 0 and litros_urea <= 0:
        raise HTTPException(status_code=400, detail="Debe registrar litros.")

    evidencia_url, filename = None, None
    if file:
        storage = StorageService.save_file(
            file, folder="fuel_tickets", prefix=f"FUEL_{unit_id}"
        )
        evidencia_url, filename = storage["url"], storage["filename"]

    # --- LÓGICA DE MEMORIA (KILÓMETROS vs HORAS) ---
    km_recorridos = 0.0
    horas_recorridas = 0.0

    if is_motogenerator:
        # Busca el último ticket del Motogenerador
        last_log = (
            db.query(models.FuelLog)
            .filter(
                models.FuelLog.unit_id == unit_id,
                models.FuelLog.is_motogenerator == True,
                models.FuelLog.record_status != "E",
            )
            .order_by(models.FuelLog.horometro.desc())
            .first()
        )
        if (
            last_log
            and last_log.horometro
            and horometro
            and horometro > last_log.horometro
        ):
            horas_recorridas = horometro - last_log.horometro
    else:
        # Busca el último ticket del Tractocamión
        last_log = (
            db.query(models.FuelLog)
            .filter(
                models.FuelLog.unit_id == unit_id,
                models.FuelLog.is_motogenerator == False,
                models.FuelLog.record_status != "E",
            )
            .order_by(models.FuelLog.odometro.desc())
            .first()
        )
        if last_log and last_log.odometro and odometro > last_log.odometro:
            km_recorridos = odometro - last_log.odometro

    created_logs = []

    def _crear_registro(tipo: str, litros: float, precio: float):
        new_log = models.FuelLog(
            unit_id=unit_id,
            operator_id=operator_id,
            trip_leg_id=trip_leg_id,
            fecha_hora=fecha_hora,
            estacion=estacion,
            tipo_combustible=tipo,
            litros=litros,
            precio_por_litro=precio,
            total=litros * precio,
            # Guardamos según el tipo de motor
            odometro=odometro if not is_motogenerator else 0,
            km_sm=km_recorridos if not is_motogenerator else 0.0,
            is_motogenerator=is_motogenerator,
            horometro=horometro if is_motogenerator else None,
            horas_sm=horas_recorridas if is_motogenerator else None,
            evidencia_url=evidencia_url,
            created_by_id=current_user.id,
        )
        db.add(new_log)
        db.flush()
        if evidencia_url:
            db.add(
                models.FuelDocumentHistory(
                    fuel_log_id=new_log.id,
                    document_type="ticket",
                    filename=filename,
                    file_url=evidencia_url,
                    version=1,
                    is_active=True,
                    created_by_id=current_user.id,
                )
            )
        created_logs.append(new_log)

    if litros_diesel > 0:
        _crear_registro("diesel", litros_diesel, precio_diesel)
    if litros_urea > 0:
        _crear_registro("urea", litros_urea, precio_urea)

    db.commit()
    for log in created_logs:
        db.refresh(log)
    return created_logs


@router.put(
    "/fuel-logs/{log_id}", response_model=schemas.FuelLogResponse, tags=["Fleet - Fuel"]
)
async def update_fuel_log(
    log_id: int,
    data: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=404, detail="Registro de combustible no encontrado"
        )

    log.unit_id = data.unit_id
    log.operator_id = data.operator_id
    log.fecha_hora = data.fecha_hora if data.fecha_hora else log.fecha_hora
    log.estacion = data.estacion
    log.tipo_combustible = data.tipo_combustible
    log.litros = data.litros
    log.precio_por_litro = data.precio_por_litro
    log.total = data.total
    log.odometro = data.odometro
    log.excede_tanque = data.excede_tanque
    log.capacidad_tanque_snapshot = data.capacidad_tanque_snapshot

    # --- ACTUALIZACIÓN MOTOGENERADOR ---
    log.is_motogenerator = data.is_motogenerator
    log.horometro = data.horometro
    log.horas_sm = data.horas_sm
    # -----------------------------------

    if data.trip_leg_id:
        log.trip_leg_id = data.trip_leg_id
    log.updated_by_id = current_user.id

    try:
        db.commit()
        db.refresh(log)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error de integridad: {str(e)}")
    return log


@router.delete("/fuel-logs/{log_id}", tags=["Fleet - Fuel"])
def delete_fuel_log(
    log_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="No encontrado")
    log.record_status = "E"
    db.commit()
    return {"message": "Registro eliminado"}


@router.get("/fuel-logs/{log_id}/documents/{doc_type}/history", tags=["Fleet - Fuel"])
def get_fuel_history(log_id: int, doc_type: str, db: Session = Depends(get_db)):
    return (
        db.query(models.FuelDocumentHistory)
        .filter(models.FuelDocumentHistory.fuel_log_id == log_id)
        .order_by(models.FuelDocumentHistory.version.desc())
        .all()
    )


@router.post("/fuel-logs/{log_id}/documents/{doc_type}", tags=["Fleet - Fuel"])
async def upload_fuel_document(
    log_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=404, detail="Registro de combustible no encontrado"
        )

    storage_data = StorageService.save_file(
        file, folder="fuel_tickets", prefix=f"FUEL_UPD_{log.unit_id}"
    )

    db.query(models.FuelDocumentHistory).filter(
        models.FuelDocumentHistory.fuel_log_id == log_id,
        models.FuelDocumentHistory.document_type == doc_type,
        models.FuelDocumentHistory.is_active == True,
    ).update({"is_active": False})

    last_v = (
        db.query(func.max(models.FuelDocumentHistory.version))
        .filter(
            models.FuelDocumentHistory.fuel_log_id == log_id,
            models.FuelDocumentHistory.document_type == doc_type,
        )
        .scalar()
        or 0
    )

    new_doc = models.FuelDocumentHistory(
        fuel_log_id=log_id,
        document_type=doc_type,
        filename=storage_data["filename"],
        file_url=storage_data["url"],
        file_size=storage_data["size"],
        mime_type=storage_data["mime_type"],
        version=last_v + 1,
        is_active=True,
        created_by_id=current_user.id,
    )

    log.evidencia_url = storage_data["url"]
    log.updated_by_id = current_user.id
    db.add(new_doc)
    db.commit()
    return {
        "url": new_doc.file_url,
        "version": new_doc.version,
        "message": "Nueva evidencia cargada correctamente",
    }


@router.delete("/fuel-logs/{log_id}/documents/{doc_type}", tags=["Fleet - Fuel"])
def delete_fuel_document(
    log_id: int,
    doc_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=404, detail="Registro de combustible no encontrado"
        )

    active_doc = (
        db.query(models.FuelDocumentHistory)
        .filter(
            models.FuelDocumentHistory.fuel_log_id == log_id,
            models.FuelDocumentHistory.document_type == doc_type,
            models.FuelDocumentHistory.is_active == True,
        )
        .first()
    )

    if not active_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    active_doc.is_active = False
    log.evidencia_url = None
    log.updated_by_id = current_user.id
    db.commit()
    return {"message": "Documento eliminado correctamente"}
