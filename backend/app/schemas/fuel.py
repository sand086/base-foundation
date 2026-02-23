from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator, computed_field


# --- SCHEMAS ANIDADOS (Para mostrar info en la tabla sin queries extra) ---
class UnitFuelInfo(BaseModel):
    id: int
    numero_economico: str
    placas: str
    model_config = ConfigDict(from_attributes=True)


class OperatorFuelInfo(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


# --- BASE ---
class FuelLogBase(BaseModel):
    unit_id: int
    operator_id: int
    estacion: str = Field(..., min_length=3, max_length=200)
    tipo_combustible: str  # 'diesel' | 'urea'
    litros: float = Field(..., gt=0)
    precio_por_litro: float = Field(..., gt=0)
    total: float = Field(..., gt=0)
    odometro: int = Field(..., gt=0)

    @field_validator("tipo_combustible")
    @classmethod
    def validate_fuel_type(cls, v: str) -> str:
        v = v.lower()
        if v not in ["diesel", "urea"]:
            raise ValueError("El tipo de combustible debe ser diesel o urea")
        return v


# --- CREATE (Lo que el Front envía) ---
class FuelLogCreate(FuelLogBase):
    fecha_hora: datetime
    excede_tanque: bool = False
    capacidad_tanque_snapshot: Optional[float] = None
    # La evidencia_url se genera en el endpoint tras procesar el archivo


# --- RESPONSE (Lo que el Front recibe) ---
class FuelLogResponse(FuelLogBase):
    id: int
    fecha_hora: datetime
    evidencia_url: Optional[str] = None
    excede_tanque: bool
    capacidad_tanque_snapshot: Optional[float]

    #  Ocultamos los originales del JSON final pero los usamos para computar
    unit: Optional[UnitFuelInfo] = Field(None, exclude=True)
    operator: Optional[OperatorFuelInfo] = Field(None, exclude=True)

    # MAPEOS PARA EL FRONTEND (Mismo nombre que en AddTicketModal)
    @computed_field
    @property
    def precioPorLitro(self) -> float:
        return self.precio_por_litro

    @computed_field
    @property
    def unidadNumero(self) -> str:
        return self.unit.numero_economico if self.unit else "N/A"

    @computed_field
    @property
    def operadorNombre(self) -> str:
        return self.operator.name if self.operator else "N/A"

    model_config = ConfigDict(from_attributes=True)
