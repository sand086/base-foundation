from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field
from app.models.models import RecordStatus, TripStatus, TripLegType
from app.schemas.clients import ClientResponse
from app.schemas.units import UnitResponse
from app.schemas.operators import OperatorResponse


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# TIMELINE (Apunta a TripLeg)
# =========================================================


class TripTimelineEventBase(ORMBase):
    time: datetime
    event: str = Field(..., max_length=500)
    event_type: str = Field(default="info", max_length=20)


class TripTimelineEventCreate(TripTimelineEventBase):
    model_config = ConfigDict(extra="ignore")


class TripTimelineEventCreatePayload(BaseModel):
    status: str
    location: str
    comments: Optional[str] = ""
    lat: Optional[str] = None
    lng: Optional[str] = None
    notifyClient: Optional[bool] = False


class TripTimelineEventResponse(TripTimelineEventBase):
    id: int
    trip_leg_id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TRIP LEGS (Tramos)
# =========================================================


class TripLegBase(ORMBase):
    leg_type: TripLegType
    status: TripStatus = TripStatus.CREADO

    unit_id: Optional[int] = None
    operator_id: Optional[int] = None

    anticipo_casetas: float = 0.0
    anticipo_viaticos: float = 0.0
    anticipo_combustible: float = 0.0
    otros_anticipos: float = 0.0
    saldo_operador: float = 0.0

    odometro_inicial: Optional[int] = 0
    nivel_tanque_inicial: Optional[float] = 100.0

    start_date: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    last_location: Optional[str] = Field(default=None, max_length=200)


class TripLegCreate(TripLegBase):
    """Schema para crear un tramo, generalmente desde la creación del Viaje o después."""

    pass


class TripLegResponse(TripLegBase):
    id: int
    trip_id: int
    last_update: datetime | None = None

    unit: Optional[UnitResponse] = None
    operator: Optional[OperatorResponse] = None

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


# =========================================================
# TRIPS PADRE
# =========================================================


class TripBase(ORMBase):
    client_id: int
    sub_client_id: int
    tariff_id: Optional[int] = None

    remolque_1_id: Optional[int] = None
    dolly_id: Optional[int] = None
    remolque_2_id: Optional[int] = None

    origin: str = Field(..., max_length=200)
    destination: str = Field(..., max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)
    descripcion_mercancia: Optional[str] = Field(
        default="Carga General", max_length=255
    )
    peso_toneladas: Optional[float] = 0.0
    es_material_peligroso: Optional[bool] = False
    clase_imo: Optional[str] = Field(default=None, max_length=50)
    status: TripStatus = TripStatus.CREADO

    tarifa_base: float
    costo_casetas: float = 0.0

    start_date: datetime
    closed_at: Optional[datetime] = None


class TripCreate(TripBase):
    """
    Cuando se crea un viaje, obligatoriamente se debe crear su primer tramo (Fase 1).
    El Frontend enviará 'initial_leg' con el camión y chofer asignados.
    """

    initial_leg: TripLegCreate

    model_config = ConfigDict(extra="ignore")


class TripResponse(TripBase):
    id: int
    public_id: Optional[str] = None

    client: Optional[ClientResponse] = None
    remolque_1: Optional[UnitResponse] = None
    dolly: Optional[UnitResponse] = None
    remolque_2: Optional[UnitResponse] = None

    # El Viaje ahora incluye su lista de tramos
    legs: List[TripLegResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime


class TripTimelineEventUpdate(ORMBase):
    time: Optional[datetime] = None
    event: Optional[str] = Field(default=None, max_length=500)
    event_type: Optional[str] = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="ignore")


class TripUpdate(ORMBase):
    # Relaciones del viaje general
    client_id: Optional[int] = None
    sub_client_id: Optional[int] = None
    tariff_id: Optional[int] = None

    remolque_1_id: Optional[int] = None
    dolly_id: Optional[int] = None
    remolque_2_id: Optional[int] = None

    # Datos Generales
    origin: Optional[str] = Field(default=None, max_length=200)
    destination: Optional[str] = Field(default=None, max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)
    descripcion_mercancia: Optional[str] = Field(default=None, max_length=255)
    peso_toneladas: Optional[float] = None
    es_material_peligroso: Optional[bool] = None
    clase_imo: Optional[str] = Field(default=None, max_length=50)
    status: Optional[TripStatus] = None

    tarifa_base: Optional[float] = None
    costo_casetas: Optional[float] = None

    start_date: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Mantenemos estos campos por compatibilidad temporal con tu endpoint
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None
    anticipo_casetas: Optional[float] = None
    anticipo_viaticos: Optional[float] = None
    anticipo_combustible: Optional[float] = None
    otros_anticipos: Optional[float] = None
    saldo_operador: Optional[float] = None
    last_location: Optional[str] = None
    timeline_events: Optional[List[TripTimelineEventUpdate]] = None

    model_config = ConfigDict(extra="ignore")


# =========================================================
# LIQUIDACIONES (Settlement)
# =========================================================


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
    legId: int  # Ahora la liquidación se amarra al TRAMO (TripLeg)
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
