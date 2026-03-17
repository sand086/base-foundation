from pydantic import BaseModel
from typing import Optional, List


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


class UnitTypeUpdate(BaseModel):
    nombre: Optional[str] = None
    icono: Optional[str] = None
    activo: Optional[bool] = None
    descripcion: Optional[str] = None
