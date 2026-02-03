from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from enum import Enum


class UnitTypeEnum(str, Enum):
    SENCILLO = "sencillo"
    FULL = "full"
    RABON = "rabon"


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
    tipo: UnitTypeEnum
    status: UnitStatusEnum = UnitStatusEnum.DISPONIBLE
    documentos_vencidos: int = 0
    llantas_criticas: int = 0
    seguro_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None


class UnitCreate(UnitBase):
    id: str


class UnitUpdate(BaseModel):
    numero_economico: Optional[str] = None
    placas: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    status: Optional[UnitStatusEnum] = None
    seguro_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    # Agrega más campos opcionales según necesites editar


class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
