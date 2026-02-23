from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class TollBoothBase(BaseModel):
    nombre: str
    tramo: str
    costo_5_ejes_sencillo: float = 0.0
    costo_5_ejes_full: float = 0.0
    costo_9_ejes_sencillo: float = 0.0
    costo_9_ejes_full: float = 0.0
    forma_pago: str = "Ambos"


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


class RateTemplateTollResponse(BaseModel):
    id: int
    nombre: str
    position: int
    model_config = ConfigDict(from_attributes=True)


class RateTemplateCreate(BaseModel):
    client_id: int
    origen: str
    destino: str
    toll_unit_type: str
    toll_ids: List[int]


class RateTemplateResponse(BaseModel):
    id: int
    client_id: int
    origen: str
    destino: str
    toll_unit_type: str
    costo_total_sencillo: float
    costo_total_full: float
    casetas_ordenadas: List[RateTemplateTollResponse] = []
    model_config = ConfigDict(from_attributes=True)
