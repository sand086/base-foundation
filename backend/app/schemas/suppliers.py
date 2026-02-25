from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.models.models import (
    Currency,
    InvoiceStatus,
    RecordStatus,
    SupplierStatus,
    TariffStatus,
    UnitType,
)
from .tolls import RateTemplateResponse


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# PAYMENTS (InvoicePayment)
# =========================================================


class InvoicePaymentBase(ORMBase):
    fecha_pago: date
    monto: float
    metodo_pago: Optional[str] = Field(default=None, max_length=50)
    referencia: Optional[str] = Field(default=None, max_length=100)
    cuenta_retiro: Optional[str] = Field(default=None, max_length=50)
    complemento_uuid: Optional[str] = Field(default=None, max_length=36)


class InvoicePaymentCreate(InvoicePaymentBase):
    model_config = ConfigDict(extra="ignore")


class InvoicePaymentUpdate(ORMBase):
    fecha_pago: Optional[date] = None
    monto: Optional[float] = None
    metodo_pago: Optional[str] = Field(default=None, max_length=50)
    referencia: Optional[str] = Field(default=None, max_length=100)
    cuenta_retiro: Optional[str] = Field(default=None, max_length=50)
    complemento_uuid: Optional[str] = Field(default=None, max_length=36)

    model_config = ConfigDict(extra="ignore")


class InvoicePaymentResponse(ORMBase):
    id: int
    invoice_id: int

    fecha_pago: date
    monto: float
    metodo_pago: Optional[str] = None
    referencia: Optional[str] = None
    cuenta_retiro: Optional[str] = None
    complemento_uuid: Optional[str] = None

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# FACTURAS CXP (PayableInvoice)
# =========================================================


class PayableInvoiceBase(ORMBase):
    uuid: str = Field(..., max_length=36)
    folio_interno: Optional[str] = Field(default=None, max_length=50)

    monto_total: float
    saldo_pendiente: float

    moneda: Currency = Currency.MXN

    fecha_emision: date
    fecha_vencimiento: date

    concepto: Optional[str] = Field(default=None, max_length=200)
    clasificacion: Optional[str] = Field(default=None, max_length=50)

    estatus: InvoiceStatus = InvoiceStatus.PENDIENTE

    pdf_url: Optional[str] = Field(default=None, max_length=500)
    xml_url: Optional[str] = Field(default=None, max_length=500)

    orden_compra_id: Optional[str] = Field(default=None, max_length=50)


