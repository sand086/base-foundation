from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.db.database import get_db
from app.models import models
from app.models.models import User
from app.schemas import fuel as schemas
from app.api.endpoints.auth import get_current_user
from app.services.storage import StorageService

router = APIRouter()

import logging

logger = logging.getLogger(__name__)


@router.get("/fuel-logs", response_model=List[schemas.FuelLogResponse])
def get_fuel_logs(
    unit_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        logger.info(
            "Consultando fuel logs | user_id=%s | unit_id=%s",
            getattr(current_user, "id", None),
            unit_id,
        )

        stmt = (
            select(models.FuelLog)
            .options(
                joinedload(models.FuelLog.unit),
                joinedload(models.FuelLog.operator),
                joinedload(models.FuelLog.created_by),
            )
            .where(models.FuelLog.record_status == "A")
        )

        if unit_id is not None:
            stmt = stmt.where(models.FuelLog.unit_id == unit_id)

        stmt = stmt.order_by(models.FuelLog.fecha_hora.desc())

        result = db.execute(stmt)
        logs = result.scalars().unique().all()

        logger.info("Fuel logs obtenidos correctamente | total=%s", len(logs))
        return logs

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(
            "Error en /fuel-logs | user_id=%s | unit_id=%s",
            getattr(current_user, "id", None),
            unit_id,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Error al consultar fuel logs",
                "error_type": type(e).__name__,
                "error": str(e),
            },
        )


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


@router.delete("/fuel-logs/{log_id}/documents/{doc_type}")
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


# NUEVO: ENDPOINT PARA CREAR EL "VALE DOBLE" CORREGIDO
@router.post("/fuel-logs", response_model=List[schemas.FuelLogResponse])
async def create_fuel_log(
    unit_id: int = Form(...),
    operator_id: int = Form(...),
    trip_id: Optional[int] = Form(None),  # Viaje Maestro
    trip_leg_id: Optional[int] = Form(None),  # 🚀 REGLA 1: La Fase Operativa
    fecha_hora: str = Form(...),
    estacion: str = Form("No especificada"),
    litros_diesel: float = Form(0.0),
    precio_diesel: float = Form(0.0),
    litros_urea: float = Form(0.0),
    precio_urea: float = Form(0.0),
    odometro: int = Form(0),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validación mínima
    if litros_diesel <= 0 and litros_urea <= 0:
        raise HTTPException(status_code=400, detail="Debe registrar litros.")

    # Procesamiento de evidencia (si existe)
    evidencia_url = None
    filename = None
    if file:
        storage = StorageService.save_file(
            file, folder="fuel_tickets", prefix=f"FUEL_{unit_id}"
        )
        evidencia_url = storage["url"]
        filename = storage["filename"]

    created_logs = []

    # Función interna para crear el registro (Diesel o Urea)
    def _crear_registro(tipo: str, litros: float, precio: float):
        new_log = models.FuelLog(
            unit_id=unit_id,
            operator_id=operator_id,
            trip_leg_id=trip_leg_id,  # 🚀 VÍNCULO CRÍTICO PARA CONCILIACIÓN
            fecha_hora=fecha_hora,
            estacion=estacion,
            tipo_combustible=tipo,
            litros=litros,
            precio_por_litro=precio,
            total=litros * precio,
            odometro=odometro,
            evidencia_url=evidencia_url,
            created_by_id=current_user.id,
        )
        db.add(new_log)
        db.flush()

        # Vincular la foto al historial del documento
        if evidencia_url:
            history = models.FuelDocumentHistory(
                fuel_log_id=new_log.id,
                document_type="ticket",
                filename=filename,
                file_url=evidencia_url,
                version=1,
                is_active=True,
                created_by_id=current_user.id,
            )
            db.add(history)
        created_logs.append(new_log)

    # Registro de Diesel
    if litros_diesel > 0:
        _crear_registro("diesel", litros_diesel, precio_diesel)

    # Registro de Urea
    if litros_urea > 0:
        _crear_registro("urea", litros_urea, precio_urea)

    db.commit()
    for log in created_logs:
        db.refresh(log)

    return created_logs


@router.put("/fuel-logs/{log_id}", response_model=schemas.FuelLogResponse)
async def update_fuel_log(
    log_id: int,
    data: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Buscar el registro existente
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=404, detail="Registro de combustible no encontrado"
        )

    # 2. Actualización de campos operativos
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

    # 🚀 REGLA 1: Vinculación al Tramo (TripLeg)
    # Es vital que el vale esté amarrado al ID de la fase/tramo para la conciliación.
    # El modelo FuelLog solo tiene 'trip_leg_id', no 'trip_id'.
    if data.trip_leg_id:
        log.trip_leg_id = data.trip_leg_id

    # 3. Auditoría (updated_at se maneja solo en el Mixin)
    log.updated_by_id = current_user.id

    try:
        db.commit()
        db.refresh(log)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar el vale {log_id}: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Error de integridad en la base de datos: {str(e)}"
        )

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


@router.delete("/fuel-logs/{log_id}/documents/{doc_type}")
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
