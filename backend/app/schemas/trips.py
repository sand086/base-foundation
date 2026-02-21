from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import TripStatus, RecordStatus  # ajusta ruta real


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# TRIP TIMELINE EVENTS
# =========================================================


class TripTimelineEventBase(ORMBase):
    # time = Column(DateTime(timezone=True), nullable=False)
    time: datetime

    # event = Column(String(500), nullable=False)
    event: str = Field(..., max_length=500)

    # event_type = Column(String(20), default="info")
    event_type: str = Field(default="info", max_length=20)


class TripTimelineEventCreate(TripTimelineEventBase):
    # trip_id viene por path normalmente, pero lo dejo opcional por si lo mandas
    trip_id: Optional[int] = None


class TripTimelineEventUpdate(ORMBase):
    time: Optional[datetime] = None
    event: Optional[str] = Field(default=None, max_length=500)
    event_type: Optional[str] = Field(default=None, max_length=20)


class TripTimelineEventResponse(TripTimelineEventBase):
    id: int
    trip_id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TRIPS
# =========================================================


class TripBase(ORMBase):
    # origin/destination/route_name
    origin: str = Field(..., max_length=200)
    destination: str = Field(..., max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)

    # status = Enum(TripStatus, name="tripstatus")
    status: TripStatus = TripStatus.CREADO

    # costos
    tarifa_base: float = Field(..., gt=0)
    costo_casetas: float = 0.0
    anticipo_casetas: float = 0.0
    anticipo_viaticos: float = 0.0
    anticipo_combustible: float = 0.0
    otros_anticipos: float = 0.0
    saldo_operador: float = 0.0

    # fechas
    start_date: datetime
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # tracking
    last_update: Optional[datetime] = None
    last_location: Optional[str] = Field(default=None, max_length=200)


class TripCreate(ORMBase):
    # public_id existe pero es opcional
    public_id: Optional[str] = Field(default=None, max_length=50)

    client_id: int
    sub_client_id: int
    unit_id: int
    operator_id: int
    tariff_id: Optional[int] = None

    origin: str = Field(..., max_length=200)
    destination: str = Field(..., max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)

    status: TripStatus = TripStatus.CREADO

    tarifa_base: float = Field(..., gt=0)
    costo_casetas: float = 0.0
    anticipo_casetas: float = 0.0
    anticipo_viaticos: float = 0.0
    anticipo_combustible: float = 0.0
    otros_anticipos: float = 0.0
    saldo_operador: float = 0.0

    start_date: datetime
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    last_location: Optional[str] = Field(default=None, max_length=200)


class TripUpdate(ORMBase):
    # Parcial (exclude_unset=True en service)

    public_id: Optional[str] = Field(default=None, max_length=50)

    client_id: Optional[int] = None
    sub_client_id: Optional[int] = None
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None
    tariff_id: Optional[int] = None

    origin: Optional[str] = Field(default=None, max_length=200)
    destination: Optional[str] = Field(default=None, max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)

    status: Optional[TripStatus] = None

    tarifa_base: Optional[float] = Field(default=None, gt=0)
    costo_casetas: Optional[float] = None
    anticipo_casetas: Optional[float] = None
    anticipo_viaticos: Optional[float] = None
    anticipo_combustible: Optional[float] = None
    otros_anticipos: Optional[float] = None
    saldo_operador: Optional[float] = None

    start_date: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    last_update: Optional[datetime] = None
    last_location: Optional[str] = Field(default=None, max_length=200)


class TripResponse(TripBase):
    id: int
    public_id: Optional[str] = None

    client_id: int
    sub_client_id: int
    unit_id: int
    operator_id: int
    tariff_id: Optional[int] = None

    timeline_events: List[TripTimelineEventResponse] = []

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