class PayableInvoiceCreate(ORMBase):
    supplier_id: int

    uuid: str = Field(..., max_length=36)
    folio_interno: Optional[str] = Field(default=None, max_length=50)

    monto_total: float
    moneda: Currency = Currency.MXN

    fecha_emision: date
    fecha_vencimiento: date

    concepto: Optional[str] = Field(default=None, max_length=200)
    clasificacion: Optional[str] = Field(default=None, max_length=50)

    pdf_url: Optional[str] = Field(default=None, max_length=500)
    xml_url: Optional[str] = Field(default=None, max_length=500)

    orden_compra_id: Optional[str] = Field(default=None, max_length=50)

    payments: List[InvoicePaymentCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class PayableInvoiceUpdate(ORMBase):
    uuid: Optional[str] = Field(default=None, max_length=36)
    folio_interno: Optional[str] = Field(default=None, max_length=50)

    monto_total: Optional[float] = None
    saldo_pendiente: Optional[float] = None  # si NO lo permites manualmente, elimínalo
    moneda: Optional[Currency] = None

    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None

    concepto: Optional[str] = Field(default=None, max_length=200)
    clasificacion: Optional[str] = Field(default=None, max_length=50)

    estatus: Optional[InvoiceStatus] = None

    pdf_url: Optional[str] = Field(default=None, max_length=500)
    xml_url: Optional[str] = Field(default=None, max_length=500)

    orden_compra_id: Optional[str] = Field(default=None, max_length=50)

    model_config = ConfigDict(extra="ignore")


class PayableInvoiceResponse(ORMBase):
    id: int
    supplier_id: int

    uuid: str
    folio_interno: Optional[str] = None
    supplier_razon_social: Optional[str] = None
    monto_total: float
    saldo_pendiente: float
    moneda: Currency

    fecha_emision: date
    fecha_vencimiento: date

    concepto: Optional[str] = None
    clasificacion: Optional[str] = None
    estatus: InvoiceStatus

    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None
    orden_compra_id: Optional[str] = None

    payments: List[InvoicePaymentResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# PROVEEDORES (Supplier)
# =========================================================


class SupplierTariffBase(ORMBase):
    nombre_ruta: str = Field(..., max_length=200)
    tipo_unidad: UnitType
    tarifa_base: float
    costo_casetas: float = 0.0
    moneda: Currency = Currency.MXN
    vigencia: date
    estatus: TariffStatus = TariffStatus.ACTIVA
    iva_porcentaje: float = 16.0
    retencion_porcentaje: float = 4.0
    rate_template_id: Optional[int] = None


class SupplierTariffCreate(SupplierTariffBase):
    id: Optional[int] = None


class SupplierTariffUpdate(ORMBase):
    nombre_ruta: Optional[str] = Field(default=None, max_length=200)
    tipo_unidad: Optional[UnitType] = None
    tarifa_base: Optional[float] = None
    costo_casetas: Optional[float] = None
    moneda: Optional[Currency] = None
    vigencia: Optional[date] = None
    estatus: Optional[TariffStatus] = None


class SupplierTariffResponse(SupplierTariffBase):
    id: int
    supplier_id: int
    route_template: Optional[RateTemplateResponse] = None

    @computed_field
    @property
    def total_flete(self) -> float:
        """Cálculo estandarizado: Subtotal + IVA - Retención"""
        subtotal = self.tarifa_base + self.costo_casetas
        iva = subtotal * (self.iva_porcentaje / 100)
        ret = subtotal * (self.retencion_porcentaje / 100)
        return subtotal + iva - ret


# =========================================================
# DOCUMENTOS DE PROVEEDOR
# =========================================================


class SupplierDocumentResponse(ORMBase):
    id: int
    supplier_id: int
    document_type: str
    filename: str
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    version: int
    is_active: bool
    uploaded_at: datetime


# =========================================================
# PROVEEDORES (Supplier)
# =========================================================


class SupplierBase(ORMBase):
    razon_social: str = Field(..., max_length=200)
    rfc: str = Field(..., max_length=13)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    dias_credito: int = 0
    limite_credito: float = 0.0
    contacto_principal: Optional[str] = Field(default=None, max_length=100)
    categoria: Optional[str] = Field(default=None, max_length=50)

    # Nuevos campos
    tipo_proveedor: Optional[str] = Field(default=None, max_length=50)
    zonas_cobertura: Optional[str] = Field(default=None, max_length=255)
    banco: Optional[str] = Field(default=None, max_length=100)
    cuenta_bancaria: Optional[str] = Field(default=None, max_length=50)
    clabe: Optional[str] = Field(default=None, max_length=18)

    estatus: SupplierStatus = SupplierStatus.ACTIVO


class SupplierCreate(SupplierBase):
    tariffs: List[SupplierTariffCreate] = Field(default_factory=list)


class SupplierUpdate(ORMBase):
    razon_social: Optional[str] = Field(default=None, max_length=200)
    rfc: Optional[str] = Field(default=None, max_length=13)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    dias_credito: Optional[int] = None
    limite_credito: Optional[float] = None
    contacto_principal: Optional[str] = Field(default=None, max_length=100)
    categoria: Optional[str] = Field(default=None, max_length=50)

    tipo_proveedor: Optional[str] = Field(default=None, max_length=50)
    zonas_cobertura: Optional[str] = Field(default=None, max_length=255)
    banco: Optional[str] = Field(default=None, max_length=100)
    cuenta_bancaria: Optional[str] = Field(default=None, max_length=50)
    clabe: Optional[str] = Field(default=None, max_length=18)

    estatus: Optional[SupplierStatus] = None
    tariffs: Optional[List[SupplierTariffUpdate]] = None

    model_config = ConfigDict(extra="ignore")


class SupplierResponse(SupplierBase):
    id: int

    invoices: List[PayableInvoiceResponse] = Field(default_factory=list)
    tariffs: List[SupplierTariffResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
