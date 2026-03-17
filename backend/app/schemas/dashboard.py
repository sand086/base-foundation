from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class ServiceStats(BaseModel):
    totalServices: int
    onTimeCount: int
    lateCount: int
    estimatedRevenue: float
    onTimePercentage: float


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


class DashboardData(BaseModel):
    serviceStats: ServiceStats
    clientServices: List[ClientServiceCount]
    operatorStats: List[OperatorStats]
    recentServices: List[RecentService]
