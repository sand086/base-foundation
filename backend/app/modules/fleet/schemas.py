
# --- Fuente: schemas_fuel.py ---
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.models import RecordStatus  # AuditMixin en FuelLog/FuelDocumentHistory

# =========================================================
# SCHEMAS ANIDADOS con Operadores y Unidades
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
# DOCUMENTOS (FuelDocumentHistory)
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

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# FUEL LOGS
# =========================================================


class FuelLogBase(BaseModel):
    unit_id: int
    operator_id: int
    trip_leg_id: Optional[int] = None

    estacion: str = Field(..., min_length=1, max_length=200)
    tipo_combustible: str  # 'diesel' | 'urea'

    litros: float = Field(..., gt=0)
    precio_por_litro: float = Field(..., gt=0)
    total: float = Field(..., gt=0)
    odometro: int = Field(..., ge=0)

    model_config = ConfigDict(from_attributes=True)

    @field_validator("tipo_combustible")
    @classmethod
    def validate_fuel_type(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("diesel", "urea"):
            raise ValueError("El tipo de combustible debe ser diesel o urea")
        return v


class FuelLogCreate(FuelLogBase):
    """
    En tu ORM FuelLog:
      - fecha_hora tiene server_default=now() (no es obligatorio mandarlo)
      - evidencia_url puede ser None
      - excede_tanque default False
      - capacidad_tanque_snapshot puede ser None
    """

    fecha_hora: Optional[datetime] = None
    excede_tanque: bool = False
    capacidad_tanque_snapshot: Optional[float] = None

    # La evidencia_url se setea en el endpoint tras procesar el archivo
    model_config = ConfigDict(extra="ignore")


class FuelLogUpdate(BaseModel):
    # PATCH
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None

    estacion: Optional[str] = Field(default=None, min_length=1, max_length=200)
    tipo_combustible: Optional[str] = None

    litros: Optional[float] = Field(default=None, gt=0)
    precio_por_litro: Optional[float] = Field(default=None, gt=0)
    total: Optional[float] = Field(default=None, gt=0)
    odometro: Optional[int] = Field(default=None, ge=0)

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

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # Relaciones (opcional: para tabla sin queries extra)
    unit: Optional[UnitFuelInfo] = Field(default=None)
    operator: Optional[OperatorFuelInfo] = Field(default=None)
    created_by: Optional[UserFuelInfo] = Field(default=None)

    # Historial de documentos (relación FuelDocumentHistory)
    document_history: List[FuelDocumentResponse] = Field(default_factory=list)

    # --- MAPEOS PARA EL FRONTEND (Mismo nombre que en AddTicketModal) ---
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

    #  NUEVO: Exponer el nombre de quien lo registró al Frontend
    @computed_field
    @property
    def registradoPor(self) -> str:
        if self.created_by:
            return f"{self.created_by.nombre} {self.created_by.apellido or ''}".strip()
        return "N/A"

    model_config = ConfigDict(from_attributes=True)


# --- Fuente: schemas_operators.py ---
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    OperatorStatus,
    RecordStatus,
)  # ajusta la ruta real si aplica


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# OPERATORS
# =========================================================


class OperatorBase(ORMBase):
    # public_id = Column(String(50), unique=True, nullable=True)
    public_id: Optional[str] = Field(default=None, max_length=50)

    # name = Column(String(100), nullable=False)
    name: str = Field(..., min_length=1, max_length=100)

    # license_number = Column(String(50), unique=True, nullable=False)
    license_number: str = Field(..., min_length=1, max_length=50)

    # license_type = Column(String(5), default="E")
    license_type: str = Field(default="E", max_length=5)

    # license_expiry = Column(Date, nullable=False)
    license_expiry: date

    # medical_check_expiry = Column(Date, nullable=False)
    medical_check_expiry: date

    # phone = Column(String(20))
    phone: Optional[str] = Field(default=None, max_length=20)

    # status = Column(pg_enum(OperatorStatus, "operatorstatus"), default=OperatorStatus.ACTIVO)
    status: OperatorStatus = OperatorStatus.ACTIVO

    # assigned_unit_id = Column(Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    assigned_unit_id: Optional[int] = None

    # hire_date = Column(Date)
    hire_date: Optional[date] = None
    rfc: Optional[str] = Field(default="XAXX010101000", max_length=13)

    # emergency_contact = Column(String(100))
    emergency_contact: Optional[str] = Field(default=None, max_length=100)

    # emergency_phone = Column(String(20))
    emergency_phone: Optional[str] = Field(default=None, max_length=20)

    # Campos de archivos/URLs que existen en tu modelo ORM Operator
    foto_url: Optional[str] = Field(default=None, max_length=500)
    licencia_url: Optional[str] = Field(default=None, max_length=500)
    ine_url: Optional[str] = Field(default=None, max_length=500)
    apto_medico_url: Optional[str] = Field(default=None, max_length=500)
    comprobante_domicilio_url: Optional[str] = Field(default=None, max_length=500)


