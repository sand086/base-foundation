# backend/app/api/endpoints/tolls.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, contains_eager
from typing import List, Optional
from app.db.database import get_db
from app.models import models
from app.schemas import tolls as schemas
from app.api.endpoints.auth import get_current_user
from sqlalchemy.exc import IntegrityError
import datetime

router = APIRouter()

# =====================================================================
# CASETAS (TOLL BOOTHS)
# =====================================================================


@router.get("", response_model=List[schemas.TollBoothResponse])
def list_tolls(search: str = "", db: Session = Depends(get_db)):
    # 🚀 Filtramos para que SOLO mande las activas
    query = db.query(models.TollBooth).filter(models.TollBooth.record_status == "A")
    if search:
        query = query.filter(
            models.TollBooth.nombre.ilike(f"%{search}%")
            | models.TollBooth.tramo.ilike(f"%{search}%")
        )
    return query.all()


@router.post("", response_model=schemas.TollBoothResponse)
def create_toll(
    toll: schemas.TollBoothCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_toll = models.TollBooth(**toll.model_dump(), created_by_id=user.id)
    db.add(db_toll)

    try:
        db.commit()
        db.refresh(db_toll)
        return db_toll
    except IntegrityError:
        # Revertimos la transacción si hay error de llave duplicada
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una caseta registrada con ese mismo Nombre y Tramo.",
        )


@router.put("/{toll_id}", response_model=schemas.TollBoothResponse)
def update_toll(
    toll_id: int,
    toll: schemas.TollBoothUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_toll = db.query(models.TollBooth).get(toll_id)
    if not db_toll:
        raise HTTPException(status_code=404, detail="Caseta no encontrada")

    # 1. Actualizamos la caseta en el catálogo maestro
    for k, v in toll.model_dump(exclude_unset=True).items():
        setattr(db_toll, k, v)
    db_toll.updated_by_id = user.id
    db.flush()

    # 2. Buscamos todos los segmentos ACTIVOS que usan esta caseta
    segments = (
        db.query(models.RateSegment)
        .filter(
            models.RateSegment.toll_booth_id == toll_id,
            models.RateSegment.record_status == "A",
        )
        .all()
    )

    templates_to_update = set()
    for seg in segments:
        # Actualizamos la foto del precio en el segmento
        seg.costo_momento_sencillo = db_toll.costo_5_ejes_sencillo
        seg.costo_momento_full = db_toll.costo_9_ejes_full
        if seg.template:
            templates_to_update.add(seg.template)

    db.flush()

    # 3. Recalculamos totales de cada ruta e impactamos convenios de clientes
    for template in templates_to_update:
        active_segments = (
            db.query(models.RateSegment)
            .filter(
                models.RateSegment.rate_template_id == template.id,
                models.RateSegment.record_status == "A",
            )
            .all()
        )

        template.costo_total_sencillo = sum(
            (s.costo_momento_sencillo or 0.0) for s in active_segments
        )
        template.costo_total_full = sum(
            (s.costo_momento_full or 0.0) for s in active_segments
        )

        # 🚀 ACTUALIZAR TARIFAS AUTORIZADAS DE CLIENTES
        client_tariffs = (
            db.query(models.Tariff)
            .filter(
                models.Tariff.rate_template_id == template.id,
                models.Tariff.record_status == "A",
            )
            .all()
        )

        for ct in client_tariffs:
            es_full = (
                "full" in (ct.tipo_unidad or "").lower()
                or "9" in (ct.tipo_unidad or "").lower()
            )
            ct.costo_casetas = (
                template.costo_total_full if es_full else template.costo_total_sencillo
            )

    try:
        db.commit()
        db.refresh(db_toll)
        return db_toll
    except IntegrityError:
        # Si el usuario intentó actualizar el nombre/tramo a uno que ya existe
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe otra caseta registrada con ese mismo Nombre y Tramo.",
        )


# 🚀 NUEVO ENDPOINT: Verifica dependencias ANTES de borrar
@router.get("/{toll_id}/dependencies")
def check_toll_dependencies(toll_id: int, db: Session = Depends(get_db)):
    rutas_count = (
        db.query(models.RateSegment)
        .filter(
            models.RateSegment.toll_booth_id == toll_id,
            models.RateSegment.record_status == "A",  # Solo cuenta en rutas activas
        )
        .count()
    )
    return {"in_use": rutas_count > 0, "rutas_count": rutas_count}


