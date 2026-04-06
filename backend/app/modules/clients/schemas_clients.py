from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, EmailStr, computed_field

from .tolls import RateTemplateResponse
from app.models.models import (
    UnitType,
    Currency,
    TariffStatus,
    OperationType,
    ClientStatus,
)


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# TARIFAS
# =========================================================


class TariffBase(ORMBase):
    nombre_ruta: str = Field(..., max_length=200)
    tipo_unidad: UnitType
    tarifa_base: float
    costo_casetas: float = 0.0
    moneda: Currency = Currency.MXN
    vigencia: date
    estatus: TariffStatus = TariffStatus.ACTIVA
    distancia_km: float | None = 0.0
    iva_porcentaje: float | None = 16.0
    retencion_porcentaje: float | None = 4.0

    rate_template_id: Optional[int] = None


class TariffCreate(TariffBase):
    # para nested create opcional en frontend
    id: Optional[int] = None


class TariffUpdate(ORMBase):
    id: Optional[int] = None
    nombre_ruta: Optional[str] = Field(default=None, max_length=200)
    tipo_unidad: Optional[UnitType] = None
    tarifa_base: Optional[float] = None
    costo_casetas: Optional[float] = None
    moneda: Optional[Currency] = None
    vigencia: Optional[date] = None
    estatus: Optional[TariffStatus] = None

    distancia_km: Optional[float] = None
    iva_porcentaje: Optional[float] = None
    retencion_porcentaje: Optional[float] = None

    rate_template_id: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class TariffResponse(TariffBase):
    id: int

    # Para que Pydantic reconozca la relación (si viene cargada)
    route_template: Optional[RateTemplateResponse] = None

    @computed_field
    @property
    def total_flete(self) -> float:
        subtotal = self.tarifa_base + self.costo_casetas
        iva = subtotal * (self.iva_porcentaje / 100)
        ret = subtotal * (self.retencion_porcentaje / 100)
        return subtotal + iva - ret

    @computed_field
    @property
    def costo_casetas_dinamico(self) -> float:
        # Si la relación no cargó, usamos el snapshot
        if self.route_template is None:
            return self.costo_casetas
        return self.costo_casetas


# =========================================================
# SUBCLIENTES
# =========================================================


class SubClientBase(ORMBase):
    nombre: str = Field(..., max_length=200)
    alias: Optional[str] = Field(default=None, max_length=100)

    direccion: str
    ciudad: str = Field(..., max_length=100)
    estado: str = Field(..., max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)

    tipo_operacion: OperationType = OperationType.NACIONAL

    contacto: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=20)
    horario_recepcion: Optional[str] = Field(default=None, max_length=50)

    # en tu modelo: estatus es String default "activo"
    estatus: str = Field(default="activo", max_length=20)

    dias_credito: Optional[int] = None
    requiere_contrato: bool = False
    convenio_especial: bool = False
    contrato_url: Optional[str] = Field(default=None, max_length=500)


class SubClientCreate(SubClientBase):
    id: Optional[int] = None
    tariffs: List[TariffCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class SubClientUpdate(ORMBase):
    id: Optional[int] = None
    nombre: Optional[str] = Field(default=None, max_length=200)
    alias: Optional[str] = Field(default=None, max_length=100)

    direccion: Optional[str] = None
    ciudad: Optional[str] = Field(default=None, max_length=100)
    estado: Optional[str] = Field(default=None, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)

    tipo_operacion: Optional[OperationType] = None

    contacto: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=20)
    horario_recepcion: Optional[str] = Field(default=None, max_length=50)

    estatus: Optional[str] = Field(default=None, max_length=20)

    dias_credito: Optional[int] = None
    requiere_contrato: Optional[bool] = None
    convenio_especial: Optional[bool] = None
    contrato_url: Optional[str] = Field(default=None, max_length=500)

    tariffs: Optional[List[TariffUpdate]] = None

    model_config = ConfigDict(extra="ignore")


class SubClientResponse(SubClientBase):
    id: int
    client_id: int
    tariffs: List[TariffResponse] = Field(default_factory=list)


# =========================================================
# CLIENTES
# =========================================================


class ClientBase(ORMBase):
    razon_social: str = Field(..., max_length=200)
    public_id: Optional[str] = Field(default=None, max_length=50)

    rfc: str = Field(..., max_length=13)

    regimen_fiscal: Optional[str] = Field(default=None, max_length=10)
    uso_cfdi: Optional[str] = Field(default=None, max_length=10)

    contacto_principal: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[EmailStr] = None

    direccion_fiscal: Optional[str] = None
    codigo_postal_fiscal: Optional[str] = Field(default=None, max_length=10)

    estatus: ClientStatus = ClientStatus.PENDIENTE

    dias_credito: int | None = 0
    contrato_url: Optional[str] = Field(default=None, max_length=500)


class ClientCreate(ClientBase):
    sub_clients: List[SubClientCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class ClientUpdate(ORMBase):
    razon_social: Optional[str] = Field(default=None, max_length=200)
    public_id: Optional[str] = Field(default=None, max_length=50)

    rfc: Optional[str] = Field(default=None, max_length=13)

    regimen_fiscal: Optional[str] = Field(default=None, max_length=10)
    uso_cfdi: Optional[str] = Field(default=None, max_length=10)

    contacto_principal: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[EmailStr] = None

    direccion_fiscal: Optional[str] = None
    codigo_postal_fiscal: Optional[str] = Field(default=None, max_length=10)

    estatus: Optional[ClientStatus] = None

    dias_credito: Optional[int] = None
    contrato_url: Optional[str] = Field(default=None, max_length=500)

    sub_clients: Optional[List[SubClientUpdate]] = None

    model_config = ConfigDict(extra="ignore")


class ClientResponse(ClientBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    sub_clients: List[SubClientResponse] = Field(default_factory=list)


class ClientDocumentResponse(ORMBase):
    id: int
    client_id: int
    document_type: str
    filename: str
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    version: int
    is_active: bool
    uploaded_at: datetime
