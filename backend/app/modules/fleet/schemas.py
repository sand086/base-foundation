from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.models import (
    RecordStatus,
    OperatorStatus,
    TireCondition,
    TireEventType,
    TireStatus,
    UnitStatus,
)

# =========================================================
# CLASE BASE GLOBAL PARA EL MÓDULO FLEET
# =========================================================


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# SCHEMAS ANIDADOS DE APOYO (Fuel)
# =========================================================


class UnitFuelInfo(BaseModel):
    id: int
    numero_economico: str
    placas: str
    model_config = ConfigDict(from_attributes=True)


class OperatorFuelInfo(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class UserFuelInfo(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# OPERATORS (Operadores)
# =========================================================


class OperatorBase(ORMBase):
    public_id: Optional[str] = Field(default=None, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    license_number: str = Field(..., min_length=1, max_length=50)
    license_type_id: Optional[int] = None
    license_expiry: date
    medical_check_expiry: date
    phone: Optional[str] = Field(default=None, max_length=20)
    status: OperatorStatus = OperatorStatus.ACTIVO
    assigned_unit_id: Optional[int] = None
    hire_date: Optional[date] = None
    rfc: Optional[str] = Field(default="XAXX010101000", max_length=13)
    emergency_contact: Optional[str] = Field(default=None, max_length=100)
    emergency_phone: Optional[str] = Field(default=None, max_length=20)

    foto_url: Optional[str] = Field(default=None, max_length=500)
    licencia_url: Optional[str] = Field(default=None, max_length=500)
    ine_url: Optional[str] = Field(default=None, max_length=500)
    apto_medico_url: Optional[str] = Field(default=None, max_length=500)
    comprobante_domicilio_url: Optional[str] = Field(default=None, max_length=500)


class OperatorCreate(OperatorBase):
    model_config = ConfigDict(extra="ignore")


class OperatorUpdate(ORMBase):
    public_id: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    license_number: Optional[str] = Field(default=None, min_length=1, max_length=50)
    license_type_id: Optional[int] = None
    license_expiry: Optional[date] = None
    medical_check_expiry: Optional[date] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    status: Optional[OperatorStatus] = None
    assigned_unit_id: Optional[int] = None
    hire_date: Optional[date] = None
    rfc: Optional[str] = Field(default="XAXX010101000", max_length=13)
    emergency_contact: Optional[str] = Field(default=None, max_length=100)
    emergency_phone: Optional[str] = Field(default=None, max_length=20)

    foto_url: Optional[str] = Field(default=None, max_length=500)
    licencia_url: Optional[str] = Field(default=None, max_length=500)
    ine_url: Optional[str] = Field(default=None, max_length=500)
    apto_medico_url: Optional[str] = Field(default=None, max_length=500)
    comprobante_domicilio_url: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="ignore")


class OperatorResponse(OperatorBase):
    id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TIRES (Llantas)
# =========================================================


class AssignTirePayload(BaseModel):
    unit_id: Optional[int] = Field(default=None, description="FK a units.id")
    posicion: Optional[int] = None
    notas: Optional[str] = Field(default=None, max_length=255)
    model_config = ConfigDict(extra="ignore")


class MaintenanceTirePayload(BaseModel):
    tipo: TireEventType
    costo: float = 0.0
    descripcion: Optional[str] = Field(default=None, max_length=255)
    km: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)
    posicion: Optional[str] = Field(default=None, max_length=50)
    unit_id: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


class TireHistoryBase(ORMBase):
    fecha: datetime
    tipo: TireEventType
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unit_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[int] = None
    km: float = 0.0
    costo: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)


class TireHistoryCreate(ORMBase):
    tipo: TireEventType
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unit_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[str] = Field(default=None, max_length=50)
    km: float = 0.0
    costo: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)
    model_config = ConfigDict(extra="ignore")


class TireHistoryUpdate(ORMBase):
    tipo: Optional[TireEventType] = None
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unit_id: Optional[int] = None
    unidad_economico: Optional[str] = Field(default=None, max_length=50)
    posicion: Optional[str] = Field(default=None, max_length=50)
    km: Optional[float] = None
    costo: Optional[float] = None
    responsable: Optional[str] = Field(default=None, max_length=100)
    model_config = ConfigDict(extra="ignore")


