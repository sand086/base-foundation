from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import RecordStatus, UnitStatus  # ajusta ruta real si aplica
from app.schemas.tires import TireResponse


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# UNITS
# =========================================================


class UnitBase(ORMBase):
    # En tu ORM: public_id nullable=False
    public_id: str = Field(..., min_length=1, max_length=50)

    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(..., min_length=1, max_length=15)
    vin: Optional[str] = Field(default=None, max_length=17)

    marca: str = Field(..., max_length=50)
    modelo: str = Field(..., max_length=50)
    year: Optional[int] = None

    # En tu ORM: tipo es String(50) (NO enum)
    tipo: Optional[str] = Field(default=None, max_length=50)

    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    # En tu ORM: status = unitstatus
    status: UnitStatus = UnitStatus.DISPONIBLE

    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)

    # En tu ORM: server_default="false"/"0"
    ignore_blocking: bool = False
    documentos_vencidos: int = 0
    llantas_criticas: int = 0

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


class UnitCreate(ORMBase):
    """
    Create debe reflejar lo que tu API exige.
    En tu ORM, public_id es NOT NULL, así que aquí lo pedimos.
    Si luego decides generarlo server-side, cambia public_id a Optional en Create y en el service.
    """

    public_id: str = Field(..., min_length=1, max_length=50)

    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(..., min_length=1, max_length=15)
    vin: Optional[str] = Field(default=None, max_length=17)

    marca: str = Field(..., max_length=50)
    modelo: str = Field(..., max_length=50)
    year: Optional[int] = None

    tipo: Optional[str] = Field(default=None, max_length=50)

    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    status: UnitStatus = UnitStatus.DISPONIBLE

    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)

    ignore_blocking: bool = False
    documentos_vencidos: int = 0
    llantas_criticas: int = 0

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

    model_config = ConfigDict(extra="ignore")


class UnitUpdate(ORMBase):
    # Parcial (PATCH). En tu service usa exclude_unset=True

    public_id: Optional[str] = Field(default=None, min_length=1, max_length=50)

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

    model_config = ConfigDict(extra="ignore")


class UnitResponse(UnitBase):
    id: int

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    tires: List[TireResponse] = Field(default_factory=list)
