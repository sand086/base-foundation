from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    RecordStatus,
    TireCondition,
    TireEventType,
    TireStatus,
)


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# PAYLOADS (acciones)
# =========================================================


class AssignTirePayload(BaseModel):
    """
    Payload para asignar/desasignar una llanta a una unidad.
    En ORM el campo real es unit_id (FK a units.id)
    """

    unit_id: Optional[int] = Field(default=None, description="FK a units.id")
    posicion: Optional[int] = None
    notas: Optional[str] = Field(default=None, max_length=255)

    model_config = ConfigDict(extra="ignore")


class MaintenanceTirePayload(BaseModel):
    """
    Payload para registrar un evento/mantenimiento en historial.
    """

    tipo: TireEventType
    costo: float = 0.0
    descripcion: Optional[str] = Field(default=None, max_length=255)
    km: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)
    posicion: Optional[str] = Field(default=None, max_length=50)
    unit_id: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


# =========================================================
# TIRE HISTORY (tire_history)
# =========================================================


class TireHistoryBase(ORMBase):
    # fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha: datetime

    # tipo = Column(pg_enum(TireEventType, "tireeventtype"), nullable=False)
    tipo: TireEventType

    # descripcion = Column(String(255))
    descripcion: Optional[str] = Field(default=None, max_length=255)

    unit_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[int] = None

    km: float = 0.0
    costo: float = 0.0

    responsable: Optional[str] = Field(default=None, max_length=100)


class TireHistoryCreate(ORMBase):
    tipo: TireEventType
    descripcion: Optional[str] = Field(default=None, max_length=255)

    unit_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[str] = Field(default=None, max_length=50)

    km: float = 0.0
    costo: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)

    model_config = ConfigDict(extra="ignore")


class TireHistoryUpdate(ORMBase):
    tipo: Optional[TireEventType] = None
    descripcion: Optional[str] = Field(default=None, max_length=255)

    unit_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[str] = Field(default=None, max_length=50)

    km: Optional[float] = None
    costo: Optional[float] = None
    responsable: Optional[str] = Field(default=None, max_length=100)

    model_config = ConfigDict(extra="ignore")


class TireHistoryResponse(TireHistoryBase):
    id: int
    tire_id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TIRE (tires)
# =========================================================


class TireBase(ORMBase):
    codigo_interno: str = Field(..., max_length=50)
    marca: str = Field(..., max_length=50)

    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)

    unit_id: Optional[int] = None
    posicion: Optional[int] = None

    estado: TireStatus = TireStatus.NUEVO
    estado_fisico: TireCondition = TireCondition.BUENA

    profundidad_actual: float = 0.0
    profundidad_original: float = 0.0
    km_recorridos: float = 0.0

    fecha_compra: Optional[date] = None
    precio_compra: float = 0.0
    costo_acumulado: float = 0.0

    proveedor: Optional[str] = Field(default=None, max_length=100)


class TireCreate(ORMBase):
    # En ORM: obligatorios -> codigo_interno, marca
    codigo_interno: str = Field(..., max_length=50)
    marca: str = Field(..., max_length=50)

    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)

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


class TireUpdate(ORMBase):
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

    model_config = ConfigDict(extra="ignore")


class TireResponse(TireBase):
    id: int

    # Relación ORM: Tire.history (en tu modelo se llama history)
    history: List[TireHistoryResponse] = Field(default_factory=list)

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
