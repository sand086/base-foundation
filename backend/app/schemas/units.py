from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime

# --- SCHEMAS PARA UNIDADES ---

class UnitBase(BaseModel):
    # Campos obligatorios y básicos
    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(default="S/P", min_length=1, max_length=15)
    vin: Optional[str] = None
    marca: str
    modelo: str
    year: Optional[int] = None
    
    # Usamos str para evitar conflictos de validación con los Enums de SQLAlchemy
    tipo: str = "full"
    status: str = "disponible"
    
    # Campos técnicos
    tipo_1: Optional[str] = None
    tipo_carga: Optional[str] = None
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None
    
    # Alertas
    documentos_vencidos: int = 0
    llantas_criticas: int = 0
    
    # Documentación técnica y legal
    permiso_sct_folio: Optional[str] = None # Nuevo: Folio en lugar de fecha
    caat_folio: Optional[str] = None        # Nuevo
    caat_vence: Optional[date] = None       # Nuevo
    
    # Fechas (Opcionales)
    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None 
    permiso_sct_vence: Optional[date] = None
    
    # URLs de documentos
    tarjeta_circulacion_url: Optional[str] = None
    poliza_seguro_url: Optional[str] = None
    verificacion_humo_url: Optional[str] = None
    verificacion_fisico_mecanica_url: Optional[str] = None
    permiso_doble_articulado_url: Optional[str] = None
    permiso_sct_url: Optional[str] = None
    caat_url: Optional[str] = None
class UnitCreate(UnitBase):
    # En creación, algunos campos pueden ser opcionales o tener lógica extra
    tarjeta_circulacion: Optional[str] = None  # Campo temporal para folio

class UnitUpdate(BaseModel):
    # Todos opcionales para PATCH
    numero_economico: Optional[str] = None
    placas: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    tipo: Optional[str] = None
    
    tipo_1: Optional[str] = None
    vin: Optional[str] = None
    tipo_carga: Optional[str] = None
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None
    
    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None
    
    tarjeta_circulacion: Optional[str] = None

class UnitResponse(UnitBase):
    id: int
    public_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Esto permite leer directamente desde el objeto ORM de SQLAlchemy
    model_config = ConfigDict(from_attributes=True)

# --- SCHEMAS PARA LLANTAS ---

class TireBase(BaseModel):
    position: str
    tire_id: Optional[str] = None
    marca: Optional[str] = None
    profundidad: float = 0
    estado: str = "bueno"
    renovado: int = 0

class TireCreate(TireBase):
    pass

class TireResponse(TireBase):
    id: int
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


