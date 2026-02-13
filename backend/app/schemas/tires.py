from typing import List, Optional, Literal, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime, date

# --- TIPOS ---
EstadoLlanta = Literal["nuevo", "usado", "renovado", "desecho"]
EstadoFisico = Literal["buena", "regular", "mala"]
TipoEvento = Union[
    Literal[
        "compra",
        "montaje",
        "desmontaje",
        "reparacion",
        "renovado",
        "rotacion",
        "inspeccion",
        "desecho",
    ],
    str,
]


# --- HISTORIAL ---
class TireHistoryResponse(BaseModel):
    id: int
    fecha: datetime
    tipo: TipoEvento
    descripcion: str
    unidad: Optional[str] = Field(
        None,
        validation_alias="unidad_economico",
        serialization_alias="unidad_economico",
    )
    posicion: Optional[str] = None
    km: Optional[float] = 0
    costo: Optional[float] = 0
    responsable: Optional[str] = "Sistema"

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("tipo", mode="before")
    @classmethod
    def normalize_tipo(cls, v):
        return str(v).lower()


# --- PAYLOADS ---
class AssignTirePayload(BaseModel):
    unidad_id: Optional[int] = None
    posicion: Optional[str] = None
    notas: Optional[str] = ""


class MaintenanceTirePayload(BaseModel):
    tipo: str
    costo: float
    descripcion: str


class TireCreate(BaseModel):
    codigo_interno: str
    marca: str
    modelo: str
    medida: str
    dot: Optional[str] = None
    profundidad_original: float
    profundidad_actual: float
    precio_compra: float
    fecha_compra: date
    proveedor: str
    estado: str = "nuevo"


# --- EDICIÓN (AQUÍ ESTABA EL FALTANTE) ---
class TireUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    medida: Optional[str] = None
    dot: Optional[str] = None
    proveedor: Optional[str] = None
    precio_compra: Optional[float] = None
    fecha_compra: Optional[date] = None  # <--- Agregado
    profundidad_original: Optional[float] = None  # <--- Agregado

    model_config = ConfigDict(from_attributes=True)


# --- RESPUESTA ---
class TireResponse(BaseModel):
    id: int
    codigo_interno: str
    marca: str
    modelo: str
    medida: str
    dot: Optional[str] = None

    unidad_actual_id: Optional[int] = Field(
        default=None, serialization_alias="unidad_actual_id"
    )
    unidad_actual_economico: Optional[str] = None
    posicion: Optional[str] = None

    estado: EstadoLlanta
    estado_fisico: EstadoFisico
    profundidad_actual: float
    profundidad_original: float
    km_recorridos: float

    fecha_compra: date
    precio_compra: float
    costo_acumulado: float
    proveedor: Optional[str] = None

    history: List[TireHistoryResponse] = Field(
        default=[], serialization_alias="historial"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("estado", "estado_fisico", mode="before")
    @classmethod
    def normalize_status(cls, v):
        return str(v).lower()