class OperatorCreate(ORMBase):
    """
    Para crear, no necesitas created_at/updated_at (los pone BD).
    public_id es opcional por tu modelo (nullable=True).
    """

    public_id: Optional[str] = Field(default=None, max_length=50)

    name: str = Field(..., min_length=1, max_length=100)
    license_number: str = Field(..., min_length=1, max_length=50)
    license_type: str = Field(default="E", max_length=5)

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

    model_config = ConfigDict(extra="ignore")


class OperatorUpdate(ORMBase):
    """
    Parcial (PATCH/PUT). En tu service usa exclude_unset=True.
    """

    public_id: Optional[str] = Field(default=None, max_length=50)

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    license_number: Optional[str] = Field(default=None, min_length=1, max_length=50)
    license_type: Optional[str] = Field(default=None, max_length=5)

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

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# --- Fuente: schemas_tires.py ---
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    RecordStatus,
    TireCondition,
    TireEventType,
    TireStatus,
)


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# PAYLOADS (acciones)
# =========================================================


class AssignTirePayload(BaseModel):
    """
    Payload para asignar/desasignar una llanta a una unidad.
    En ORM el campo real es unit_id (FK a units.id)
    """

    unit_id: Optional[int] = Field(default=None, description="FK a units.id")
    posicion: Optional[int] = None
    notas: Optional[str] = Field(default=None, max_length=255)

    model_config = ConfigDict(extra="ignore")


class MaintenanceTirePayload(BaseModel):
    """
    Payload para registrar un evento/mantenimiento en historial.
    """

    tipo: TireEventType
    costo: float = 0.0
    descripcion: Optional[str] = Field(default=None, max_length=255)
    km: float = 0.0
    responsable: Optional[str] = Field(default=None, max_length=100)
    posicion: Optional[str] = Field(default=None, max_length=50)
    unit_id: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


# =========================================================
# TIRE HISTORY (tire_history)
# =========================================================


class TireHistoryBase(ORMBase):
    # fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha: datetime

    # tipo = Column(pg_enum(TireEventType, "tireeventtype"), nullable=False)
    tipo: TireEventType

    # descripcion = Column(String(255))
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

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TIRE (tires)
# =========================================================


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


class TireCreate(ORMBase):
    # En ORM: obligatorios -> codigo_interno, marca
    codigo_interno: str = Field(..., max_length=50)
    marca: str = Field(..., max_length=50)

    modelo: Optional[str] = Field(default=None, max_length=50)
    medida: Optional[str] = Field(default=None, max_length=20)
    dot: Optional[str] = Field(default=None, max_length=10)

    unit_id: Optional[int] = None
    posicion: Optional[str] = Field(default=None, max_length=50)

    estado: TireStatus = TireStatus.NUEVO
    estado_fisico: TireCondition = TireCondition.BUENA

    profundidad_original: float = 0.0
    profundidad_actual: float = 0.0
    km_recorridos: float = 0.0

    fecha_compra: Optional[date] = None
    precio_compra: float = 0.0
    costo_acumulado: float = 0.0

    proveedor: Optional[str] = Field(default=None, max_length=100)

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

    # Relación ORM: Tire.history (en tu modelo se llama history)
    history: List[TireHistoryResponse] = Field(default_factory=list)

    # AuditMixin
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# --- Fuente: schemas_units.py ---
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import RecordStatus, UnitStatus  # ajusta ruta real si aplica
from app.schemas.tires import TireResponse


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# UNITS
# =========================================================


class UnitBase(ORMBase):
    # En tu ORM: public_id nullable=False
    public_id: str = Field(..., min_length=1, max_length=50)

    numero_economico: str = Field(..., min_length=1, max_length=20)
    placas: str = Field(..., min_length=1, max_length=15)
    vin: Optional[str] = Field(default=None, max_length=17)

    marca: str = Field(..., max_length=50)
    modelo: str = Field(..., max_length=50)
    year: Optional[int] = None

    # En tu ORM: tipo es String(50) (NO enum)
    tipo: Optional[str] = Field(default=None, max_length=50)

    tipo_1: Optional[str] = Field(default=None, max_length=50)
    tipo_carga: Optional[str] = Field(default=None, max_length=50)
    numero_serie_motor: Optional[str] = None
    marca_motor: Optional[str] = None
    capacidad_carga: Optional[float] = None

    # En tu ORM: status = unitstatus
    status: UnitStatus = UnitStatus.DISPONIBLE

    razon_bloqueo: Optional[str] = Field(default=None, max_length=255)

    # En tu ORM: server_default="false"/"0"
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


class UnitCreate(ORMBase):
    """
    Create debe reflejar lo que tu API exige.
    En tu ORM, public_id es NOT NULL, así que aquí lo pedimos.
    Si luego decides generarlo server-side, cambia public_id a Optional en Create y en el service.
    """

    public_id: Optional[str] = Field(default=None, max_length=50)

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


class UnitUpdate(ORMBase):
    # Parcial (PATCH). En tu service usa exclude_unset=True

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

    tires: List[TireResponse] = Field(default_factory=list)