# 🚀 ENDPOINT ACTUALIZADO: Recibe la decisión del usuario y hace borrado lógico
@router.delete("/{toll_id}")
def delete_toll(
    toll_id: int, remove_from_routes: bool = Query(False), db: Session = Depends(get_db)
):
    db_toll = db.query(models.TollBooth).get(toll_id)
    if not db_toll:
        raise HTTPException(status_code=404, detail="Caseta no encontrada")

    # Buscar en qué segmentos está viva esta caseta
    segments = (
        db.query(models.RateSegment)
        .filter(
            models.RateSegment.toll_booth_id == toll_id,
            models.RateSegment.record_status == "A",
        )
        .all()
    )

    if segments:
        if remove_from_routes:
            templates_to_update = set()

            # 1. Borrado Lógico: En lugar de destruir, cambiamos el estatus a "E"
            for seg in segments:
                if seg.template:
                    templates_to_update.add(seg.template)
                seg.record_status = "E"
                db.add(seg)

            db.flush()

            # 2. Recalculamos los totales de las rutas afectadas (Ignorando los "E")
            for template in templates_to_update:
                active_segments = (
                    db.query(models.RateSegment)
                    .filter(
                        models.RateSegment.rate_template_id == template.id,
                        models.RateSegment.record_status == "A",  # 🚀 SOLO ACTIVOS
                    )
                    .all()
                )

                total_s = sum(
                    (s.costo_momento_sencillo or 0.0) for s in active_segments
                )
                total_f = sum((s.costo_momento_full or 0.0) for s in active_segments)
                total_km = sum((s.distancia_km or 0.0) for s in active_segments)
                total_min = sum((s.tiempo_minutos or 0) for s in active_segments)

                template.costo_total_sencillo = total_s
                template.costo_total_full = total_f
                template.distancia_total_km = total_km
                template.tiempo_total_minutos = total_min

        # Inactivamos la caseta en el catálogo ('I')
        db_toll.record_status = "I"
        msg = "Caseta inactivada y sus tramos marcados como eliminados en las rutas (Borrado lógico)."
    else:
        db_toll.record_status = "E"
        msg = "Caseta eliminada permanentemente del sistema."

    db.commit()
    return {"status": "success", "message": msg}


# =====================================================================
# RUTAS ARMADAS (RATE TEMPLATES)
# =====================================================================


