"""
Pydantic Schemas for TMS API
Validation and serialization - mirrors TypeScript interfaces
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# ============= ENUMS =============


class UnitTypeEnum(str, Enum):
    SENCILLO = "sencillo"
    FULL = "full"
    RABON = "rabon"


class CurrencyEnum(str, Enum):
    MXN = "MXN"
    USD = "USD"


class UnitStatusEnum(str, Enum):
    DISPONIBLE = "disponible"
    EN_RUTA = "en_ruta"
    MANTENIMIENTO = "mantenimiento"
    BLOQUEADO = "bloqueado"


class OperatorStatusEnum(str, Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    VACACIONES = "vacaciones"
    INCAPACIDAD = "incapacidad"


class TripStatusEnum(str, Enum):
    CREADO = "creado"
    EN_TRANSITO = "en_transito"
    DETENIDO = "detenido"
    RETRASO = "retraso"
    ENTREGADO = "entregado"
    CERRADO = "cerrado"
    ACCIDENTE = "accidente"


class ClientStatusEnum(str, Enum):
    ACTIVO = "activo"
    PENDIENTE = "pendiente"
    INCOMPLETO = "incompleto"


class TariffStatusEnum(str, Enum):
    ACTIVA = "activa"
    VENCIDA = "vencida"
    POR_VENCER = "por_vencer"


# ============= TARIFF SCHEMAS =============


class TariffBase(BaseModel):
    nombre_ruta: str = Field(..., min_length=1, max_length=200)
    tipo_unidad: UnitTypeEnum
    tarifa_base: float = Field(..., gt=0)
    costo_casetas: float = Field(default=0, ge=0)
    moneda: CurrencyEnum = CurrencyEnum.MXN
    vigencia: date
    estatus: TariffStatusEnum = TariffStatusEnum.ACTIVA


class TariffCreate(TariffBase):
    id: str
    sub_client_id: str


class TariffResponse(TariffBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sub_client_id: str
    created_at: Optional[datetime] = None


# ============= SUB_CLIENT SCHEMAS =============


class SubClientBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    alias: Optional[str] = None
    direccion: str
    ciudad: str
    estado: str
    codigo_postal: Optional[str] = None
    tipo_operacion: str = "nacional"
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    horario_recepcion: Optional[str] = None
    estatus: str = "activo"
    dias_credito: Optional[int] = None
    requiere_contrato: bool = False
    convenio_especial: bool = False


class SubClientCreate(SubClientBase):
    id: str
    client_id: str
    tariffs: Optional[List[TariffCreate]] = []


class SubClientResponse(SubClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    tariffs: List[TariffResponse] = []
    created_at: Optional[datetime] = None


# ============= CLIENT SCHEMAS =============


class ClientBase(BaseModel):
    razon_social: str = Field(..., min_length=1, max_length=200)
    rfc: str = Field(..., min_length=12, max_length=13)
    regimen_fiscal: Optional[str] = None
    uso_cfdi: Optional[str] = None
    contacto_principal: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion_fiscal: Optional[str] = None
    codigo_postal_fiscal: Optional[str] = None
    estatus: ClientStatusEnum = ClientStatusEnum.PENDIENTE
    dias_credito: int = 0


class ClientCreate(ClientBase):
    id: str
    sub_clients: Optional[List[SubClientCreate]] = []


class ClientResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sub_clients: List[SubClientResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ClientListResponse(ClientBase):
    """Versión ligera para listados sin subclientes anidados"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    sub_clients_count: int = 0
    created_at: Optional[datetime] = None


# ============= UNIT SCHEMAS =============


class UnitBase(BaseModel):
    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(..., min_length=1, max_length=15)
    vin: Optional[str] = None
    marca: str
    modelo: str
    year: Optional[int] = None
    tipo: UnitTypeEnum
    status: UnitStatusEnum = UnitStatusEnum.DISPONIBLE
    documentos_vencidos: int = 0
    llantas_criticas: int = 0
    seguro_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None


class UnitCreate(UnitBase):
    id: str


class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UnitAvailableResponse(BaseModel):
    """Respuesta para unidades disponibles en despacho"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    numero_economico: str
    marca: str
    modelo: str
    tipo: UnitTypeEnum
    status: UnitStatusEnum
    documentos_vencidos: int
    is_blocked: bool = False
    block_reason: Optional[str] = None


# ============= OPERATOR SCHEMAS =============


class OperatorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    license_number: str = Field(..., min_length=1, max_length=50)
    license_type: str = "E"
    license_expiry: date
    medical_check_expiry: date
    phone: Optional[str] = None
    status: OperatorStatusEnum = OperatorStatusEnum.ACTIVO
    assigned_unit_id: Optional[str] = None
    hire_date: Optional[date] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class OperatorCreate(OperatorBase):
    id: str


class OperatorResponse(OperatorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime] = None
    # Campos calculados para el frontend
    license_status: Optional[str] = None
    medical_status: Optional[str] = None
    days_until_license_expiry: Optional[int] = None
    days_until_medical_expiry: Optional[int] = None


# ============= TRIP SCHEMAS =============


class TripTimelineEventBase(BaseModel):
    time: datetime
    event: str
    event_type: str = "info"  # checkpoint, alert, info


class TripTimelineEventCreate(TripTimelineEventBase):
    trip_id: str


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

    # Nested info for display
    client_name: Optional[str] = None
    unit_number: Optional[str] = None
    operator_name: Optional[str] = None
    timeline_events: List[TripTimelineEventResponse] = []


class TripListResponse(BaseModel):
    """Versión para listados del Centro de Monitoreo"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    client_name: str
    unit_number: str
    operator_name: str
    origin: str
    destination: str
    status: TripStatusEnum
    last_update: Optional[datetime]
    tarifa_base: float


class ProviderCreate(BaseModel):
    id: str
    razon_social: str
    rfc: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    dias_credito: int = 0


class ProviderResponse(ProviderCreate):
    model_config = ConfigDict(from_attributes=True)
    created_at: datetime
