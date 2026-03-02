from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.models import RecordStatus, TripStatus


from app.schemas.clients import ClientResponse
from app.schemas.units import UnitResponse
from app.schemas.operators import OperatorResponse


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


class TripTimelineEventCreatePayload(BaseModel):
    status: str
    location: str
    comments: Optional[str] = ""
    lat: Optional[str] = None
    lng: Optional[str] = None
    notifyClient: Optional[bool] = False


class TripTimelineEventUpdate(ORMBase):
    time: Optional[datetime] = None
    event: Optional[str] = Field(default=None, max_length=500)
    event_type: Optional[str] = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="ignore")


class TripTimelineEventResponse(TripTimelineEventBase):
    id: int
    trip_id: int

    # AuditMixin (Cambiamos datetime por Optional[datetime])
    record_status: RecordStatus
    created_at: Optional[datetime] = None  # ✅ Ahora permite nulos
    updated_at: Optional[datetime] = None  # ✅ Ahora permite nulos
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TRIPS
# =========================================================


class TripBase(ORMBase):
    client_id: int
    sub_client_id: int
    unit_id: int
    operator_id: int
    remolque_1_id: Optional[int] = None
    dolly_id: Optional[int] = None
    remolque_2_id: Optional[int] = None

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
    actual_arrival: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    last_location: Optional[str] = Field(default=None, max_length=200)


class TripCreate(ORMBase):
    client_id: int
    sub_client_id: int
    unit_id: int
    operator_id: int

    remolque_1_id: Optional[int] = None
    dolly_id: Optional[int] = None
    remolque_2_id: Optional[int] = None

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
    last_update: datetime | None = None

    client: Optional[ClientResponse] = None
    unit: Optional[UnitResponse] = None
    operator: Optional[OperatorResponse] = None

    remolque_1_id: Optional[UnitResponse] = None
    dolly: Optional[UnitResponse] = None
    remolque_2_id: Optional[UnitResponse] = None

    timeline_events: List[TripTimelineEventResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime

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
        return (self.tarifa_base or 0.0) - (self.total_anticipos or 0.0)


class ConceptoPago(BaseModel):
    id: str
    tipo: str  # "ingreso" o "deduccion"
    categoria: str  # "tarifa", "bono", "anticipo", "combustible"
    descripcion: str
    monto: float
    referencia: Optional[str] = None
    esAutomatico: bool = True


class TripSettlementResponse(BaseModel):
    viajeId: str
    operadorNombre: str
    unidadNumero: str
    ruta: str
    fechaViaje: str
    kmsRecorridos: float
    estatus: str

    conceptos: List[ConceptoPago]
    totalIngresos: float
    totalDeducciones: float
    netoAPagar: float

    consumoEsperadoLitros: float
    consumoRealLitros: float
    diferenciaLitros: float
    precioPorLitro: float
    deduccionCombustible: float


class CloseSettlementPayload(BaseModel):
    conceptos: List[ConceptoPago]
    totalIngresos: float
    totalDeducciones: float
    netoAPagar: float
