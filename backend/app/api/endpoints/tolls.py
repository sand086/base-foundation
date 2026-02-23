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
            | models.models.TollBooth.tramo.ilike(f"%{search}%")
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
def create_route_template(
    data: schemas.RateTemplateCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Calcular costos consultando los precios reales de las casetas
    tolls = (
        db.query(models.TollBooth).filter(models.TollBooth.id.in_(data.toll_ids)).all()
    )
    toll_map = {t.id: t for t in tolls}

    cost_sencillo = 0.0
    cost_full = 0.0

    for tid in data.toll_ids:
        t = toll_map.get(tid)
        if t:
            if data.toll_unit_type == "5ejes":
                cost_sencillo += t.costo_5_ejes_sencillo
                cost_full += t.costo_5_ejes_full
            else:
                cost_sencillo += t.costo_9_ejes_sencillo
                cost_full += t.costo_9_ejes_full

    new_template = models.RateTemplate(
        client_id=data.client_id,
        origen=data.origen,
        destino=data.destino,
        toll_unit_type=data.toll_unit_type,
        costo_total_sencillo=cost_sencillo,
        costo_total_full=cost_full,
        created_by_id=user.id,
    )
    db.add(new_template)
    db.flush()  # Para obtener el ID

    # Guardar asociación con orden (posición)
    for idx, tid in enumerate(data.toll_ids):
        db.add(
            models.RateTemplateToll(
                rate_template_id=new_template.id, toll_booth_id=tid, position=idx + 1
            )
        )

    db.commit()
    db.refresh(new_template)
    return new_template


@router.get("/rate-templates", response_model=List[schemas.RateTemplateResponse])
def list_templates(client_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.RateTemplate).filter(
        models.RateTemplate.record_status == "A"
    )
    if client_id:
        query = query.filter_by(client_id=client_id)
    return query.all()
