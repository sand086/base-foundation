from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date, timedelta
from typing import Optional

from app.db.database import get_db
from app.models.models import Trip, Client, Operator, TripLeg, Unit
from app.modules.dashboard.schemas import DashboardData

router = APIRouter()


@router.get("/stats", response_model=DashboardData)
def get_dashboard_stats(
    start_date: str = None, end_date: str = None, db: Session = Depends(get_db)
):
    # 1. Ajuste de fechas por defecto (últimos 30 días)
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    # --- KPI CALCULATIONS ---
    # Total servicios y ganancias
    base_query = db.query(Trip).filter(Trip.start_date.between(start_date, end_date))

    total_services = base_query.count()
    total_revenue = (
        db.query(func.sum(Trip.tarifa_base))
        .filter(Trip.start_date.between(start_date, end_date))
        .scalar()
        or 0.0
    )

    # OnTime vs Late (Simplificado por Status)
    on_time = base_query.filter(Trip.status == "entregado").count()
    late = base_query.filter(Trip.status == "retraso").count()

    on_time_percentage = (on_time / total_services * 100) if total_services > 0 else 0

    # --- NUEVO: MÉTRICAS DE FLOTA (Diésel y Kms) ---
    fleet_metrics = (
        db.query(
            func.sum(TripLeg.kms_recorridos).label("total_kms"),
            func.sum(TripLeg.litros_cargados).label("total_liters"),
        )
        .filter(TripLeg.start_date.between(start_date, end_date))
        .first()
    )

    t_kms = float(fleet_metrics.total_kms or 0.0)
    t_liters = float(fleet_metrics.total_liters or 0.0)
    avg_rendimiento = round((t_kms / t_liters), 2) if t_liters > 0 else 0.0

    # --- TOP CLIENTS ---
    top_clients = (
        db.query(
            Client.razon_social.label("client"),
            Client.razon_social.label("shortName"),  # O usar un campo alias si existe
            func.count(Trip.id).label("count"),
            func.sum(Trip.tarifa_base).label("revenue"),
        )
        .join(Trip, Trip.client_id == Client.id)
        .filter(Trip.start_date.between(start_date, end_date))
        .group_by(Client.id)
        .order_by(func.count(Trip.id).desc())
        .limit(5)
        .all()
    )

    # --- OPERATOR STATS ---
    op_stats = (
        db.query(
            Operator.name.label("name"),
            Operator.name.label("shortName"),
            func.count(TripLeg.id).label("trips"),
            func.sum(case((TripLeg.rendimiento_real == None, 0), else_=0)).label(
                "incidents"
            ),
            # NUEVO: Rendimiento por operador (Usa nullif para evitar error si no hay litros registrados)
            (
                func.sum(TripLeg.kms_recorridos)
                / func.nullif(func.sum(TripLeg.litros_cargados), 0)
            ).label("rendimiento"),
        )
        .join(TripLeg, TripLeg.operator_id == Operator.id)
        .filter(TripLeg.start_date.between(start_date, end_date))
        .group_by(Operator.id)
        .limit(8)
        .all()
    )

    # --- RECENT SERVICES ---
    recent = (
        db.query(Trip)
        .join(Client, Trip.client_id == Client.id)
        .order_by(Trip.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "serviceStats": {
            "totalServices": total_services,
            "onTimeCount": on_time,
            "lateCount": late,
            "estimatedRevenue": total_revenue,
            "onTimePercentage": round(on_time_percentage, 1),
            # Inyectados al JSON de respuesta:
            "totalKms": t_kms,
            "totalLiters": t_liters,
            "avgRendimiento": avg_rendimiento,
        },
        "clientServices": [dict(c._mapping) for c in top_clients],
        "operatorStats": [
            {
                **dict(o._mapping),
                "onTimeRate": 95.0,
                # Formateamos a 2 decimales para que se vea limpio en el Frontend (ej. 2.17)
                "rendimiento": round(o.rendimiento, 2) if o.rendimiento else 0.0,
            }
            for o in op_stats
        ],
        "recentServices": [
            {
                "id": f"TRP-{t.id}",
                "clientId": str(t.client_id),
                "clientName": t.client.razon_social,
                "route": f"{t.origin} → {t.destination}",
                "origin": t.origin,
                "destination": t.destination,
                "operator": (
                    t.legs[0].operator.name
                    if t.legs and t.legs[0].operator
                    else "Sin asignar"
                ),
                "operatorId": str(t.legs[0].operator_id) if t.legs else "0",
                "status": t.status.value,
                "date": t.start_date.date(),
                "unitNumber": "TR-100",  # Ajustar para sacar de t.legs[0].unit.numero_economico
            }
            for t in recent
        ],
    }
