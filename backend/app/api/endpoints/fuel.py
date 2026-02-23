import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.db.database import get_db
from app.models import models
from app.schemas import fuel as schemas
from app.api.endpoints.auth import get_current_user

router = APIRouter()

# Directorio de subida (Senior Tip: Usar variables de entorno en prod)
UPLOAD_DIR = "uploads/fuel_tickets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post(
    "/fuel-logs",
    response_model=schemas.FuelLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_fuel_log(
    # Recibimos los campos uno por uno porque Multipart no envía JSON puro fácilmente
    unit_id: int = Form(...),
    operator_id: int = Form(...),
    fecha_hora: str = Form(...),  # Llega como string ISO del front
    estacion: str = Form(...),
    tipo_combustible: str = Form(...),
    litros: float = Form(...),
    precio_por_litro: float = Form(...),
    total: float = Form(...),
    odometro: int = Form(...),
    excede_tanque: bool = Form(False),
    capacidad_tanque_snapshot: Optional[float] = Form(None),
    # El archivo de la foto
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        # 1. Procesar la imagen si existe
        file_url = None
        if file:
            # Senior Tip: Generar nombre único para evitar colisiones y ataques de Path Traversal
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # La URL que guardamos (ajustar según tu config de archivos estáticos)
            file_url = f"/static/fuel_tickets/{unique_filename}"

        # 2. Crear el registro en la DB
        # Convertir string de fecha a objeto datetime
        dt_fecha = datetime.fromisoformat(fecha_hora.replace("Z", "+00:00"))

        db_log = models.FuelLog(
            unit_id=unit_id,
            operator_id=operator_id,
            fecha_hora=dt_fecha,
            estacion=estacion.upper(),
            tipo_combustible=tipo_combustible.lower(),
            litros=litros,
            precio_por_litro=precio_por_litro,
            total=total,
            odometro=odometro,
            evidencia_url=file_url,
            excede_tanque=excede_tanque,
            capacidad_tanque_snapshot=capacidad_tanque_snapshot,
            created_by_id=current_user.id,  # Auditoría automática
        )

        db.add(db_log)
        db.commit()
        db.refresh(db_log)

        return db_log

    except Exception as e:
        db.rollback()
        # Si hubo error y guardamos un archivo, deberíamos borrarlo (limpieza Senior)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar carga: {str(e)}",
        )


@router.get("/fuel-logs", response_model=List[schemas.FuelLogResponse])
def get_fuel_logs(
    unit_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Usando sintaxis SQLAlchemy 2.0 (select)
    stmt = select(models.FuelLog).where(models.FuelLog.record_status == "A")

    if unit_id:
        stmt = stmt.where(models.FuelLog.unit_id == unit_id)

    # Ordenar por fecha más reciente
    stmt = stmt.order_by(models.FuelLog.fecha_hora.desc())

    result = db.execute(stmt)
    return result.scalars().all()
