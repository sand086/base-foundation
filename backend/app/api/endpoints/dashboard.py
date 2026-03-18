from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date, timedelta
from typing import Optional

from app.db.database import get_db
from app.models.models import Trip, Client, Operator, TripLeg, Unit
from app.schemas.dashboard import DashboardData

router = APIRouter()


@router.get("/stats", response_model=DashboardData)
def get_dashboard_stats(start_date: str, end_date: str, db: Session = Depends(get_db)):
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
    # Nota: Los incidentes se cuentan si el tramo (TripLeg) tiene algo registrado
    op_stats = (
        db.query(
            Operator.name.label("name"),
            Operator.name.label("shortName"),
            func.count(TripLeg.id).label("trips"),
            func.sum(case((TripLeg.rendimiento_real == None, 0), else_=0)).label(
                "incidents"
            ),  # Ajustar lógica según tu uso de incidentes
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
        },
        "clientServices": [dict(c._mapping) for c in top_clients],
        "operatorStats": [
            {**dict(o._mapping), "onTimeRate": 95.0}
            for o in op_stats  # onTimeRate quemado o calculado
        ],
        "recentServices": [
            {
                "id": f"SRV-{t.id}",
                "clientId": str(t.client_id),
                "clientName": t.client.razon_social,
                "route": f"{t.origin} → {t.destination}",
                "origin": t.origin,
                "destination": t.destination,
                "operator": t.legs[0].operator.name if t.legs else "Sin asignar",
                "operatorId": str(t.legs[0].operator_id) if t.legs else "0",
                "status": t.status.value,
                "date": t.start_date.date(),
                "unitNumber": "TR-100",  # Ajustar para sacar de t.legs[0].unit.numero_economico
            }
            for t in recent
        ],
    }
