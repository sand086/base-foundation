from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, EmailStr

from app.models.models import SupplierStatus, InvoiceStatus, RecordStatus


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
    fecha_pago: date
    monto: float
    metodo_pago: Optional[str] = Field(default=None, max_length=50)
    referencia: Optional[str] = Field(default=None, max_length=100)
    cuenta_retiro: Optional[str] = Field(default=None, max_length=50)
    complemento_uuid: Optional[str] = Field(default=None, max_length=36)

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

    moneda: str = Field(default="MXN", min_length=3, max_length=3)

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
    moneda: str = Field(default="MXN", min_length=3, max_length=3)

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
    saldo_pendiente: Optional[float] = (
        None  # solo si lo permites manualmente (si no, bórralo)
    )
    moneda: Optional[str] = Field(default=None, min_length=3, max_length=3)

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

    monto_total: float
    saldo_pendiente: float
    moneda: str

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

    estatus: SupplierStatus = SupplierStatus.ACTIVO


class SupplierCreate(ORMBase):
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

    estatus: SupplierStatus = SupplierStatus.ACTIVO

    model_config = ConfigDict(extra="ignore")


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

    estatus: Optional[SupplierStatus] = None

    model_config = ConfigDict(extra="ignore")


class SupplierResponse(ORMBase):
    id: int

    razon_social: str
    rfc: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None

    dias_credito: int
    limite_credito: float

    contacto_principal: Optional[str] = None
    categoria: Optional[str] = None
    estatus: SupplierStatus

    invoices: List[PayableInvoiceResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
