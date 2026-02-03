from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime


# --- 1. TARIFAS (Nivel más bajo) ---
class TariffBase(BaseModel):
    nombre_ruta: str
    tipo_unidad: str
    tarifa_base: float
    costo_casetas: Optional[float] = 0
    moneda: str = "MXN"
    vigencia: date
    estatus: str = "activa"


class TariffCreate(TariffBase):
    id: str  # El frontend manda UUIDs temporales o reales


class TariffResponse(TariffBase):
    id: str
    sub_client_id: str

    class Config:
        from_attributes = True


# --- 2. SUBCLIENTES (Nivel medio) ---
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
    id: str
    tariffs: List[TariffCreate] = []  # Lista anidada


class SubClientResponse(SubClientBase):
    id: str
    client_id: str
    tariffs: List[TariffResponse] = []

    class Config:
        from_attributes = True


# --- 3. CLIENTES (Nivel superior) ---
class ClientBase(BaseModel):
    razon_social: str
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
    id: str
    sub_clients: List[SubClientCreate] = []  # Lista anidada


class ClientUpdate(ClientBase):
    sub_clients: List[SubClientCreate] = []


class ClientResponse(ClientBase):
    id: str
    created_at: datetime
    sub_clients: List[SubClientResponse] = []  # Devuelve todo el árbol

    class Config:
        from_attributes = True
