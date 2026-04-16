# --- Fuente: schemas_dashboard.py ---
from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class ServiceStats(BaseModel):
    totalServices: int
    onTimeCount: int
    lateCount: int
    estimatedRevenue: float
    onTimePercentage: float
    totalKms: float
    totalLiters: float
    avgRendimiento: float


class ClientServiceCount(BaseModel):
    client: str
    shortName: str
    count: int
    revenue: float


class OperatorStats(BaseModel):
    name: str
    shortName: str
    trips: int
    incidents: int
    onTimeRate: float
    rendimiento_lectura: float  # NUEVO: Para la línea 1 de la gráfica
    rendimiento_real: float  # NUEVO: Para la línea 2 de la gráfica
    revenue: float


class RecentService(BaseModel):
    id: str
    clientId: str
    clientName: str
    route: str
    origin: str
    destination: str
    operator: str
    operatorId: str
    status: str
    date: date
    unitNumber: str


class MonthlyRevenue(BaseModel):
    month: str
    revenue: float


class MonthlyTripConfig(BaseModel):
    month: str
    fullCount: int
    sencilloCount: int


class MonthlyFuelStat(BaseModel):
    month: str
    liters: float
    kms: float
    rendimiento: float


class DailyRevenue(BaseModel):
    day: str
    revenue: float
    meta: float


class MechanicStats(BaseModel):
    mechanic_name: str
    ordenes_cerradas: int
    gasto_total: float


class DashboardData(BaseModel):
    serviceStats: ServiceStats
    clientServices: List[ClientServiceCount]
    operatorStats: List[OperatorStats]
    recentServices: List[RecentService]
    revenueTrend: List[MonthlyRevenue]
    tripConfigTrend: List[MonthlyTripConfig]
    fuelTrend: List[MonthlyFuelStat]
    dailyRevenue: List[DailyRevenue]
    mechanicStats: List[MechanicStats]