@router.get("/rate-templates", response_model=List[schemas.RateTemplateResponse])
def list_templates(
    search: str = "",
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    # 🚀 FILTRO CRÍTICO: Join con segmentos para ignorar los que tienen 'E'
    query = (
        db.query(models.RateTemplate)
        .outerjoin(
            models.RateSegment,
            (models.RateSegment.rate_template_id == models.RateTemplate.id)
            & (models.RateSegment.record_status == "A"),  # Solo hijos vivos
        )
        .options(contains_eager(models.RateTemplate.segments))
        .filter(models.RateTemplate.record_status == "A")
    )

    if search:
        query = query.filter(
            models.RateTemplate.origen.ilike(f"%{search}%")
            | models.RateTemplate.destino.ilike(f"%{search}%")
        )

    if client_id:
        query = query.filter(models.RateTemplate.client_id == client_id)

    # Nota: contains_eager requiere un order_by en el padre si los hijos están ordenados
    return query.order_by(models.RateTemplate.id.desc()).limit(50).all()


@router.post("/rate-templates", response_model=schemas.RateTemplateResponse)
def create_template(
    data: schemas.RateTemplateCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # 🚀 1. VALIDACIÓN: Evitar duplicados solo si la ruta está ACTIVA
    existing_route = (
        db.query(models.RateTemplate)
        .filter(
            models.RateTemplate.origen == data.origen,
            models.RateTemplate.destino == data.destino,
            models.RateTemplate.client_id == data.client_id,
            models.RateTemplate.record_status == "A",  # Solo buscamos entre las activas
        )
        .first()
    )

    if existing_route:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una ruta ACTIVA con este mismo origen y destino para este cliente.",
        )

    new_template = models.RateTemplate(
        client_id=data.client_id,
        origen=data.origen,
        destino=data.destino,
        tipo_unidad=data.tipo_unidad,
        created_by_id=user.id,
    )
    db.add(new_template)
    db.flush()

    total_s, total_f, total_km, total_min = 0.0, 0.0, 0.0, 0

    for seg_data in data.segments:
        cost_s, cost_f = 0.0, 0.0

        if seg_data.toll_booth_id:
            toll = db.query(models.TollBooth).get(seg_data.toll_booth_id)
            if toll:
                cost_s = toll.costo_5_ejes_sencillo
                cost_f = toll.costo_9_ejes_full

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

    new_template.costo_total_sencillo = total_s
    new_template.costo_total_full = total_f
    new_template.distancia_total_km = total_km
    new_template.tiempo_total_minutos = total_min

    db.commit()
    db.refresh(new_template)
    return new_template


@router.put(
    "/rate-templates/{template_id}", response_model=schemas.RateTemplateResponse
)
def update_template(
    template_id: int,
    data: schemas.RateTemplateUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_template = (
        db.query(models.RateTemplate)
        .filter(models.RateTemplate.id == template_id)
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    # Actualizamos campos básicos
    update_data = data.model_dump(exclude={"segments"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    db_template.updated_by_id = user.id

    if data.segments is not None:
        # 🚀 SOLUCIÓN AL SAWarning y Duplicación:
        # 1. Vaciamos la relación en memoria
        db_template.segments = []

        # 2. Borramos físicamente con synchronize_session='fetch' para que
        # SQLAlchemy actualice su estado interno y no de errores en el flush
        db.query(models.RateSegment).filter(
            models.RateSegment.rate_template_id == template_id
        ).delete(synchronize_session="fetch")

        db.flush()

        total_s, total_f, total_km, total_min = 0.0, 0.0, 0.0, 0

        # 3. Insertamos los nuevos segmentos
        for seg_data in data.segments:
            cost_s, cost_f = 0.0, 0.0
            if seg_data.toll_booth_id:
                toll = db.query(models.TollBooth).get(seg_data.toll_booth_id)
                if toll:
                    cost_s = toll.costo_5_ejes_sencillo
                    cost_f = toll.costo_9_ejes_full

            new_seg = models.RateSegment(
                rate_template_id=template_id,
                **seg_data.model_dump(
                    exclude={
                        "rate_template_id",
                        "costo_momento_sencillo",
                        "costo_momento_full",
                        "id",
                    }
                ),
                costo_momento_sencillo=cost_s,
                costo_momento_full=cost_f,
                record_status="A",
            )
            db.add(new_seg)

            total_s += cost_s
            total_f += cost_f
            total_km += seg_data.distancia_km
            total_min += seg_data.tiempo_minutos

        db_template.costo_total_sencillo = total_s
        db_template.costo_total_full = total_f
        db_template.distancia_total_km = total_km
        db_template.tiempo_total_minutos = total_min

        db.flush()

        # 🚀 ACTUALIZAR TARIFAS AUTORIZADAS DE CLIENTES
        client_tariffs = (
            db.query(models.Tariff)
            .filter(
                models.Tariff.rate_template_id == template_id,
                models.Tariff.record_status == "A",
            )
            .all()
        )

        for ct in client_tariffs:
            es_full = (
                "full" in (ct.tipo_unidad or "").lower()
                or "9" in (ct.tipo_unidad or "").lower()
            )
            ct.costo_casetas = (
                db_template.costo_total_full
                if es_full
                else db_template.costo_total_sencillo
            )

    db.commit()
    db.expire_all()
    db.refresh(db_template)
    return db_template


@router.delete("/rate-templates/{template_id}")
def delete_template(
    template_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    db_template = (
        db.query(models.RateTemplate)
        .filter(models.RateTemplate.id == template_id)
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    # 🚀 2. MAGIA: Alteramos el nombre para liberar el original
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M")
    db_template.origen = f"{db_template.origen} [ELIMINADA-{timestamp}]"

    # Hacemos el borrado lógico
    db_template.record_status = "E"
    db_template.updated_by_id = user.id
    db.commit()

    return {
        "status": "deleted",
        "message": "Ruta eliminada correctamente. El nombre ha sido liberado.",
    }
