from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

from app.models.models import InventoryCategory, WorkOrderStatus, RecordStatus


# =========================================================
# Base helper
# =========================================================


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# INVENTORY (inventory_items)
# =========================================================


class InventoryItemBase(ORMBase):
    sku: str = Field(..., max_length=50)
    descripcion: str = Field(..., max_length=200)
    categoria: InventoryCategory = InventoryCategory.GENERAL

    stock_actual: int = 0
    stock_minimo: int = 5

    ubicacion: Optional[str] = Field(default=None, max_length=100)
    precio_unitario: float = 0.0


class InventoryItemCreate(ORMBase):
    sku: str = Field(..., max_length=50)
    descripcion: str = Field(..., max_length=200)
    categoria: InventoryCategory = InventoryCategory.GENERAL

    stock_actual: int = 0
    stock_minimo: int = 5

    ubicacion: Optional[str] = Field(default=None, max_length=100)
    precio_unitario: float = 0.0

    model_config = ConfigDict(extra="ignore")


class InventoryItemUpdate(ORMBase):
    sku: Optional[str] = Field(default=None, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=200)
    categoria: Optional[InventoryCategory] = None

    stock_actual: Optional[int] = None
    stock_minimo: Optional[int] = None

    ubicacion: Optional[str] = Field(default=None, max_length=100)
    precio_unitario: Optional[float] = None

    model_config = ConfigDict(extra="ignore")


class InventoryItemResponse(InventoryItemBase):
    id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# MECHANICS (mechanics) + documents (mechanic_documents)
# =========================================================


class MechanicDocumentBase(ORMBase):
    tipo_documento: str = Field(..., max_length=50)
    nombre_archivo: str = Field(..., max_length=255)
    url_archivo: str = Field(..., max_length=500)
    fecha_vencimiento: Optional[date] = None
    subido_en: Optional[datetime] = None  # server_default func.now()


class MechanicDocumentResponse(MechanicDocumentBase):
    id: int
    mechanic_id: int

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class MechanicBase(ORMBase):
    nombre: str = Field(..., max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)
    especialidad: Optional[str] = Field(default=None, max_length=100)

    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = None

    fecha_nacimiento: Optional[date] = None
    fecha_contratacion: Optional[date] = None

    nss: Optional[str] = Field(default=None, max_length=20)
    rfc: Optional[str] = Field(default=None, max_length=13)
    salario_base: float = 0.0

    contacto_emergencia_nombre: Optional[str] = Field(default=None, max_length=100)
    contacto_emergencia_telefono: Optional[str] = Field(default=None, max_length=20)

    activo: bool = True
    foto_url: Optional[str] = Field(default=None, max_length=500)


class MechanicCreate(MechanicBase):
    model_config = ConfigDict(extra="ignore")


class MechanicUpdate(ORMBase):
    nombre: Optional[str] = Field(default=None, max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)
    especialidad: Optional[str] = Field(default=None, max_length=100)

    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = None

    fecha_nacimiento: Optional[date] = None
    fecha_contratacion: Optional[date] = None

    nss: Optional[str] = Field(default=None, max_length=20)
    rfc: Optional[str] = Field(default=None, max_length=13)
    salario_base: Optional[float] = None

    contacto_emergencia_nombre: Optional[str] = Field(default=None, max_length=100)
    contacto_emergencia_telefono: Optional[str] = Field(default=None, max_length=20)

    activo: Optional[bool] = None
    foto_url: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="ignore")


class MechanicResponse(MechanicBase):
    id: int
    documents: List[MechanicDocumentResponse] = Field(default_factory=list)

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# WORK ORDERS (work_orders) + parts (work_order_parts)
# =========================================================


class WorkOrderPartCreate(ORMBase):
    inventory_item_id: int
    cantidad: int


class WorkOrderPartResponse(ORMBase):
    id: int
    work_order_id: int
    inventory_item_id: int
    cantidad: int
    costo_unitario_snapshot: float

    # UI helpers (NO existen como columnas)
    item_sku: Optional[str] = None
    item_descripcion: Optional[str] = None

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class WorkOrderCreate(ORMBase):
    unit_id: int
    mechanic_id: Optional[int] = None
    descripcion_problema: str
    parts: List[WorkOrderPartCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class WorkOrderResponse(ORMBase):
    id: int
    folio: str

    unit_id: int
    mechanic_id: Optional[int] = None

    descripcion_problema: str
    status: WorkOrderStatus

    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None

    # UI helpers (NO existen como columnas)
    unit_numero: Optional[str] = None
    mechanic_nombre: Optional[str] = None

    parts: List[WorkOrderPartResponse] = Field(default_factory=list)

    # AuditMixin
    record_status: RecordStatus
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class WorkOrderStatusUpdate(ORMBase):
    status: WorkOrderStatus
