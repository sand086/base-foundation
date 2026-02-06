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


from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

UnitTipo = Literal["sencillo", "full", "rabon"]
UnitStatus = Literal["disponible", "en_ruta", "mantenimiento", "bloqueado"]


class UnitBase(BaseModel):
    """
    Base schema alineado a app.models.models.Unit
    Recibe camelCase del frontend donde aplica.
    """

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    # Identificación
    public_id: Optional[str] = None
    numero_economico: str
    placas: str
    vin: Optional[str] = None

    # Detalles
    marca: str
    modelo: str
    year: Optional[int] = None
    tipo: UnitTipo

    # Técnicos extra (opcionales en DB)
    tipo_1: Optional[str] = None
    tipo_carga: Optional[str] = None
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    # Estado
    status: UnitStatus
    documentos_vencidos: Optional[int] = Field(default=0, alias="documentosVencidos")
    llantas_criticas: Optional[int] = Field(default=0, alias="llantasCriticas")

    # Vencimientos y docs
    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None

    tarjeta_circulacion_url: Optional[str] = None
    permiso_doble_articulado_url: Optional[str] = None
    poliza_seguro_url: Optional[str] = None
    verificacion_humo_url: Optional[str] = None
    verificacion_fisico_mecanica_url: Optional[str] = None


class UnitCreate(UnitBase):
    """
    Create:
    - public_id puede venir o no (si no viene, backend lo genera)
    - todo lo obligatorio del modelo se pide aquí
    """
    pass


class UnitUpdate(BaseModel):
    """
    Update parcial (PATCH):
    Todo opcional. Solo actualiza lo que venga en payload.
    """
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    public_id: Optional[str] = None
    numero_economico: Optional[str] = None
    placas: Optional[str] = None
    vin: Optional[str] = None

    marca: Optional[str] = None
    modelo: Optional[str] = None
    year: Optional[int] = None
    tipo: Optional[UnitTipo] = None

    tipo_1: Optional[str] = None
    tipo_carga: Optional[str] = None
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    status: Optional[UnitStatus] = None
    documentos_vencidos: Optional[int] = Field(default=None, alias="documentosVencidos")
    llantas_criticas: Optional[int] = Field(default=None, alias="llantasCriticas")

    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None

    tarjeta_circulacion_url: Optional[str] = None
    permiso_doble_articulado_url: Optional[str] = None
    poliza_seguro_url: Optional[str] = None
    verificacion_humo_url: Optional[str] = None
    verificacion_fisico_mecanica_url: Optional[str] = None


class UnitOut(BaseModel):
    """
    Response: refleja DB completa
    """
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    # PK interno
    id: int

    # Identificación
    public_id: str
    numero_economico: str
    placas: str
    vin: Optional[str] = None

    # Detalles
    marca: str
    modelo: str
    year: Optional[int] = None
    tipo: str  # se serializa enum a string

    tipo_1: Optional[str] = None
    tipo_carga: Optional[str] = None
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    status: str
    documentos_vencidos: int = Field(alias="documentosVencidos")
    llantas_criticas: int = Field(alias="llantasCriticas")

    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None

    tarjeta_circulacion_url: Optional[str] = None
    permiso_doble_articulado_url: Optional[str] = None
    poliza_seguro_url: Optional[str] = None
    verificacion_humo_url: Optional[str] = None
    verificacion_fisico_mecanica_url: Optional[str] = None

    created_at: datetime
    updated_at: datetime


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
