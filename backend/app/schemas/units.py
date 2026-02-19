from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import UnitStatus, RecordStatus  # ajusta ruta real


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# UNITS
# =========================================================


class UnitBase(ORMBase):
    # public_id = Column(String(50), unique=True, nullable=False, index=True)
    public_id: str = Field(..., max_length=50)

    # numero_economico = Column(String(20), unique=True, nullable=False)
    numero_economico: str = Field(..., min_length=1, max_length=20)

    # placas = Column(String(15), unique=True, nullable=False)
    placas: str = Field(..., min_length=1, max_length=15)

    # vin = Column(String(17))
    vin: Optional[str] = Field(default=None, max_length=17)

    # marca/modelo
    marca: str = Field(..., max_length=50)
    modelo: str = Field(..., max_length=50)
    year: Optional[int] = None

    # tipo = Column(String(50), nullable=True)  (NO enum)
    tipo: Optional[str] = Field(default=None, max_length=50)

    # campos técnicos
    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    # status = Enum(UnitStatus, name="unitstatus")
    status: UnitStatus = UnitStatus.DISPONIBLE

    # razon_bloqueo = Column(String(255), nullable=True)
    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)

    # ignore_blocking = Column(Boolean, nullable=False, server_default="false")
    ignore_blocking: bool = False

    # documentos_vencidos = Column(Integer, nullable=False, server_default="0")
    documentos_vencidos: int = 0

    # llantas_criticas = Column(Integer, default=0)
    llantas_criticas: int = 0

    # seguros/verificaciones
    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None

    # folios/CAAT
    permiso_sct_folio: Optional[str] = Field(default=None, max_length=50)
    caat_folio: Optional[str] = Field(default=None, max_length=50)
    caat_vence: Optional[date] = None

    # urls docs
    tarjeta_circulacion_url: Optional[str] = Field(default=None, max_length=500)
    permiso_doble_articulado_url: Optional[str] = Field(default=None, max_length=500)
    poliza_seguro_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_humo_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_fisico_mecanica_url: Optional[str] = Field(
        default=None, max_length=500
    )

    permiso_sct_url: Optional[str] = Field(default=None, max_length=500)
    caat_url: Optional[str] = Field(default=None, max_length=500)
    tarjeta_circulacion_folio: Optional[str] = Field(default=None, max_length=50)


class UnitCreate(UnitBase):
    """
    Si TU backend genera public_id automáticamente, cambia public_id a Optional[str] en UnitBase
    y aquí no lo pidas. Pero con tu modelo (nullable=False) debe existir al crear.
    """

    pass


class UnitUpdate(ORMBase):
    # Parcial (PATCH). En tu service usa exclude_unset=True

    public_id: Optional[str] = Field(default=None, max_length=50)

    numero_economico: Optional[str] = Field(default=None, min_length=1, max_length=20)
    placas: Optional[str] = Field(default=None, min_length=1, max_length=15)
    vin: Optional[str] = Field(default=None, max_length=17)

    marca: Optional[str] = Field(default=None, max_length=50)
    modelo: Optional[str] = Field(default=None, max_length=50)
    year: Optional[int] = None

    tipo: Optional[str] = Field(default=None, max_length=50)

    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    status: Optional[UnitStatus] = None
    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)

    ignore_blocking: Optional[bool] = None
    documentos_vencidos: Optional[int] = None
    llantas_criticas: Optional[int] = None

    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None

    permiso_sct_folio: Optional[str] = Field(default=None, max_length=50)
    caat_folio: Optional[str] = Field(default=None, max_length=50)
    caat_vence: Optional[date] = None

    tarjeta_circulacion_url: Optional[str] = Field(default=None, max_length=500)
    permiso_doble_articulado_url: Optional[str] = Field(default=None, max_length=500)
    poliza_seguro_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_humo_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_fisico_mecanica_url: Optional[str] = Field(
        default=None, max_length=500
    )

    permiso_sct_url: Optional[str] = Field(default=None, max_length=500)
    caat_url: Optional[str] = Field(default=None, max_length=500)
    tarjeta_circulacion_folio: Optional[str] = Field(default=None, max_length=50)


class UnitResponse(UnitBase):
    id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
