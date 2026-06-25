# --- Fuente: schemas_maintenance.py ---

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.models import InventoryCategory, RecordStatus, WorkOrderStatus

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
    proveedor_id: Optional[int] = None


class InventoryItemCreate(ORMBase):
    sku: str = Field(..., max_length=50)
    descripcion: str = Field(..., max_length=200)
    categoria: InventoryCategory = InventoryCategory.GENERAL

    # --- ESCUDO: Fuerza minúsculas al crear ---
    @field_validator("categoria", mode="before")
    @classmethod
    def force_lowercase(cls, value):
        if isinstance(value, str):
            return value.lower()
        return value

    stock_actual: int = 0
    stock_minimo: int = 5
    ubicacion: Optional[str] = Field(default=None, max_length=100)
    precio_unitario: float = 0.0
    proveedor_id: Optional[int] = None
    # bank_account_id: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class InventoryItemUpdate(ORMBase):
    sku: Optional[str] = Field(default=None, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=200)
    categoria: Optional[InventoryCategory] = None

    @field_validator("categoria", mode="before")
    @classmethod
    def force_lowercase(cls, value):
        if isinstance(value, str):
            return value.lower()
        return value

    stock_actual: Optional[int] = None
    stock_minimo: Optional[int] = None

    ubicacion: Optional[str] = Field(default=None, max_length=100)
    precio_unitario: Optional[float] = None

    proveedor_id: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class InventoryItemResponse(InventoryItemBase):
    id: int
    proveedor_nombre: Optional[str] = None

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
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
    file_size: Optional[int] = None
    subido_en: Optional[datetime] = None


class MechanicDocumentCreate(MechanicDocumentBase):
    mechanic_id: int
    model_config = ConfigDict(extra="ignore")


class MechanicDocumentUpdate(ORMBase):
    tipo_documento: Optional[str] = Field(default=None, max_length=50)
    nombre_archivo: Optional[str] = Field(default=None, max_length=255)
    url_archivo: Optional[str] = Field(default=None, max_length=500)
    fecha_vencimiento: Optional[date] = None
    file_size: Optional[int] = None
    subido_en: Optional[datetime] = None
    model_config = ConfigDict(extra="ignore")


class MechanicDocumentResponse(MechanicDocumentBase):
    id: int
    mechanic_id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
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
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# WORK ORDERS (work_orders) + parts (work_order_parts)
# =========================================================


class WorkOrderPartBase(ORMBase):
    inventory_item_id: int
    cantidad: int


class WorkOrderPartCreate(WorkOrderPartBase):
    model_config = ConfigDict(extra="ignore")


class WorkOrderPartUpdate(ORMBase):
    inventory_item_id: Optional[int] = None
    cantidad: Optional[int] = None
    costo_unitario_snapshot: Optional[float] = None
    model_config = ConfigDict(extra="ignore")


class WorkOrderPartResponse(ORMBase):
    id: int
    work_order_id: int
    inventory_item_id: int
    cantidad: int
    costo_unitario_snapshot: float
    item_sku: Optional[str] = None
    item_descripcion: Optional[str] = None
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class WorkOrderBase(ORMBase):
    unit_id: int
    mechanic_id: Optional[int] = None
    descripcion_problema: str

    # NUEVO FINANCIERO: Permitimos leer de la BD
    porcentaje_iva: float = 16.0
    subtotal: float = 0.0
    total: float = 0.0


class WorkOrderCreate(WorkOrderBase):
    parts: List[WorkOrderPartCreate] = []
    tipo_mantenimiento: str = "patio"
    trip_id: Optional[int] = None

    # NUEVO FINANCIERO: Solo agregamos mano de obra (no guardamos subtotal ni total aquí porque se calculan solos)
    costo_mano_obra: float = 0.0


class WorkOrderUpdate(ORMBase):
    unit_id: Optional[int] = None
    mechanic_id: Optional[int] = None
    descripcion_problema: Optional[str] = None
    status: Optional[WorkOrderStatus] = None
    fecha_cierre: Optional[datetime] = None
    parts: Optional[List[WorkOrderPartUpdate]] = None

    # NUEVO FINANCIERO
    porcentaje_iva: Optional[float] = None
    costo_mano_obra: Optional[float] = None

    model_config = ConfigDict(extra="ignore")


class WorkOrderResponse(ORMBase):
    id: int
    folio: str
    unit_id: int
    mechanic_id: Optional[int] = None
    descripcion_problema: str
    status: WorkOrderStatus

    tipo_mantenimiento: Optional[str] = None
    trip_id: Optional[int] = None

    # NUEVO FINANCIERO
    porcentaje_iva: float = 16.0
    subtotal: float = 0.0
    total: float = 0.0
    costo_mano_obra: Optional[float] = 0.0

    fecha_apertura: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None

    unit_numero: Optional[str] = None
    mechanic_nombre: Optional[str] = None
    parts: List[WorkOrderPartResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class WorkOrderStatusUpdate(ORMBase):
    status: WorkOrderStatus
    model_config = ConfigDict(extra="ignore")
