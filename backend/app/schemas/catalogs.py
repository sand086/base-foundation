# backend/app/schemas/catalogs.py
from pydantic import BaseModel
from typing import Optional, List


# --- SCHEMAS PARA TIPOS DE UNIDADES ---
class UnitTypeBase(BaseModel):
    id: str
    nombre: str
    icono: str
    activo: bool
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True


class UnitTypeCreate(UnitTypeBase):
    pass


class RouteCreate(BaseModel):
    origen: str
    destino: str
    tipo_unidad: str  # "5ejes" o "9ejes" (según tu Enum TollUnitType)
    distancia_total_km: Optional[float] = 0.0
    tiempo_total_minutos: Optional[int] = 0
    costo_total_sencillo: Optional[float] = 0.0
    costo_total_full: Optional[float] = 0.0
    client_id: Optional[int] = None


# --- SCHEMAS PARA CONFIGURACIÓN DEL SISTEMA ---
class SystemConfigBase(BaseModel):
    key: str
    value: str
    grupo: Optional[str] = None
    tipo: Optional[str] = "string"

    class Config:
        from_attributes = True


class SystemConfigUpdate(BaseModel):
    value: str


class ModuleSchema(BaseModel):
    id: str
    nombre: str
    icono: str
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True
