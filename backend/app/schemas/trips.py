from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.models import RecordStatus, TripStatus


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# TIMELINE (TripTimelineEvent)
# =========================================================


class TripTimelineEventBase(ORMBase):
    time: datetime
    event: str = Field(..., max_length=500)
    event_type: str = Field(default="info", max_length=20)


class TripTimelineEventCreate(TripTimelineEventBase):
    """Para crear eventos en el timeline (nested o endpoint dedicado)."""

    model_config = ConfigDict(extra="ignore")


class TripTimelineEventUpdate(ORMBase):
    time: Optional[datetime] = None
    event: Optional[str] = Field(default=None, max_length=500)
    event_type: Optional[str] = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="ignore")


class TripTimelineEventResponse(TripTimelineEventBase):
    id: int
    trip_id: int

    # AuditMixin (alineado a models / BD)
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TRIPS
# =========================================================


class TripBase(ORMBase):
    # Relaciones obligatorias según tu ORM
    client_id: int
    sub_client_id: int
    unit_id: int
    operator_id: int
    tariff_id: Optional[int] = None

    origin: str = Field(..., max_length=200)
    destination: str = Field(..., max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)

    # Enum alineado a BD: tripstatus
    status: TripStatus = TripStatus.CREADO

    # Costos / anticipos
    tarifa_base: float
    costo_casetas: float = 0.0
    anticipo_casetas: float = 0.0
    anticipo_viaticos: float = 0.0
    anticipo_combustible: float = 0.0
    otros_anticipos: float = 0.0
    saldo_operador: float = 0.0

    # Fechas (start_date es requerido en tu ORM)
    start_date: datetime
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Tracking (en BD last_update tiene server_default)
    last_location: Optional[str] = Field(default=None, max_length=200)


class TripCreate(ORMBase):
    client_id: int
    sub_client_id: int
    unit_id: int
    operator_id: int
    tariff_id: Optional[int] = None

    origin: str = Field(..., max_length=200)
    destination: str = Field(..., max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)

    status: TripStatus = TripStatus.CREADO

    tarifa_base: float
    costo_casetas: float = 0.0
    anticipo_casetas: float = 0.0
    anticipo_viaticos: float = 0.0
    anticipo_combustible: float = 0.0
    otros_anticipos: float = 0.0
    saldo_operador: float = 0.0

    start_date: datetime
    estimated_arrival: Optional[datetime] = None

    last_location: Optional[str] = Field(default=None, max_length=200)

    # Si quieres permitir crear timeline nested (opcional)
    timeline_events: List[TripTimelineEventCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class TripUpdate(ORMBase):
    # Relaciones (normalmente no se cambian, pero lo dejo por flexibilidad)
    client_id: Optional[int] = None
    sub_client_id: Optional[int] = None
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None
    tariff_id: Optional[int] = None

    origin: Optional[str] = Field(default=None, max_length=200)
    destination: Optional[str] = Field(default=None, max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)

    status: Optional[TripStatus] = None

    tarifa_base: Optional[float] = None
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

    last_location: Optional[str] = Field(default=None, max_length=200)

    # Si quieres permitir update nested (opcional)
    timeline_events: Optional[List[TripTimelineEventUpdate]] = None

    model_config = ConfigDict(extra="ignore")


class TripResponse(TripBase):
    id: int
    public_id: Optional[str] = None

    # Campos extra del ORM
    last_update: datetime

    timeline_events: List[TripTimelineEventResponse] = Field(default_factory=list)

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    @computed_field
    @property
    def total_anticipos(self) -> float:
        return (
            (self.anticipo_casetas or 0.0)
            + (self.anticipo_viaticos or 0.0)
            + (self.anticipo_combustible or 0.0)
            + (self.otros_anticipos or 0.0)
        )

    @computed_field
    @property
    def saldo_estimado(self) -> float:
        # Por si quieres un indicador rápido (ajústalo a tu lógica real si difiere)
        return (self.tarifa_base or 0.0) - (self.total_anticipos or 0.0)
