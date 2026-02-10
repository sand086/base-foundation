from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

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

# --- MECANICOS ---
class MechanicBase(BaseModel):
    nombre: str
    especialidad: Optional[str] = None
    activo: bool = True

class MechanicResponse(MechanicBase):
    id: int
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
    item_sku: Optional[str] = None # Para mostrar en tabla
    
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