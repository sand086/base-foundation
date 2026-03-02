from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.models import RecordStatus, TollUnitType


# =========================================================
# Base helper
# =========================================================


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# CASETAS (toll_booths)
# Model: TollBooth(AuditMixin, Base)
# =========================================================


class TollBoothBase(ORMBase):
    nombre: str = Field(..., max_length=100)
    tramo: str = Field(..., max_length=255)

    carretera: Optional[str] = Field(default=None, max_length=100)
    estado: Optional[str] = Field(default=None, max_length=50)

    costo_5_ejes_sencillo: float = 0.0
    costo_5_ejes_full: float = 0.0
    costo_9_ejes_sencillo: float = 0.0
    costo_9_ejes_full: float = 0.0

    # Model: forma_pago = Column(String(20), default="AMBOS")
    forma_pago: str = Field(default="AMBOS", max_length=20)

    @field_validator("forma_pago")
    @classmethod
    def validate_forma_pago(cls, v: str) -> str:
        # Comentario: en modelo es String. Si quieres permitir solo valores específicos, valida aquí.
        vv = (v or "").strip().upper()
        if vv not in {"AMBOS", "TAG", "EFECTIVO"}:
            # Si en tu negocio solo existen estos 3, esto ayuda a evitar basura.
            # Si tienes otros, agrégalos.
            raise ValueError("forma_pago debe ser AMBOS, TAG o EFECTIVO")
        return vv


class TollBoothCreate(TollBoothBase):
    model_config = ConfigDict(extra="ignore")


class TollBoothUpdate(ORMBase):
    nombre: Optional[str] = Field(default=None, max_length=100)
    tramo: Optional[str] = Field(default=None, max_length=255)

    carretera: Optional[str] = Field(default=None, max_length=100)
    estado: Optional[str] = Field(default=None, max_length=50)

    costo_5_ejes_sencillo: Optional[float] = None
    costo_5_ejes_full: Optional[float] = None
    costo_9_ejes_sencillo: Optional[float] = None
    costo_9_ejes_full: Optional[float] = None

    forma_pago: Optional[str] = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="ignore")


class TollBoothResponse(TollBoothBase):
    id: int

    # AuditMixin (según tu modelo)
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# SEGMENTOS DE RUTA (rate_template_segments)
# Model: RateSegment(Base)  <-- NO AuditMixin
# =========================================================


class RateSegmentBase(ORMBase):
    rate_template_id: Optional[int] = None  # útil en create/update si lo manejas así

    nombre_segmento: str = Field(..., max_length=255)
    estado: Optional[str] = Field(default=None, max_length=50)
    carretera: Optional[str] = Field(default=None, max_length=100)

    distancia_km: float = 0.0
    tiempo_minutos: int = 0

    toll_booth_id: Optional[int] = None
    orden: int

    costo_momento_sencillo: float = 0.0
    costo_momento_full: float = 0.0


class RateSegmentCreate(RateSegmentBase):
    model_config = ConfigDict(extra="ignore")


class RateSegmentUpdate(ORMBase):
    nombre_segmento: Optional[str] = Field(default=None, max_length=255)
    estado: Optional[str] = Field(default=None, max_length=50)
    carretera: Optional[str] = Field(default=None, max_length=100)

    distancia_km: Optional[float] = None
    tiempo_minutos: Optional[int] = None

    toll_booth_id: Optional[int] = None
    orden: Optional[int] = None

    costo_momento_sencillo: Optional[float] = None
    costo_momento_full: Optional[float] = None

    model_config = ConfigDict(extra="ignore")


class RateSegmentResponse(RateSegmentBase):
    id: int

    # Helpers UI (NO existen como columnas, se llenan en tu service si quieres)
    toll_nombre: Optional[str] = None


# =========================================================
# PLANTILLAS DE RUTA (rate_templates)
# Model: RateTemplate(AuditMixin, Base)
# =========================================================


class RateTemplateBase(ORMBase):
    client_id: int | None = Field(default=None)

    origen: str | None = Field(default=None, max_length=150)
    destino: str | None = Field(default=None, max_length=150)
    # IMPORTANTÍSIMO:
    # En tu MODELO actual RateTemplate.tipo_unidad es Column(String(20), nullable=False)
    # (en algún punto lo cambiaste a TollUnitType, pero en el models pegado aquí es string).
    #
    # Para que NO truene aunque aún sea string en BD, lo dejamos como TollUnitType PERO
    # aceptamos string y lo normalizamos a TollUnitType.

    tipo_unidad: TollUnitType

    costo_total_sencillo: float = 0.0
    costo_total_full: float = 0.0
    distancia_total_km: float = 0.0
    tiempo_total_minutos: int = 0

    @field_validator("tipo_unidad", mode="before")
    @classmethod
    def normalize_tipo_unidad(cls, v):
        """
        Permite recibir:
        - '5ejes' / '9ejes' (string)
        - TollUnitType.EJES_5 / EJES_9
        """
        if isinstance(v, TollUnitType):
            return v
        if v is None:
            raise ValueError("tipo_unidad es requerido")

        s = str(v).strip().lower()
        if s in {"5ejes", "ejes_5", "5"}:
            return TollUnitType.EJES_5
        if s in {"9ejes", "ejes_9", "9"}:
            return TollUnitType.EJES_9

        raise ValueError("tipo_unidad debe ser '5ejes' o '9ejes'")


class RateTemplateCreate(RateTemplateBase):
    segments: List[RateSegmentCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class RateTemplateUpdate(ORMBase):
    origen: Optional[str] = Field(default=None, max_length=150)
    destino: Optional[str] = Field(default=None, max_length=150)
    tipo_unidad: Optional[TollUnitType] = None

    costo_total_sencillo: Optional[float] = None
    costo_total_full: Optional[float] = None
    distancia_total_km: Optional[float] = None
    tiempo_total_minutos: Optional[int] = None

    # si quieres permitir update nested:
    segments: Optional[List[RateSegmentUpdate]] = None

    model_config = ConfigDict(extra="ignore")


class RateTemplateResponse(RateTemplateBase):
    id: int
    segments: List[RateSegmentResponse] = Field(default_factory=list)

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