class TireHistoryResponse(TireHistoryBase):
    id: int
    tire_id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class TireBase(ORMBase):
    codigo_interno: str = Field(..., max_length=50)
    marca: str = Field(..., max_length=50)
    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)
    unit_id: Optional[int] = None
    posicion: Optional[int] = None
    estado: TireStatus = TireStatus.NUEVO
    estado_fisico: TireCondition = TireCondition.BUENA
    profundidad_actual: float = 0.0
    profundidad_original: float = 0.0
    km_recorridos: float = 0.0
    fecha_compra: Optional[date] = None
    precio_compra: float = 0.0
    costo_acumulado: float = 0.0
    proveedor: Optional[str] = Field(default=None, max_length=100)


class TireCreate(TireBase):
    posicion: Optional[str] = Field(default=None, max_length=50)  # Opcional override
    model_config = ConfigDict(extra="ignore")


class TireUpdate(ORMBase):
    codigo_interno: Optional[str] = Field(default=None, max_length=50)
    marca: Optional[str] = Field(default=None, max_length=50)
    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)
    unit_id: Optional[int] = None
    posicion: Optional[str] = Field(default=None, max_length=50)
    estado: Optional[TireStatus] = None
    estado_fisico: Optional[TireCondition] = None
    profundidad_actual: Optional[float] = None
    profundidad_original: Optional[float] = None
    km_recorridos: Optional[float] = None
    fecha_compra: Optional[date] = None
    precio_compra: Optional[float] = None
    costo_acumulado: Optional[float] = None
    proveedor: Optional[str] = Field(default=None, max_length=100)
    model_config = ConfigDict(extra="ignore")


class TireResponse(TireBase):
    id: int
    history: List[TireHistoryResponse] = Field(default_factory=list)
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# UNITS (Unidades / Flota)
# =========================================================


class UnitBase(ORMBase):
    public_id: str = Field(..., min_length=1, max_length=50)
    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(..., min_length=1, max_length=15)
    vin: Optional[str] = Field(default=None, max_length=17)
    marca: str = Field(..., max_length=50)
    modelo: str = Field(..., max_length=50)
    year: Optional[int] = None
    tipo: Optional[str] = Field(default=None, max_length=50)
    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None
    status: UnitStatus = UnitStatus.DISPONIBLE
    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)
    ignore_blocking: bool = False
    documentos_vencidos: int = 0
    llantas_criticas: int = 0
    is_loaded: bool = False
    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None
    permiso_sct_folio: Optional[str] = Field(default=None, max_length=50)
    caat_folio: Optional[str] = Field(default=None, max_length=50)
    caat_vence: Optional[date] = None

    tarjeta_circulacion_url: Optional[str] = Field(default=None, max_length=500)
    permiso_doble_articulado_url: Optional[str] = Field(default=None, max_length=500)
    poliza_seguro_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_humo_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_fisico_mecanica_url: Optional[str] = Field(
        default=None, max_length=500
    )
    permiso_sct_url: Optional[str] = Field(default=None, max_length=500)
    caat_url: Optional[str] = Field(default=None, max_length=500)
    tarjeta_circulacion_folio: Optional[str] = Field(default=None, max_length=50)


class UnitCreate(UnitBase):
    public_id: Optional[str] = Field(default=None, max_length=50)
    model_config = ConfigDict(extra="ignore")


class UnitUpdate(ORMBase):
    public_id: Optional[str] = Field(default=None, min_length=1, max_length=50)
    numero_economico: Optional[str] = Field(default=None, min_length=1, max_length=20)
    placas: Optional[str] = Field(default=None, min_length=1, max_length=15)
    vin: Optional[str] = Field(default=None, max_length=17)
    marca: Optional[str] = Field(default=None, max_length=50)
    modelo: Optional[str] = Field(default=None, max_length=50)
    year: Optional[int] = None
    tipo: Optional[str] = Field(default=None, max_length=50)
    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None
    is_loaded: Optional[bool] = None
    status: Optional[UnitStatus] = None
    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)
    ignore_blocking: Optional[bool] = None
    documentos_vencidos: Optional[int] = None
    llantas_criticas: Optional[int] = None

    seguro_vence: Optional[date] = None
    verificacion_humo_vence: Optional[date] = None
    verificacion_fisico_mecanica_vence: Optional[date] = None
    verificacion_vence: Optional[date] = None
    permiso_sct_vence: Optional[date] = None
    permiso_sct_folio: Optional[str] = Field(default=None, max_length=50)
    caat_folio: Optional[str] = Field(default=None, max_length=50)
    caat_vence: Optional[date] = None

    tarjeta_circulacion_url: Optional[str] = Field(default=None, max_length=500)
    permiso_doble_articulado_url: Optional[str] = Field(default=None, max_length=500)
    poliza_seguro_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_humo_url: Optional[str] = Field(default=None, max_length=500)
    verificacion_fisico_mecanica_url: Optional[str] = Field(
        default=None, max_length=500
    )
    permiso_sct_url: Optional[str] = Field(default=None, max_length=500)
    caat_url: Optional[str] = Field(default=None, max_length=500)
    tarjeta_circulacion_folio: Optional[str] = Field(default=None, max_length=50)

    model_config = ConfigDict(extra="ignore")


