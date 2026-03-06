from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.models import RecordStatus  # AuditMixin en FuelLog/FuelDocumentHistory


# =========================================================
# SCHEMAS ANIDADOS con Operadores y Unidades
# =========================================================


class UnitFuelInfo(BaseModel):
    id: int
    numero_economico: str
    placas: str

    model_config = ConfigDict(from_attributes=True)


class OperatorFuelInfo(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# DOCUMENTOS (FuelDocumentHistory)
# =========================================================


class FuelDocumentBase(BaseModel):
    document_type: str = Field(default="ticket", max_length=50)
    filename: str = Field(..., max_length=255)
    file_url: str = Field(..., max_length=500)
    file_size: Optional[int] = None
    mime_type: Optional[str] = Field(default=None, max_length=100)
    version: int = 1
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class FuelDocumentResponse(FuelDocumentBase):
    id: int
    fuel_log_id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# FUEL LOGS
# =========================================================


class FuelLogBase(BaseModel):
    unit_id: int
    operator_id: int

    estacion: str = Field(..., min_length=3, max_length=200)
    tipo_combustible: str  # 'diesel' | 'urea'

    litros: float = Field(..., gt=0)
    precio_por_litro: float = Field(..., gt=0)
    total: float = Field(..., gt=0)
    odometro: int = Field(..., gt=0)

    model_config = ConfigDict(from_attributes=True)

    @field_validator("tipo_combustible")
    @classmethod
    def validate_fuel_type(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("diesel", "urea"):
            raise ValueError("El tipo de combustible debe ser diesel o urea")
        return v


class FuelLogCreate(FuelLogBase):
    """
    En tu ORM FuelLog:
      - fecha_hora tiene server_default=now() (no es obligatorio mandarlo)
      - evidencia_url puede ser None
      - excede_tanque default False
      - capacidad_tanque_snapshot puede ser None
    """

    fecha_hora: Optional[datetime] = None
    excede_tanque: bool = False
    capacidad_tanque_snapshot: Optional[float] = None

    # La evidencia_url se setea en el endpoint tras procesar el archivo
    model_config = ConfigDict(extra="ignore")


class FuelLogUpdate(BaseModel):
    # PATCH
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None

    estacion: Optional[str] = Field(default=None, min_length=3, max_length=200)
    tipo_combustible: Optional[str] = None

    litros: Optional[float] = Field(default=None, gt=0)
    precio_por_litro: Optional[float] = Field(default=None, gt=0)
    total: Optional[float] = Field(default=None, gt=0)
    odometro: Optional[int] = Field(default=None, gt=0)

    fecha_hora: Optional[datetime] = None
    evidencia_url: Optional[str] = Field(default=None, max_length=500)
    excede_tanque: Optional[bool] = None
    capacidad_tanque_snapshot: Optional[float] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    @field_validator("tipo_combustible")
    @classmethod
    def validate_fuel_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.lower().strip()
        if v not in ("diesel", "urea"):
            raise ValueError("El tipo de combustible debe ser diesel o urea")
        return v


class FuelLogResponse(FuelLogBase):
    id: int
    fecha_hora: datetime

    evidencia_url: Optional[str] = None
    excede_tanque: bool
    capacidad_tanque_snapshot: Optional[float] = None

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # Relaciones (opcional: para tabla sin queries extra)
    unit: Optional[UnitFuelInfo] = Field(default=None, exclude=True)
    operator: Optional[OperatorFuelInfo] = Field(default=None, exclude=True)

    # Historial de documentos (relación FuelDocumentHistory)
    document_history: List[FuelDocumentResponse] = Field(default_factory=list)

    # --- MAPEOS PARA EL FRONTEND (Mismo nombre que en AddTicketModal) ---
    @computed_field
    @property
    def precioPorLitro(self) -> float:
        return self.precio_por_litro

    @computed_field
    @property
    def unidadNumero(self) -> str:
        return self.unit.numero_economico if self.unit else "N/A"

    @computed_field
    @property
    def operadorNombre(self) -> str:
        return self.operator.name if self.operator else "N/A"

    model_config = ConfigDict(from_attributes=True)
