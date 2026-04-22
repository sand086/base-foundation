from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date, timedelta
from typing import Optional
import traceback

from app.db.database import get_db

# Agregamos RecordStatus y todos los modelos necesarios
from app.models.models import (
    SystemConfig,
    Trip,
    Client,
    Operator,
    TripLeg,
    Unit,
    FuelLog,
    RecordStatus,
    Mechanic,
    WorkOrder,
    WorkOrderPart,
    WorkOrderStatus,
    TripTimelineEvent,
)
from app.modules.dashboard.schemas import DashboardData

router = APIRouter()


@router.get("/stats", response_model=DashboardData)
def get_dashboard_stats(
    start_date: str = None, end_date: str = None, db: Session = Depends(get_db)
):
    try:
        # 1. Ajuste de fechas por defecto
        if not start_date:
            start_date = date.today() - timedelta(days=120)
        if not end_date:
            end_date = date.today()

        # Total servicios y ganancias
        base_query = db.query(Trip).filter(
            Trip.start_date.between(start_date, end_date),
            Trip.record_status != RecordStatus.ELIMINADO,
        )
        total_services = base_query.count()
        total_revenue = (
            db.query(func.sum(Trip.tarifa_base))
            .filter(
                Trip.start_date.between(start_date, end_date),
                Trip.record_status != RecordStatus.ELIMINADO,
            )
            .scalar()
            or 0.0
        )

        on_time = base_query.filter(Trip.status == "entregado").count()
        late = base_query.filter(Trip.status == "retraso").count()
        on_time_percentage = (
            (on_time / total_services * 100) if total_services > 0 else 0
        )

        # Top Clientes
        top_clients = (
            db.query(
                Client.razon_social.label("client"),
                Client.razon_social.label("shortName"),
                func.count(Trip.id).label("count"),
                func.sum(Trip.tarifa_base).label("revenue"),
            )
            .join(Trip, Trip.client_id == Client.id)
            .filter(
                Trip.start_date.between(start_date, end_date),
                Trip.record_status != RecordStatus.ELIMINADO,
            )
            .group_by(Client.id)
            .order_by(func.sum(Trip.tarifa_base).desc())
            .all()
        )

        # --- 2. OPERATOR STATS (CÁLCULO EN PYTHON PURO) ---
        op_stats_data = []
        operadores = db.query(Operator).filter(Operator.status != "inactivo").all()

        for op in operadores:
            # A) Viajes y Revenue
            trips_del_operador = (
                db.query(Trip)
                .join(TripLeg, TripLeg.trip_id == Trip.id)
                .filter(
                    TripLeg.operator_id == op.id,
                    Trip.start_date.between(start_date, end_date),
                    Trip.record_status != RecordStatus.ELIMINADO,
                )
                .distinct()
                .all()
            )

            trips_count = len(trips_del_operador)
            revenue = sum(t.tarifa_base for t in trips_del_operador)

            # B) Incidencias (Tabla Monitoreo)
            incidents = (
                db.query(func.count(TripTimelineEvent.id))
                .join(TripLeg, TripTimelineEvent.trip_leg_id == TripLeg.id)
                .filter(
                    TripLeg.operator_id == op.id,
                    TripTimelineEvent.time.between(start_date, end_date),
                    TripTimelineEvent.event_type.in_(
                        ["warning", "danger", "incidencia", "alerta", "retraso"]
                    ),
                )
                .scalar()
                or 0
            )

            # C) RENDIMIENTO (SIN FALLAS - Lista extraída a Python)
            fuel_logs_op = (
                db.query(FuelLog.odometro, FuelLog.litros)
                .filter(
                    FuelLog.operator_id == op.id,
                    FuelLog.fecha_hora.between(start_date, end_date),
                    FuelLog.record_status != RecordStatus.ELIMINADO,
                    FuelLog.is_conciliated == True,
                    FuelLog.odometro > 0,
                )
                .all()
            )

            rend_real = 0.0

            # 🚀 LA REGLA DE ORO: Si hay más de 1 ticket, calculamos. Si no, es 0.0
            if len(fuel_logs_op) > 1:
                odometros = [f.odometro for f in fuel_logs_op]
                litros = [f.litros for f in fuel_logs_op]

                distancia = max(odometros) - min(odometros)
                litros_totales = sum(litros)

                if litros_totales > 0 and distancia > 0:
                    rend_real = round((distancia / litros_totales), 2)

            # Solo agregamos al operador a la gráfica si tiene algún viaje, o un rendimiento registrado
            if trips_count > 0 or len(fuel_logs_op) > 0:
                op_stats_data.append(
                    {
                        "name": op.name,
                        "shortName": op.name.split(" ")[0] if op.name else "N/A",
                        "trips": trips_count,
                        "incidents": incidents,
                        "onTimeRate": 95.0,
                        "rendimiento_lectura": rend_real,  # Igualamos hasta tener API ECM
                        "rendimiento_real": rend_real,
                        "revenue": float(revenue),
                    }
                )

        # Ordenamos a los operadores (Top 8 por ingresos)
        op_stats_data = sorted(op_stats_data, key=lambda x: x["revenue"], reverse=True)[
            :8
        ]

        # Recent Services
        recent = (
            db.query(Trip)
            .join(Client, Trip.client_id == Client.id)
            .filter(Trip.record_status != RecordStatus.ELIMINADO)
            .order_by(Trip.created_at.desc())
            .limit(10)
            .all()
        )

        # --- 4. VENTAS DIARIAS VS META ---
        meta_config = (
            db.query(SystemConfig)
            .filter(SystemConfig.key == "meta_diaria_ventas")
            .first()
        )

        try:
            META_DIARIA = (
                float(meta_config.value) if meta_config and meta_config.value else 0.0
            )
        except ValueError:
            META_DIARIA = 0.0

        daily_query = (
            db.query(
                func.date(Trip.start_date).label("day"),
                func.sum(Trip.tarifa_base).label("revenue"),
            )
            .filter(
                Trip.start_date.between(start_date, end_date),
                Trip.record_status != RecordStatus.ELIMINADO,
            )
            .group_by(func.date(Trip.start_date))
            .order_by(func.date(Trip.start_date).asc())
            .all()
        )

        daily_revenue_data = [
            {"day": str(d.day), "revenue": float(d.revenue or 0.0), "meta": META_DIARIA}
            for d in daily_query
        ]

        # --- 5. MÉTRICAS DE TALLER ---
        mechanic_query = (
            db.query(
                Mechanic.nombre.label("mechanic_name"),
                func.count(WorkOrder.id.distinct()).label("ordenes_cerradas"),
                func.sum(
                    WorkOrderPart.cantidad * WorkOrderPart.costo_unitario_snapshot
                ).label("gasto_total"),
            )
            .join(WorkOrder, WorkOrder.mechanic_id == Mechanic.id)
            .outerjoin(WorkOrderPart, WorkOrderPart.work_order_id == WorkOrder.id)
            .filter(
                WorkOrder.status == WorkOrderStatus.CERRADA,
                WorkOrder.fecha_cierre.between(start_date, end_date),
            )
            .group_by(Mechanic.id)
            .all()
        )

        mechanic_stats_data = [
            {
                "mechanic_name": m.mechanic_name,
                "ordenes_cerradas": m.ordenes_cerradas,
                "gasto_total": float(m.gasto_total or 0.0),
            }
            for m in mechanic_query
        ]

        # --- 3. MÉTRICAS MENSUALES PARA GRÁFICAS ---

        # 1. Tendencia de Ingresos (Últimos 6 meses)
        revenue_trend_query = (
            db.query(
                func.to_char(Trip.start_date, "YYYY-MM").label("month"),
                func.sum(Trip.tarifa_base).label("revenue"),
            )
            .filter(
                Trip.start_date >= (date.today() - timedelta(days=180)),
                Trip.record_status != RecordStatus.ELIMINADO,
            )
            .group_by(func.to_char(Trip.start_date, "YYYY-MM"))
            .order_by("month")
            .all()
        )
        revenueTrend = [
            {"month": r.month, "revenue": float(r.revenue or 0.0)}
            for r in revenue_trend_query
        ]

        # 2. Configuración de Viaje (Full vs Sencillo)
        config_query = (
            db.query(
                func.to_char(Trip.start_date, "YYYY-MM").label("month"),
                func.count(case((Unit.tipo_1.ilike("%full%"), 1), else_=None)).label(
                    "fullCount"
                ),
                func.count(case((~Unit.tipo_1.ilike("%full%"), 1), else_=None)).label(
                    "sencilloCount"
                ),
            )
            .join(TripLeg, TripLeg.trip_id == Trip.id)
            .join(Unit, TripLeg.unit_id == Unit.id)
            .filter(
                Trip.start_date >= (date.today() - timedelta(days=180)),
                Trip.record_status != RecordStatus.ELIMINADO,
                TripLeg.leg_type == "ruta_carretera",
            )
            .group_by(func.to_char(Trip.start_date, "YYYY-MM"))
            .order_by("month")
            .all()
        )
        tripConfigTrend = [
            {
                "month": r.month,
                "fullCount": r.fullCount,
                "sencilloCount": r.sencilloCount,
            }
            for r in config_query
        ]

        # 3. Tendencia de Combustible (Arreglado para sacar Max/Min por mes en la BD)
        fuel_query_global = (
            db.query(
                func.to_char(FuelLog.fecha_hora, "YYYY-MM").label("month"),
                func.min(FuelLog.odometro).label("min_odo"),
                func.max(FuelLog.odometro).label("max_odo"),
                func.sum(FuelLog.litros).label("litros_tot"),
            )
            .filter(
                FuelLog.fecha_hora >= (date.today() - timedelta(days=180)),
                FuelLog.record_status != RecordStatus.ELIMINADO,
                FuelLog.is_conciliated == True,
                FuelLog.odometro > 0,
            )
            .group_by(func.to_char(FuelLog.fecha_hora, "YYYY-MM"))
            .order_by("month")
            .all()
        )

        fuelTrend = []
        for r in fuel_query_global:
            dist = (r.max_odo or 0) - (r.min_odo or 0)
            lts = float(r.litros_tot or 0.0)
            rend = round((dist / lts), 2) if lts > 0 and dist > 0 else 0.0
            fuelTrend.append(
                {
                    "month": r.month,
                    "liters": lts,
                    "kms": dist,
                    "rendimiento": rend,
                }
            )

        # Calcular flota global usando la misma lógica robusta (Para la KPI card)
        total_kms_global = sum(f["kms"] for f in fuelTrend)
        total_litros_global = sum(f["liters"] for f in fuelTrend)
        avg_rendimiento_global = (
            round(total_kms_global / total_litros_global, 2)
            if total_litros_global > 0
            else 0.0
        )

        return {
            "serviceStats": {
                "totalServices": total_services,
                "onTimeCount": on_time,
                "lateCount": late,
                "estimatedRevenue": total_revenue,
                "onTimePercentage": round(on_time_percentage, 1),
                "totalKms": total_kms_global,
                "totalLiters": total_litros_global,
                "avgRendimiento": avg_rendimiento_global,
            },
            "clientServices": [dict(c._mapping) for c in top_clients],
            "operatorStats": op_stats_data,
            "recentServices": [
                {
                    "id": f"TRP-{t.id}",
                    "clientId": str(t.client_id),
                    "clientName": t.client.razon_social,
                    "route": f"{t.origin} -> {t.destination}",
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
                    "unitNumber": "TR-100",
                }
                for t in recent
            ],
            "revenueTrend": revenueTrend,
            "tripConfigTrend": tripConfigTrend,
            "fuelTrend": fuelTrend,
            "dailyRevenue": daily_revenue_data,
            "mechanicStats": mechanic_stats_data,
        }

    except Exception as e:
        error_detail = f"Error interno: {str(e)}"
        import traceback

        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=error_detail)
