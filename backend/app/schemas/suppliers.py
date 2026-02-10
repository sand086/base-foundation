from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime

# --- PAGOS ---
class PaymentCreate(BaseModel):
    monto: float
    fecha_pago: date
    metodo_pago: str
    referencia: Optional[str] = None
    cuenta_retiro: Optional[str] = None

class PaymentResponse(PaymentCreate):
    id: int
    invoice_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- FACTURAS CXP ---
class InvoiceBase(BaseModel):
    uuid: str
    folio_interno: Optional[str] = None
    monto_total: float
    moneda: str = "MXN"
    fecha_emision: date
    fecha_vencimiento: date
    concepto: str
    clasificacion: Optional[str] = None
    orden_compra_id: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    supplier_id: int

class InvoiceResponse(InvoiceBase):
    id: int
    supplier_id: int
    supplier_razon_social: Optional[str] = None # Flattened
    saldo_pendiente: float
    estatus: str
    payments: List[PaymentResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- PROVEEDORES ---
class SupplierBase(BaseModel):
    razon_social: str
    rfc: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    dias_credito: int = 0
    limite_credito: float = 0.0
    contacto_principal: Optional[str] = None
    categoria: Optional[str] = None
    estatus: str = "activo"

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)