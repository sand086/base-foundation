from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date, datetime


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# ITEMS DE LA ORDEN DE COMPRA
# ==========================================
class PurchaseOrderItemBase(BaseModel):
    inventory_item_id: Optional[int] = None
    descripcion: str
    cantidad: float
    unidad: str = "PZ"
    precio_unitario: float
    subtotal: float


class PurchaseOrderItemResponse(PurchaseOrderItemBase, ORMBase):
    id: int
    order_id: int


# ==========================================
# ORDEN DE COMPRA PRINCIPAL
# ==========================================
class PurchaseOrderCreate(BaseModel):
    tipo: str = Field(..., description="compra, servicio, gasto_indirecto")
    supplier_id: int
    cost_center: Optional[str] = None
    indirect_category_id: Optional[int] = None

    requester: Optional[str] = None
    required_date: Optional[date] = None
    service_description: Optional[str] = None

    subtotal: float
    iva: float
    total: float
    moneda: str = "MXN"

    items: List[PurchaseOrderItemBase] = []


class PurchaseOrderResponse(ORMBase):
    id: int
    folio: str
    tipo: str
    supplier_id: int
    cost_center: Optional[str]
    indirect_category_id: Optional[int]
    requester: Optional[str]
    required_date: Optional[date]
    service_description: Optional[str]

    subtotal: float
    iva: float
    total: float
    moneda: str
    status: str

    items: List[PurchaseOrderItemResponse] = []

    created_at: datetime
    updated_at: datetime
