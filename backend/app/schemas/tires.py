from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime

# --- HISTORIAL (Nested) ---
class TireHistoryResponse(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    descripcion: str
    unidad: Optional[str] = None # Mapearemos unidad_economico aqui
    posicion: Optional[str] = None
    km: Optional[float] = 0
    costo: Optional[float] = 0
    responsable: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- LLANTA BASE ---
class TireBase(BaseModel):
    codigo_interno: str
    marca: str
    modelo: Optional[str] = None
    medida: Optional[str] = None
    dot: Optional[str] = None
    
    profundidad_original: float
    profundidad_actual: float
    
    fecha_compra: date
    precio_compra: float
    proveedor: Optional[str] = None
    
    estado: str = "nuevo"        # nuevo, usado, renovado, desecho
    estado_fisico: str = "buena" # buena, regular, mala

class TireCreate(TireBase):
    pass # El ID se genera en BD

class TireUpdate(BaseModel):
    profundidad_actual: Optional[float] = None
    km_recorridos: Optional[float] = None
    estado_fisico: Optional[str] = None
    estado: Optional[str] = None

# --- PAYLOADS PARA ACCIONES ESPECIALES ---
class AssignTirePayload(BaseModel):
    unidad_id: Optional[int] = None # Si es None, se envía a almacén
    posicion: Optional[str] = None
    notas: Optional[str] = ""

class MaintenanceTirePayload(BaseModel):
    tipo: str # reparacion, renovado, desecho
    costo: float
    descripcion: str

# --- RESPUESTA COMPLETA (Para GET) ---
class TireResponse(TireBase):
    id: int
    km_recorridos: float
    costo_acumulado: float
    
    # Datos de ubicación actual
    unidad_actual_id: Optional[int] = None
    unidad_actual_economico: Optional[str] = None
    posicion: Optional[str] = None
    
    historial: List[TireHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)