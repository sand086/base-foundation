from typing import List, Optional, Literal, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime, date

# --- ENUMS (Definiciones de tipo) ---
EstadoLlanta = Literal["nuevo", "usado", "renovado", "desecho"]
EstadoFisico = Literal["buena", "regular", "mala"]
# Definimos TipoEvento también como str general para evitar conflictos si la BD trae algo nuevo
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


# --- HISTORIAL (Nested) ---
class TireHistoryResponse(BaseModel):
    id: int
    fecha: datetime
    tipo: TipoEvento
    descripcion: str
    unidad: Optional[str] = None
    posicion: Optional[str] = None
    km: Optional[float] = 0
    costo: Optional[float] = 0
    responsable: Optional[str] = "Sistema"

    model_config = ConfigDict(from_attributes=True)

    # VALIDADOR MÁGICO: Convierte Enum -> String antes de validar
    @field_validator("tipo", mode="before")
    @classmethod
    def parse_enum(cls, v):
        if hasattr(v, "value"):
            return v.value
        return str(v)


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
    dot: Optional[str] = None  # CORRECCIÓN: Opcional
    profundidad_original: float
    profundidad_actual: float
    precio_compra: float
    fecha_compra: date
    proveedor: str
    estado: str = "nuevo"


# --- RESPUESTA PRINCIPAL ---
class TireResponse(BaseModel):
    id: int
    codigo_interno: str
    marca: str
    modelo: str
    medida: str
    dot: Optional[str] = None  # CORRECCIÓN: Opcional

    # Ubicación
    unidad_actual_id: Optional[int] = Field(
        default=None, serialization_alias="unidad_actual_id"
    )
    unidad_actual_economico: Optional[str] = None
    posicion: Optional[str] = None

    # Estado
    estado: EstadoLlanta
    estado_fisico: EstadoFisico
    profundidad_actual: float
    profundidad_original: float
    km_recorridos: float

    # Tracking
    fecha_compra: date
    precio_compra: float
    costo_acumulado: float
    proveedor: Optional[str] = None

    historial: List[TireHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)

    # --- LA SOLUCIÓN DEFINITIVA AL ERROR 500 ---
    # Este validador se ejecuta ANTES de que Pydantic verifique los tipos.
    # Toma el objeto Enum de SQLAlchemy y devuelve su string simple.
    @field_validator("estado", "estado_fisico", mode="before")
    @classmethod
    def parse_enums(cls, v):
        # Si es un objeto Enum (tiene atributo .value), retornamos el valor
        if hasattr(v, "value"):
            return v.value
        # Si ya es string o null, lo dejamos pasar
        return v


class TireUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    medida: Optional[str] = None
    dot: Optional[str] = None
    proveedor: Optional[str] = None
    precio_compra: Optional[float] = None
    # Nota: No permitimos editar codigo_interno ni historial aquí por seguridad

    model_config = ConfigDict(from_attributes=True)
