from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from enum import Enum


class UnitTypeEnum(str, Enum):
    SENCILLO = "sencillo"
    FULL = "full"
    RABON = "rabon"
    TRACTOCAMION = "tractocamion"
    REMOLQUE = "remolque"
    CAMIONETA = "camioneta"
    CAMION = "camion"
    OTRO = "otro"




class UnitStatusEnum(str, Enum):
    DISPONIBLE = "disponible"
    EN_RUTA = "en_ruta"
    MANTENIMIENTO = "mantenimiento"
    BLOQUEADO = "bloqueado"


class UnitBase(BaseModel):
    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(..., min_length=1, max_length=15)
    vin: Optional[str] = None
    marca: str
    modelo: str
    year: Optional[int] = None
    tipo: UnitTypeEnum = UnitTypeEnum.FULL
    tipo_1: Optional[str] = None
    status: UnitStatusEnum = UnitStatusEnum.DISPONIBLE
    documentos_vencidos: int = 0
    llantas_criticas: int = 0
    seguro_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None


class UnitBase(BaseModel):
    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(default="S/P", min_length=1, max_length=15)
    vin: Optional[str] = None
    marca: str
    modelo: str
    year: Optional[int] = None
    tipo: str = "full"
    status: str = "disponible"
    
    # Campos técnicos nuevos
    tipo_1: Optional[str] = None
    tipo_carga: Optional[str] = None
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None
    
    # Alertas
    documentos_vencidos: int = 0
    llantas_criticas: int = 0


class UnitUpdate(BaseModel):
    numero_economico: Optional[str] = None
    placas: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    
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

class UnitCreate(UnitBase):
    # Sobreescribimos campos para asegurarnos que sean opcionales en la creación
    vin: Optional[str] = None
    tipo_1: Optional[str] = None
    tipo_carga: Optional[str] = None
    
    # Fechas (Opcionales para que no falle si vienen vacías)
    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None
    
    # Campo de texto para folio (se convierte a URL después si aplica)
    tarjeta_circulacion: Optional[str] = None



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

class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int # O str, dependiendo de tu base de datos actual
    public_id: Optional[str] = None
    
    # --- ESTOS SON LOS QUE FALTAN EN TU JSON ---
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
    
    poliza_seguro_url: Optional[str] = None
    verificacion_humo_url: Optional[str] = None
    verificacion_fisico_mecanica_url: Optional[str] = None
    tarjeta_circulacion_url: Optional[str] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
