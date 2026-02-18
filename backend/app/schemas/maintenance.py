from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime


# --- INVENTARIO ---
class InventoryItemBase(BaseModel):
    sku: str
    descripcion: str
    categoria: str
    stock_actual: int
    stock_minimo: int
    ubicacion: Optional[str] = None
    precio_unitario: float


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    stock_actual: Optional[int] = None
    stock_minimo: Optional[int] = None
    ubicacion: Optional[str] = None
    precio_unitario: Optional[float] = None


class InventoryItemResponse(InventoryItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- DOCUMENTOS MECÁNICO ---
class MechanicDocumentBase(BaseModel):
    tipo_documento: str
    nombre_archivo: str
    url_archivo: str
    fecha_vencimiento: Optional[date] = None


class MechanicDocumentResponse(BaseModel):
    id: int
    mechanic_id: int
    tipo_documento: str
    nombre_archivo: str
    url_archivo: str
    subido_en: datetime

    model_config = ConfigDict(from_attributes=True)


# --- MECÁNICOS ---
class MechanicBase(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    especialidad: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    fecha_contratacion: Optional[date] = None
    nss: Optional[str] = None
    rfc: Optional[str] = None
    salario_base: Optional[float] = 0.0
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None
    activo: bool = True
    documents: List[MechanicDocumentResponse] = []  # Incluimos sus documentos


class MechanicCreate(MechanicBase):
    pass


class MechanicUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    especialidad: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None
    foto_url: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    fecha_contratacion: Optional[date] = None
    nss: Optional[str] = None
    rfc: Optional[str] = None
    salario_base: Optional[float] = 0.0


class MechanicResponse(MechanicBase):
    id: int
    foto_url: Optional[str] = None
    documents: List[MechanicDocumentResponse] = []  # Incluimos sus documentos

    model_config = ConfigDict(from_attributes=True)


# --- ORDENES DE TRABAJO ---


class WorkOrderPartCreate(BaseModel):
    inventory_item_id: int
    cantidad: int


class WorkOrderPartResponse(BaseModel):
    id: int
    inventory_item_id: int
    cantidad: int
    costo_unitario_snapshot: float
    item_sku: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkOrderCreate(BaseModel):
    unit_id: int
    mechanic_id: Optional[int] = None
    descripcion_problema: str
    parts: List[WorkOrderPartCreate] = []


class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    mechanic_id: Optional[int] = None
    descripcion_problema: Optional[str] = None
    fecha_cierre: Optional[datetime] = None


class WorkOrderResponse(BaseModel):
    id: int
    folio: str
    unit_id: int
    unit_numero: Optional[str] = None
    mechanic_id: Optional[int] = None
    mechanic_nombre: Optional[str] = None
    descripcion_problema: str
    status: str
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None
    parts: List[WorkOrderPartResponse] = []

    model_config = ConfigDict(from_attributes=True)
