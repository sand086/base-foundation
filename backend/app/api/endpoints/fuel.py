# backend/app/api/endpoints/fuel.py
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from app.db.database import get_db
from app.models import models
from app.models.models import User
from app.schemas import fuel as schemas
from app.api.endpoints.auth import get_current_user
from app.services.storage import StorageService

router = APIRouter()

UPLOAD_DIR = "uploads/fuel_tickets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/fuel-logs", response_model=List[schemas.FuelLogResponse])
def get_fuel_logs(
    unit_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = (
        select(models.FuelLog)
        .options(
            joinedload(models.FuelLog.unit),
            joinedload(models.FuelLog.operator),
            joinedload(models.FuelLog.created_by),  # 🚀 NUEVO: Cargar el usuario
        )
        .where(models.FuelLog.record_status == "A")
    )

    if unit_id:
        stmt = stmt.where(models.FuelLog.unit_id == unit_id)

    stmt = stmt.order_by(models.FuelLog.fecha_hora.desc())
    result = db.execute(stmt)
    return result.scalars().unique().all()


@router.post("/fuel-logs", response_model=schemas.FuelLogResponse)
async def create_fuel_log(
    unidadId: int = Form(...),
    operadorId: int = Form(...),
    viajeId: Optional[int] = Form(None),
    fechaHora: str = Form(...),
    estacion: str = Form(...),
    tipoCombustible: str = Form(...),
    litros: float = Form(...),
    precioPorLitro: float = Form(...),
    odometro: int = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    evidencia_url = None
    filename = None
    if file:
        storage = StorageService.save_file(
            file, folder="fuel_tickets", prefix=f"FUEL_{unidadId}"
        )
        evidencia_url = storage["url"]
        filename = storage["filename"]

    new_log = models.FuelLog(
        unit_id=unidadId,
        operator_id=operadorId,
        trip_leg_id=viajeId,  # 🚀 CORRECCIÓN: Era trip_id, debe ser trip_leg_id
        fecha_hora=fechaHora,
        estacion=estacion,
        tipo_combustible=tipoCombustible,
        litros=litros,
        precio_por_litro=precioPorLitro,
        total=litros * precioPorLitro,
        odometro=odometro,
        evidencia_url=evidencia_url,
        created_by_id=current_user.id,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    if evidencia_url:
        history_entry = models.FuelDocumentHistory(
            fuel_log_id=new_log.id,
            filename=filename,
            file_url=evidencia_url,
            version=1,
            is_active=True,
            created_by_id=current_user.id,
        )
        db.add(history_entry)
        db.commit()

    return new_log


@router.put("/fuel-logs/{log_id}", response_model=schemas.FuelLogResponse)
async def update_fuel_log(
    log_id: int,
    data: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    log.unit_id = data.unit_id
    log.operator_id = data.operator_id
    log.fecha_hora = data.fecha_hora
    log.estacion = data.estacion
    log.tipo_combustible = data.tipo_combustible
    log.litros = data.litros
    log.precio_por_litro = data.precio_por_litro
    log.total = data.total
    log.odometro = data.odometro
    log.excede_tanque = data.excede_tanque
    log.capacidad_tanque_snapshot = data.capacidad_tanque_snapshot

    # Si tu schema lo soporta, actualizamos viaje también
    if hasattr(data, "trip_leg_id"):
        log.trip_leg_id = data.trip_leg_id
    elif hasattr(
        data, "trip_id"
    ):  # Por si el frontend sigue mandando trip_id en el JSON
        log.trip_leg_id = data.trip_id

    log.updated_by_id = current_user.id

    try:
        db.commit()
        db.refresh(log)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar: {str(e)}")

    return log


@router.delete("/fuel-logs/{log_id}")
def delete_fuel_log(
    log_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="No encontrado")
    log.record_status = "E"
    db.commit()
    return {"message": "Registro eliminado"}


@router.get("/fuel-logs/{log_id}/documents/{doc_type}/history")
def get_fuel_history(log_id: int, doc_type: str, db: Session = Depends(get_db)):
    return (
        db.query(models.FuelDocumentHistory)
        .filter(models.FuelDocumentHistory.fuel_log_id == log_id)
        .order_by(models.FuelDocumentHistory.version.desc())
        .all()
    )


@router.post("/fuel-logs/{log_id}/documents/{doc_type}")
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
