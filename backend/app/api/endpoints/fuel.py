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

# Directorio de subida (Senior Tip: Usar variables de entorno en prod)
UPLOAD_DIR = "uploads/fuel_tickets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/fuel-logs", response_model=List[schemas.FuelLogResponse])
def get_fuel_logs(
    unit_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # 1. Construir la consulta con CARGA ANSIOSA (joinedload)
    stmt = (
        select(models.FuelLog)
        .options(
            joinedload(models.FuelLog.unit),  # Trae la info de la unidad
            joinedload(models.FuelLog.operator),  # Trae la info del operador
        )
        .where(models.FuelLog.record_status == "A")
    )

    if unit_id:
        stmt = stmt.where(models.FuelLog.unit_id == unit_id)

    stmt = stmt.order_by(models.FuelLog.fecha_hora.desc())

    # 2. Ejecutar con .unique() para evitar el error de colecciones
    result = db.execute(stmt)
    return result.scalars().unique().all()


@router.post("/fuel-logs", response_model=schemas.FuelLogResponse)
async def create_fuel_log(
    unidadId: int = Form(...),
    operadorId: int = Form(...),
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
    # 1. Guardar archivo físico
    evidencia_url = None
    filename = None
    if file:
        storage = StorageService.save_file(
            file, folder="fuel_tickets", prefix=f"FUEL_{unidadId}"
        )
        evidencia_url = storage["url"]
        filename = storage["filename"]

    # 2. Crear Registro Principal
    new_log = models.FuelLog(
        unit_id=unidadId,
        operator_id=operadorId,
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

    # 3. Guardar en Historial si hubo archivo
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
    # 1. Buscar el registro incluyendo las relaciones para la respuesta
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()

    if not log:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    # 2. Actualizar TODOS los campos enviados por el Frontend
    log.unit_id = data.unit_id
    log.operator_id = data.operator_id
    log.fecha_hora = data.fecha_hora
    log.estacion = data.estacion
    log.tipo_combustible = data.tipo_combustible
    log.litros = data.litros
    log.precio_por_litro = data.precio_por_litro
    log.total = (
        data.total
    )  # Usamos el total enviado o recalculamos: data.litros * data.precio_por_litro
    log.odometro = data.odometro
    log.excede_tanque = data.excede_tanque
    log.capacidad_tanque_snapshot = data.capacidad_tanque_snapshot

    # 3. Auditoría
    log.updated_by_id = current_user.id

    try:
        db.commit()
        # Refrescamos para cargar las relaciones 'unit' y 'operator' actualizadas
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

    # Borrado lógico estándar
    log.record_status = "E"
    db.commit()
    return {"message": "Registro eliminado"}


@router.get("/fuel-logs/{log_id}/documents/{doc_type}/history")
def get_fuel_history(log_id: int, doc_type: str, db: Session = Depends(get_db)):
    """Requerido por el DocumentUploadManager del Front"""
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
    # 1. Validar que el registro de combustible existe
    log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=404, detail="Registro de combustible no encontrado"
        )

    # 2. Guardar archivo físico en la carpeta de tickets
    storage_data = StorageService.save_file(
        file, folder="fuel_tickets", prefix=f"FUEL_UPD_{log.unit_id}"
    )

    # 3. Versionamiento: Desactivar el ticket anterior
    db.query(models.FuelDocumentHistory).filter(
        models.FuelDocumentHistory.fuel_log_id == log_id,
        models.FuelDocumentHistory.document_type == doc_type,
        models.FuelDocumentHistory.is_active == True,
    ).update({"is_active": False})

    # 4. Calcular el siguiente número de versión
    last_v = (
        db.query(func.max(models.FuelDocumentHistory.version))
        .filter(
            models.FuelDocumentHistory.fuel_log_id == log_id,
            models.FuelDocumentHistory.document_type == doc_type,
        )
        .scalar()
        or 0
    )

    # 5. Crear el nuevo registro en el historial
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

    # 6. Actualizar el puntero principal en la tabla fuel_logs
    log.evidencia_url = storage_data["url"]
    log.updated_by_id = current_user.id

    db.add(new_doc)
    db.commit()

    return {
        "url": new_doc.file_url,
        "version": new_doc.version,
        "message": "Nueva evidencia cargada correctamente",
    }
