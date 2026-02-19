from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    TireStatus,
    TireCondition,
    TireEventType,
    RecordStatus,
)  # ajusta ruta real


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AssignTirePayload(BaseModel):
    """
    Payload para asignar/desasignar una llanta a una unidad.
    Nota: en ORM el campo real es unit_id (FK a units.id)
    """

    unit_id: Optional[int] = Field(default=None, description="FK a units.id")
    posicion: Optional[str] = Field(default=None, max_length=50)
    notas: Optional[str] = ""  # si lo usas para history.descripcion

    model_config = ConfigDict(extra="ignore")


class MaintenanceTirePayload(BaseModel):
    """
    Payload para registrar un evento/mantenimiento en historial.
    """

    tipo: TireEventType
    costo: float = 0.0
    descripcion: str
    km: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)
    posicion: Optional[str] = Field(default=None, max_length=50)
    unit_id: Optional[int] = None


# =========================================================
# TIRE HISTORY (tire_history)
# =========================================================


class TireHistoryBase(ORMBase):
    # fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha: datetime

    # tipo = Column(Enum(TireEventType, name="tire_event_type_enum"), nullable=False)
    tipo: TireEventType

    # descripcion = Column(String(255))  (nullable por default)
    descripcion: Optional[str] = Field(default=None, max_length=255)

    # unidad_id = FK units.id nullable
    unidad_id: Optional[int] = None

    # unidad_economico = Column(String(50), nullable=True)
    unidad_economico: Optional[str] = Field(default=None, max_length=50)

    # posicion = Column(String(50))
    posicion: Optional[str] = Field(default=None, max_length=50)

    # km/costo = Float default 0.0
    km: float = 0.0
    costo: float = 0.0

    # responsable = Column(String(100))
    responsable: Optional[str] = Field(default=None, max_length=100)


class TireHistoryCreate(ORMBase):
    # cuando creas un evento (si lo soportas vía API)
    tipo: TireEventType
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unidad_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[str] = Field(default=None, max_length=50)
    km: float = 0.0
    costo: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)


class TireHistoryResponse(TireHistoryBase):
    id: int
    tire_id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TIRE (tires)
# =========================================================


class TireBase(ORMBase):
    # codigo_interno = Column(String(50), unique=True, nullable=False)
    codigo_interno: str = Field(..., max_length=50)

    # marca = Column(String(50), nullable=False)
    marca: str = Field(..., max_length=50)

    # modelo = Column(String(50))
    modelo: Optional[str] = Field(default=None, max_length=50)

    # medida = Column(String(20))
    medida: Optional[str] = Field(default=None, max_length=20)

    # dot = Column(String(10))
    dot: Optional[str] = Field(default=None, max_length=10)

    # unit_id = FK units.id nullable=True
    unit_id: Optional[int] = None

    # posicion = Column(String(50), nullable=True)
    posicion: Optional[str] = Field(default=None, max_length=50)

    # estado/estado_fisico enums
    estado: TireStatus = TireStatus.NUEVO
    estado_fisico: TireCondition = TireCondition.BUENA

    # profundidades/km
    profundidad_actual: float = 0.0
    profundidad_original: float = 0.0
    km_recorridos: float = 0.0

    # compra
    fecha_compra: Optional[date] = None
    precio_compra: float = 0.0
    costo_acumulado: float = 0.0

    # proveedor = Column(String(100))
    proveedor: Optional[str] = Field(default=None, max_length=100)


class TireCreate(ORMBase):
    # En tu modelo SOLO esto es realmente obligatorio:
    # codigo_interno, marca
    codigo_interno: str = Field(..., max_length=50)
    marca: str = Field(..., max_length=50)

    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)

    unidad_id: Optional[int] = Field(default=None, description="alias UI", exclude=True)
    unit_id: Optional[int] = None
    posicion: Optional[str] = Field(default=None, max_length=50)

    estado: TireStatus = TireStatus.NUEVO
    estado_fisico: TireCondition = TireCondition.BUENA

    profundidad_original: float = 0.0
    profundidad_actual: float = 0.0

    km_recorridos: float = 0.0

    fecha_compra: Optional[date] = None
    precio_compra: float = 0.0
    costo_acumulado: float = 0.0

    proveedor: Optional[str] = Field(default=None, max_length=100)

    model_config = ConfigDict(extra="ignore")

    def model_post_init(self, __context):
        # Si el front manda unidad_id (tu naming previo), lo mapeamos a unit_id sin romper
        if self.unit_id is None and getattr(self, "unidad_id", None) is not None:
            self.unit_id = getattr(self, "unidad_id")


class TireUpdate(ORMBase):
    # parcial
    codigo_interno: Optional[str] = Field(default=None, max_length=50)
    marca: Optional[str] = Field(default=None, max_length=50)
    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)

    unit_id: Optional[int] = None
    posicion: Optional[str] = Field(default=None, max_length=50)

    estado: Optional[TireStatus] = None
    estado_fisico: Optional[TireCondition] = None

    profundidad_actual: Optional[float] = None
    profundidad_original: Optional[float] = None
    km_recorridos: Optional[float] = None

    fecha_compra: Optional[date] = None
    precio_compra: Optional[float] = None
    costo_acumulado: Optional[float] = None

    proveedor: Optional[str] = Field(default=None, max_length=100)


class TireResponse(TireBase):
    id: int

    # alias “UI” (sin inventar columnas)
    unidad_actual_id: Optional[int] = Field(
        default=None, serialization_alias="unidad_actual_id"
    )
    unidad_actual_economico: Optional[str] = Field(default=None)

    history: List[TireHistoryResponse] = Field(
        default_factory=list, serialization_alias="historial"
    )

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    def model_post_init(self, __context):
        # rellena alias UI con base en unit_id
        self.unidad_actual_id = self.unit_id
