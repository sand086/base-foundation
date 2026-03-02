from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models import models
from app.schemas import tolls as schemas
from app.api.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/tolls", response_model=List[schemas.TollBoothResponse])
def list_tolls(search: str = "", db: Session = Depends(get_db)):
    query = db.query(models.TollBooth).filter(models.TollBooth.record_status == "A")
    if search:
        query = query.filter(
            models.TollBooth.nombre.ilike(f"%{search}%")
            | models.TollBooth.tramo.ilike(f"%{search}%")
        )
    return query.all()


@router.post("/tolls", response_model=schemas.TollBoothResponse)
def create_toll(
    toll: schemas.TollBoothCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_toll = models.TollBooth(**toll.model_dump(), created_by_id=user.id)
    db.add(db_toll)
    db.commit()
    db.refresh(db_toll)
    return db_toll


@router.put("/tolls/{toll_id}", response_model=schemas.TollBoothResponse)
def update_toll(
    toll_id: int,
    toll: schemas.TollBoothUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_toll = db.query(models.TollBooth).get(toll_id)
    if not db_toll:
        raise HTTPException(404)
    for k, v in toll.model_dump(exclude_unset=True).items():
        setattr(db_toll, k, v)
    db_toll.updated_by_id = user.id
    db.commit()
    return db_toll


@router.delete("/tolls/{toll_id}")
def delete_toll(toll_id: int, db: Session = Depends(get_db)):
    db_toll = db.query(models.TollBooth).get(toll_id)
    # Validación: No borrar si se usa en rutas activas
    usage = db.query(models.RateTemplateToll).filter_by(toll_booth_id=toll_id).first()
    if usage:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: La caseta está en uso por rutas guardadas.",
        )
    db_toll.record_status = "E"
    db.commit()
    return {"status": "deleted"}


@router.post("/rate-templates", response_model=schemas.RateTemplateResponse)
def create_template(
    data: schemas.RateTemplateCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # 1. Crear cabecera
    new_template = models.RateTemplate(
        client_id=data.client_id,
        origen=data.origen,
        destino=data.destino,
        tipo_unidad=data.tipo_unidad,
        created_by_id=user.id,
    )
    db.add(new_template)
    db.flush()

    total_s = 0.0
    total_f = 0.0
    total_km = 0.0
    total_min = 0

    # 2. Procesar Segmentos
    for seg_data in data.segments:
        cost_s = 0.0
        cost_f = 0.0

        # Si tiene caseta, obtener costos actuales para el snapshot
        if seg_data.toll_booth_id:
            toll = db.query(models.TollBooth).get(seg_data.toll_booth_id)
            if toll:
                if data.tipo_unidad == "5ejes":
                    cost_s, cost_f = toll.costo_5_ejes_sencillo, toll.costo_5_ejes_full
                else:
                    cost_s, cost_f = toll.costo_9_ejes_sencillo, toll.costo_9_ejes_full

            segment = models.RateSegment(
                rate_template_id=new_template.id,
                **seg_data.model_dump(
                    exclude={
                        "toll_booth_id",
                        "rate_template_id",
                        "costo_momento_sencillo",
                        "costo_momento_full",
                    }
                ),
                toll_booth_id=seg_data.toll_booth_id,
                costo_momento_sencillo=cost_s,
                costo_momento_full=cost_f,
            )
        db.add(segment)

        total_s += cost_s
        total_f += cost_f
        total_km += seg_data.distancia_km
        total_min += seg_data.tiempo_minutos

    # 3. Actualizar totales en cabecera
    new_template.costo_total_sencillo = total_s
    new_template.costo_total_full = total_f
    new_template.distancia_total_km = total_km
    new_template.tiempo_total_minutos = total_min

    db.commit()
    db.refresh(new_template)
    return new_template


@router.get("/rate-templates", response_model=List[schemas.RateTemplateResponse])
def list_templates(
    search: str = "",
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.RateTemplate).filter(
        models.RateTemplate.record_status == "A"
    )

    if search:
        query = query.filter(
            models.RateTemplate.origen.ilike(f"%{search}%")
            | models.RateTemplate.destino.ilike(f"%{search}%")
        )

    if client_id:
        query = query.filter_by(client_id=client_id)

    return query.limit(50).all()


@router.delete("/rate-templates/{template_id}")
def delete_template(
    template_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    # 1. Buscar la ruta por ID
    db_template = (
        db.query(models.RateTemplate)
        .filter(models.RateTemplate.id == template_id)
        .first()
    )

    # 2. Si no existe, lanzar 404
    if not db_template:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    # 3. Borrado lógico: cambiar record_status a 'E' (Eliminado)
    db_template.record_status = "E"

    # 4. Registrar quién lo eliminó (aprovechando el AuditMixin)
    db_template.updated_by_id = user.id

    db.commit()
    return {"status": "deleted", "message": "Ruta eliminada correctamente"}
