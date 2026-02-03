from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import Enum


class TripStatusEnum(str, Enum):
    CREADO = "creado"
    EN_TRANSITO = "en_transito"
    DETENIDO = "detenido"
    RETRASO = "retraso"
    ENTREGADO = "entregado"
    CERRADO = "cerrado"
    ACCIDENTE = "accidente"


class TripTimelineEventBase(BaseModel):
    time: datetime
    event: str
    event_type: str = "info"


class TripTimelineEventResponse(TripTimelineEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trip_id: str


class TripBase(BaseModel):
    origin: str
    destination: str
    route_name: Optional[str] = None
    status: TripStatusEnum = TripStatusEnum.CREADO
    tarifa_base: float = Field(..., gt=0)
    costo_casetas: float = 0
    anticipo_casetas: float = 0
    anticipo_viaticos: float = 0
    anticipo_combustible: float = 0
    otros_anticipos: float = 0
    start_date: datetime
    estimated_arrival: Optional[datetime] = None


class TripCreate(TripBase):
    id: str
    client_id: str
    sub_client_id: str
    unit_id: str
    operator_id: str
    tariff_id: Optional[str] = None


class TripUpdate(BaseModel):
    status: Optional[TripStatusEnum] = None
    last_location: Optional[str] = None
    actual_arrival: Optional[datetime] = None
    # Otros campos editables


class TripResponse(TripBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    client_id: str
    sub_client_id: str
    unit_id: str
    operator_id: str
    tariff_id: Optional[str] = None
    saldo_operador: float
    last_update: Optional[datetime] = None
    last_location: Optional[str] = None
    actual_arrival: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Nested Info (para que el frontend no tenga que hacer N requests)
    # Nota: Requiere que en el CRUD uses joinedload
    timeline_events: List[TripTimelineEventResponse] = []