class UnitResponse(UnitBase):
    id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # NO ES NECESARIO IMPORTARLA porque TireResponse ya está definida más arriba
    tires: List[TireResponse] = Field(default_factory=list)


# =========================================================
# DOCUMENTOS Y FUEL LOGS (Combustible)
# =========================================================


class FuelDocumentBase(BaseModel):
    document_type: str = Field(default="ticket", max_length=50)
    filename: str = Field(..., max_length=255)
    file_url: str = Field(..., max_length=500)
    file_size: Optional[int] = None
    mime_type: Optional[str] = Field(default=None, max_length=100)
    version: int = 1
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)


class FuelDocumentResponse(FuelDocumentBase):
    id: int
    fuel_log_id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class FuelLogBase(BaseModel):
    unit_id: int
    operator_id: int
    trip_leg_id: Optional[int] = None
    estacion: str = Field(..., min_length=1, max_length=200)
    tipo_combustible: str
    litros: float = Field(..., ge=0)
    precio_por_litro: float = Field(..., ge=0)
    total: float = Field(..., ge=0)

    # --- MODIFICACIONES PARA SOPORTE DE MOTOGENERADORES ---
    odometro: Optional[int] = Field(default=0, ge=0)
    is_motogenerator: bool = False
    horometro: Optional[float] = Field(default=None, ge=0)
    horas_sm: Optional[float] = Field(default=None, ge=0)
    # ------------------------------------------------------

    model_config = ConfigDict(from_attributes=True)

    @field_validator("tipo_combustible")
    @classmethod
    def validate_fuel_type(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("diesel", "urea"):
            raise ValueError("El tipo de combustible debe ser diesel o urea")
        return v


class FuelLogCreate(FuelLogBase):
    fecha_hora: Optional[datetime] = None
    excede_tanque: bool = False
    capacidad_tanque_snapshot: Optional[float] = None
    model_config = ConfigDict(extra="ignore")


class FuelLogUpdate(BaseModel):
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None
    estacion: Optional[str] = Field(default=None, min_length=1, max_length=200)
    tipo_combustible: Optional[str] = None
    litros: Optional[float] = Field(default=None, ge=0)
    precio_por_litro: Optional[float] = Field(default=None, ge=0)
    total: Optional[float] = Field(default=None, ge=0)

    # --- MODIFICACIONES PARA SOPORTE DE MOTOGENERADORES ---
    odometro: Optional[int] = Field(default=None, ge=0)
    is_motogenerator: Optional[bool] = None
    horometro: Optional[float] = Field(default=None, ge=0)
    horas_sm: Optional[float] = Field(default=None, ge=0)
    # ------------------------------------------------------

    fecha_hora: Optional[datetime] = None
    evidencia_url: Optional[str] = Field(default=None, max_length=500)
    excede_tanque: Optional[bool] = None
    capacidad_tanque_snapshot: Optional[float] = None
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    @field_validator("tipo_combustible")
    @classmethod
    def validate_fuel_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.lower().strip()
        if v not in ("diesel", "urea"):
            raise ValueError("El tipo de combustible debe ser diesel o urea")
        return v


class FuelLogResponse(FuelLogBase):
    id: int
    fecha_hora: datetime
    evidencia_url: Optional[str] = None
    excede_tanque: bool
    capacidad_tanque_snapshot: Optional[float] = None

    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    trip_id: Optional[int] = None

    unit: Optional[UnitFuelInfo] = Field(default=None)
    operator: Optional[OperatorFuelInfo] = Field(default=None)
    created_by: Optional[UserFuelInfo] = Field(default=None)
    document_history: List[FuelDocumentResponse] = Field(default_factory=list)

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

    @computed_field
    @property
    def registradoPor(self) -> str:
        if self.created_by:
            return f"{self.created_by.nombre} {self.created_by.apellido or ''}".strip()
        return "N/A"

    model_config = ConfigDict(from_attributes=True)
