from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime

# --- 1. TARIFAS ---
class TariffBase(BaseModel):
    nombre_ruta: str
    tipo_unidad: str
    tarifa_base: float
    costo_casetas: Optional[float] = 0
    moneda: str = "MXN"
    vigencia: date
    estatus: str = "activa"

class TariffCreate(TariffBase):
   id: Optional[int] = 0

class TariffResponse(TariffBase):
    id: int # <--- Integer
    sub_client_id: int

    class Config:
        from_attributes = True

# --- 2. SUBCLIENTES ---
class SubClientBase(BaseModel):
    nombre: str
    alias: Optional[str] = None
    direccion: str
    ciudad: str
    estado: str
    codigo_postal: Optional[str] = None
    tipo_operacion: Optional[str] = "nacional"
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    horario_recepcion: Optional[str] = None
    dias_credito: Optional[int] = 30
    requiere_contrato: bool = False
    convenio_especial: bool = False
    contrato_url: Optional[str] = None

class SubClientCreate(SubClientBase):
    # Nested creation: Recibimos las tarifas al crear el subcliente
    id: Optional[int] = 0
    tariffs: List[TariffCreate] = [] 

class SubClientResponse(SubClientBase):
    id: int # <--- Integer
    client_id: int
    tariffs: List[TariffResponse] = []

    class Config:
        from_attributes = True

# --- 3. CLIENTES ---
class ClientBase(BaseModel):
    razon_social: str
    public_id: Optional[str] = None # Para tu ID visual "CLI-001"
    rfc: str
    regimen_fiscal: Optional[str] = None
    uso_cfdi: Optional[str] = None
    contacto_principal: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion_fiscal: Optional[str] = None
    codigo_postal_fiscal: Optional[str] = None
    estatus: str = "activo"
    contrato_url: Optional[str] = None
    dias_credito: Optional[int] = 0

class ClientCreate(ClientBase):
    # Nested creation: Recibimos subclientes al crear el cliente
    sub_clients: List[SubClientCreate] = []

class ClientUpdate(ClientBase):
    sub_clients: List[SubClientCreate] = []

class ClientResponse(ClientBase):
    id: int # <--- Integer
    created_at: datetime
    sub_clients: List[SubClientResponse] = []

    class Config:
        from_attributes = True