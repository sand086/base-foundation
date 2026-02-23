from pydantic import BaseModel, ConfigDict
from typing import List, Optional


# --- CASETAS ---
class TollBoothBase(BaseModel):
    nombre: str
    tramo: str
    estado: Optional[str] = None  # NUEVO
    carretera: Optional[str] = None  # NUEVO
    costo_5_ejes_sencillo: float = 0.0
    costo_5_ejes_full: float = 0.0
    costo_9_ejes_sencillo: float = 0.0
    costo_9_ejes_full: float = 0.0
    forma_pago: str = "AMBOS"


class TollBoothCreate(TollBoothBase):
    pass


class TollBoothUpdate(BaseModel):
    nombre: Optional[str] = None
    tramo: Optional[str] = None
    costo_5_ejes_sencillo: Optional[float] = None
    costo_5_ejes_full: Optional[float] = None
    costo_9_ejes_sencillo: Optional[float] = None
    costo_9_ejes_full: Optional[float] = None
    forma_pago: Optional[str] = None


class TollBoothResponse(TollBoothBase):
    id: int
    record_status: str
    model_config = ConfigDict(from_attributes=True)


# --- SEGMENTOS DE RUTA (Look SCT) ---
class RateSegmentBase(BaseModel):
    nombre_segmento: str
    estado: Optional[str] = None
    carretera: Optional[str] = None
    distancia_km: float = 0.0
    tiempo_minutos: int = 0
    toll_booth_id: Optional[int] = None
    orden: int


class RateSegmentCreate(RateSegmentBase):
    pass


class RateSegmentResponse(RateSegmentBase):
    id: int
    toll_nombre: Optional[str] = None
    costo_momento_sencillo: float
    costo_momento_full: float
    model_config = ConfigDict(from_attributes=True)


# --- PLANTILLAS DE RUTA ---
class RateTemplateCreate(BaseModel):
    client_id: int
    origen: str
    destino: str
    tipo_unidad: str  # '5ejes' | '9ejes'
    segments: List[RateSegmentCreate]  # Lista detallada de tramos


class RateTemplateResponse(BaseModel):
    id: int
    client_id: int
    origen: str
    destino: str
    tipo_unidad: str
    costo_total_sencillo: float
    costo_total_full: float
    distancia_total_km: float
    tiempo_total_minutos: int
    segments: List[RateSegmentResponse]
    model_config = ConfigDict(from_attributes=True)
