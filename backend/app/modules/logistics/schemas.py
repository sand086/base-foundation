import re
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING, Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    validator,
    ValidationInfo,
    model_validator,
)

from app.models.models import RecordStatus, TollUnitType, PaymentMethod

if TYPE_CHECKING:
    from app.modules.clients.schemas import ClientResponse

# =========================================================
# Base helper
# =========================================================


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ClientLite(BaseModel):
    id: int
    razon_social: str
    rfc: str

    model_config = ConfigDict(from_attributes=True)


class FuelLogLite(ORMBase):
    id: int
    fecha_hora: datetime
    estacion: str
    tipo_combustible: str
    litros: float
    precio_por_litro: float
    total: float
    odometro: int
    is_conciliated: bool = False
    diferencia_litros: Optional[float] = None
    rendimiento_real: Optional[float] = None
    evidencia_url: Optional[str] = None
    record_status: str


# =========================================================
# CASETAS (toll_booths)
# =========================================================


class TollBoothBase(ORMBase):
    nombre: str = Field(..., max_length=100)
    tramo: str = Field(..., max_length=255)

    carretera: Optional[str] = Field(default=None, max_length=100)
    estado: Optional[str] = Field(default=None, max_length=50)

    costo_5_ejes_sencillo: float = 0.0
    costo_5_ejes_full: float = 0.0
    costo_9_ejes_sencillo: float = 0.0
    costo_9_ejes_full: float = 0.0

    forma_pago: PaymentMethod = Field(default=PaymentMethod.AMBOS)

    @field_validator("forma_pago", mode="before")
    @classmethod
    def validate_forma_pago(cls, v):
        if not v:
            return PaymentMethod.AMBOS

        vv = str(v).upper()

        if "AMBOS" in vv:
            return PaymentMethod.AMBOS
        elif "TAG" in vv:
            return PaymentMethod.TAG
        elif "EFECTIVO" in vv:
            return PaymentMethod.EFECTIVO

        raise ValueError(f"Forma de pago inválida: {v}")


class TollBoothCreate(TollBoothBase):
    model_config = ConfigDict(extra="ignore")


class TollBoothUpdate(ORMBase):
    nombre: Optional[str] = Field(default=None, max_length=100)
    tramo: Optional[str] = Field(default=None, max_length=255)

    carretera: Optional[str] = Field(default=None, max_length=100)
    estado: Optional[str] = Field(default=None, max_length=50)

    costo_5_ejes_sencillo: Optional[float] = None
    costo_5_ejes_full: Optional[float] = None
    costo_9_ejes_sencillo: Optional[float] = None
    costo_9_ejes_full: Optional[float] = None

    forma_pago: Optional[str] = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="ignore")


class TollBoothResponse(TollBoothBase):
    id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# SEGMENTOS DE RUTA (rate_template_segments)
# =========================================================


class RateSegmentBase(ORMBase):
    rate_template_id: Optional[int] = None

    nombre_segmento: str = Field(..., max_length=255)
    estado: Optional[str] = Field(default=None, max_length=50)
    carretera: Optional[str] = Field(default=None, max_length=100)

    distancia_km: float = 0.0
    tiempo_minutos: int = 0

    toll_booth_id: Optional[int] = None
    orden: int

    costo_momento_sencillo: float = 0.0
    costo_momento_full: float = 0.0


class RateSegmentCreate(RateSegmentBase):
    model_config = ConfigDict(extra="ignore")


class RateSegmentUpdate(ORMBase):
    nombre_segmento: Optional[str] = Field(default=None, max_length=255)
    estado: Optional[str] = Field(default=None, max_length=50)
    carretera: Optional[str] = Field(default=None, max_length=100)

    distancia_km: Optional[float] = None
    tiempo_minutos: Optional[int] = None

    toll_booth_id: Optional[int] = None
    orden: Optional[int] = None

    costo_momento_sencillo: Optional[float] = None
    costo_momento_full: Optional[float] = None

    model_config = ConfigDict(extra="ignore")


class RateSegmentResponse(RateSegmentBase):
    id: int
    toll_nombre: Optional[str] = None


# =========================================================
# PLANTILLAS DE RUTA (rate_templates)
# =========================================================


class RateTemplateBase(ORMBase):
    client_id: int | None = Field(default=None)

    origen: str | None = Field(default=None, max_length=150)
    destino: str | None = Field(default=None, max_length=150)

    tipo_unidad: TollUnitType

    costo_total_sencillo: float = 0.0
    costo_total_full: float = 0.0
    distancia_total_km: float = 0.0
    tiempo_total_minutos: int = 0

    @field_validator("tipo_unidad", mode="before")
    @classmethod
    def normalize_tipo_unidad(cls, v):
        if isinstance(v, TollUnitType):
            return v
        if v is None:
            raise ValueError("tipo_unidad es requerido")

        s = str(v).strip().lower()
        if s in {"5ejes", "ejes_5", "5"}:
            return TollUnitType.EJES_5
        if s in {"9ejes", "ejes_9", "9"}:
            return TollUnitType.EJES_9

        raise ValueError("tipo_unidad debe ser '5ejes' o '9ejes'")


class RateTemplateCreate(RateTemplateBase):
    segments: List[RateSegmentCreate] = Field(default_factory=list)
    model_config = ConfigDict(extra="ignore")


class RateTemplateUpdate(ORMBase):
    origen: Optional[str] = Field(default=None, max_length=150)
    destino: Optional[str] = Field(default=None, max_length=150)
    tipo_unidad: Optional[TollUnitType] = None

    costo_total_sencillo: Optional[float] = None
    costo_total_full: Optional[float] = None
    distancia_total_km: Optional[float] = None
    tiempo_total_minutos: Optional[int] = None

    segments: Optional[List[RateSegmentUpdate]] = None
    model_config = ConfigDict(extra="ignore")


class RateTemplateResponse(RateTemplateBase):
    id: int
    segments: List[RateSegmentResponse] = Field(default_factory=list)
    client: Optional[ClientLite] = None

    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# TIMELINE (Apunta a TripLeg)
# =========================================================


class TripTimelineEventBase(ORMBase):
    time: datetime
    event: str = Field(..., max_length=500)
    event_type: str = Field(default="info", max_length=20)
    location: Optional[str] = None
    lat: Optional[str] = None
    lng: Optional[str] = None
    comments: Optional[str] = None


class TripTimelineEventCreate(TripTimelineEventBase):
    model_config = ConfigDict(extra="ignore")


class TripTimelineEventCreatePayload(BaseModel):
    status: str
    location: str
    comments: Optional[str] = ""
    lat: Optional[str] = None
    lng: Optional[str] = None
    notifyClient: Optional[bool] = False
    odometro: Optional[int] = None
    odometro_final: Optional[float] = None
    combustible_porcentaje: Optional[float] = None
    combustible_litros: Optional[float] = None
    terminal_entrega_vacio: Optional[str] = None
    trip_leg_id: Optional[int] = None
    penalizacion_monto: Optional[float] = None
    penalizacion_motivo: Optional[str] = None


class TripTimelineEventResponse(TripTimelineEventBase):
    id: int
    trip_leg_id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


# =========================================================
# TRIP LEGS (Tramos)
# =========================================================

from app.models.models import TripStatus, TripLegType
from app.modules.fleet.schemas import UnitResponse, OperatorResponse

class TripLegBase(ORMBase):
    leg_type: TripLegType
    status: TripStatus = TripStatus.CREADO
    unit_id: Optional[int] = None
    operator_id: Optional[int] = None
    anticipo_casetas: float = 0.0
    anticipo_viaticos: float = 0.0
    anticipo_combustible: float = 0.0
    otros_anticipos: float = 0.0
    monto_sueldo: float = 0.0
    monto_bonos: float = 0.0
    monto_maniobras: float = 0.0
    monto_penalizaciones: float = 0.0
    monto_neto_pagado: float = 0.0
    desglose_conceptos: Optional[List[dict]] = Field(default_factory=list)
    odometro_inicial: Optional[int] = 0
    nivel_tanque_inicial: Optional[int] = 0
    odometro_final: Optional[int] = None
    rendimiento_real: Optional[float] = None
    start_date: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    last_location: Optional[str] = Field(default=None, max_length=200)


class TripLegCreate(TripLegBase):
    pass


class TripLegResponse(TripLegBase):
    id: int
    trip_id: int
    last_update: datetime | None = None

    unit: Optional[UnitResponse] = None
    operator: Optional[OperatorResponse] = None

    timeline_events: List[TripTimelineEventResponse] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    fuel_logs: List[FuelLogLite] = Field(default_factory=list)

    @property
    def total_anticipos(self) -> float:
        return (
            (self.anticipo_casetas or 0.0)
            + (self.anticipo_viaticos or 0.0)
            + (self.anticipo_combustible or 0.0)
            + (self.otros_anticipos or 0.0)
        )


# =========================================================
# TRIPS PADRE
# =========================================================


class TripBase(ORMBase):
    client_id: int
    sub_client_id: int
    tariff_id: Optional[int] = None
    referencia: Optional[str] = Field(default=None, max_length=100)
    contenedor_1: Optional[str] = Field(default=None, max_length=100)
    contenedor_2: Optional[str] = Field(default=None, max_length=100)

    remolque_1_id: Optional[int] = None
    dolly_id: Optional[int] = None
    remolque_2_id: Optional[int] = None

    origin: str = Field(..., max_length=200)
    destination: str = Field(..., max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)
    descripcion_mercancia: Optional[str] = Field(
        default="Carga General", max_length=255
    )
    peso_toneladas: Optional[float] = Field(default=0.0, ge=0.0)

    sat_clave_servicio: Optional[str] = Field(
        default="78101802", max_length=20, description="Clave SAT Servicio de Flete"
    )
    sat_clave_producto: Optional[str] = Field(
        default="01010101",
        max_length=20,
        description="Clave SAT de la Mercancía Transportada",
    )
    sat_clave_unidad: Optional[str] = Field(
        default="E48", max_length=10, description="Clave SAT Unidad de Servicio"
    )
    es_material_peligroso: Optional[bool] = False
    cve_material_peligroso: Optional[str] = Field(default=None, max_length=10)
    embalaje: Optional[str] = Field(default=None, max_length=10)
    clase_imo: Optional[str] = Field(default=None, max_length=50)
    mercancia_clave_stcc: Optional[str] = Field(default=None, max_length=20)

    is_refrigerated_1: Optional[bool] = Field(default=False)
    motogenerator_1_id: Optional[int] = Field(default=None)

    is_refrigerated_2: Optional[bool] = Field(default=False)
    motogenerator_2_id: Optional[int] = Field(default=None)

    status: TripStatus = TripStatus.CREADO

    tarifa_base: float
    costo_casetas: float = 0.0
    fecha_programada: Optional[date] = None

    start_date: datetime
    closed_at: Optional[datetime] = None


class TripCreate(TripBase):
    initial_leg: Optional[TripLegCreate] = None
    final_leg: Optional[TripLegCreate] = None
    conoce_ruta_completa: Optional[bool] = False
    ocultar_montos_pdf: Optional[bool] = False
    is_dummy_stamping: Optional[bool] = False
    model_config = ConfigDict(extra="ignore")


class TariffBasicInfo(ORMBase):
    id: int
    tipo_unidad: str


# ==========================================
# DOCUMENT HISTORY & INVOICE LITE
# ==========================================
class DocumentHistoryResponse(BaseModel):
    id: int
    document_type: str
    filename: str
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    version: int
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 🚀 NUEVO: MODELO REFERENCIAL LIGERO PARA ROMPER LA RECURSIÓN 500 ERROR 🚀
class ReceivableInvoiceRef(ORMBase):
    id: int
    folio_interno: Optional[str] = None
    uuid: Optional[str] = None
    monto_total: float = 0.0
    status_sat: Optional[str] = None
    estatus: Optional[str] = None
    motivo_cancelacion: Optional[str] = None
    fecha_emision: Optional[datetime] = None


class ReceivableInvoiceLite(ORMBase):
    id: int
    viaje_id: Optional[int] = None
    uuid: Optional[str] = None
    folio_interno: Optional[str] = None
    is_nominal: Optional[bool] = False
    monto_total: float = 0.0
    saldo_pendiente: float = 0.0
    status_sat: Optional[str] = None
    estatus: Optional[str] = None
    fecha_emision: Optional[datetime] = None
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None

    # CAMPOS DE CANCELACIÓN
    motivo_cancelacion: Optional[str] = None
    acuse_cancelacion_url: Optional[str] = None
    fecha_cancelacion: Optional[datetime] = None

    intentos_cancelacion: Optional[int] = 0
    detalle_sat: Optional[str] = None
    factura_padre_id: Optional[int] = None
    
    # 🚀 FIX APLICADO: Utilizar la referencia ligera en lugar de "Any"
    factura_padre: Optional[ReceivableInvoiceRef] = None
    cartas_porte_hijas: List[ReceivableInvoiceRef] = Field(default_factory=list)

    document_history: List[DocumentHistoryResponse] = Field(default_factory=list)


from app.modules.clients.schemas import ClientResponse

class TripResponse(TripBase):
    id: int
    public_id: Optional[str] = None
    uuid_fiscal: Optional[str] = None

    client: Optional[ClientResponse] = None
    tariff: Optional[TariffBasicInfo] = None
    remolque_1: Optional[UnitResponse] = None
    dolly: Optional[UnitResponse] = None
    remolque_2: Optional[UnitResponse] = None
    motogenerator_1_unit: Optional[UnitResponse] = None
    motogenerator_2_unit: Optional[UnitResponse] = None

    legs: List[TripLegResponse] = Field(default_factory=list)
    receivable_invoices: List[ReceivableInvoiceLite] = Field(default_factory=list)

    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TripTimelineEventUpdate(ORMBase):
    time: Optional[datetime] = None
    event: Optional[str] = Field(default=None, max_length=500)
    event_type: Optional[str] = Field(default=None, max_length=20)
    model_config = ConfigDict(extra="ignore")


class TripUpdate(ORMBase):
    client_id: Optional[int] = None
    sub_client_id: Optional[int] = None
    tariff_id: Optional[int] = None

    remolque_1_id: Optional[int] = None
    dolly_id: Optional[int] = None
    remolque_2_id: Optional[int] = None

    origin: Optional[str] = Field(default=None, max_length=200)
    destination: Optional[str] = Field(default=None, max_length=200)
    route_name: Optional[str] = Field(default=None, max_length=200)
    descripcion_mercancia: Optional[str] = Field(default=None, max_length=255)
    referencia: Optional[str] = None
    contenedor_1: Optional[str] = None
    contenedor_2: Optional[str] = None
    terminal_entrega_vacio: Optional[str] = None
    peso_toneladas: Optional[float] = None

    sat_clave_servicio: Optional[str] = Field(default=None, max_length=20)
    sat_clave_producto: Optional[str] = Field(default=None, max_length=20)
    sat_clave_unidad: Optional[str] = Field(default=None, max_length=10)
    es_material_peligroso: Optional[bool] = None
    cve_material_peligroso: Optional[str] = Field(default=None, max_length=10)
    embalaje: Optional[str] = Field(default=None, max_length=10)
    clase_imo: Optional[str] = Field(default=None, max_length=50)
    mercancia_clave_stcc: Optional[str] = Field(default=None, max_length=20)
    status: Optional[TripStatus] = None
    uuid_fiscal: Optional[str] = None

    tarifa_base: Optional[float] = None
    costo_casetas: Optional[float] = None

    start_date: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    is_refrigerated_1: Optional[bool] = None
    motogenerator_1_id: Optional[int] = Field(default=None)

    is_refrigerated_2: Optional[bool] = None
    motogenerator_2: Optional[int] = Field(default=None)

    unit_id: Optional[int] = None
    operator_id: Optional[int] = None
    anticipo_casetas: Optional[float] = None
    anticipo_viaticos: Optional[float] = None
    anticipo_combustible: Optional[float] = None
    otros_anticipos: Optional[float] = None
    saldo_operador: Optional[float] = None
    last_location: Optional[str] = None
    timeline_events: Optional[List[TripTimelineEventUpdate]] = None

    model_config = ConfigDict(extra="ignore")


# =========================================================
# LIQUIDACIONES Y PRE-LIQUIDACIÓN
# =========================================================


class ConceptoPago(BaseModel):
    id: str
    tipo: str  
    categoria: str 
    descripcion: str
    monto: float
    referencia: Optional[str] = None
    esAutomatico: bool = True


class TripSettlementResponse(BaseModel):
    viajeId: str
    legId: int
    operadorNombre: str
    unidadNumero: str
    ruta: str
    fechaViaje: str
    kmsRecorridos: float
    estatus: str

    conceptos: List[ConceptoPago]
    total_ingresos: float
    total_deducciones: float
    neto_a_pagar: float

    consumoEsperadoLitros: float
    consumoRealLitros: float
    diferenciaLitros: float
    precioPorLitro: float
    deduccionCombustible: float


class CloseSettlementPayload(BaseModel):
    conceptos: List[ConceptoPago]
    total_ingresos: float
    total_deducciones: float
    neto_a_pagar: float
    odometro_final: Optional[int] = None


class BatchSettlementPreviewRequest(BaseModel):
    leg_ids: List[int]


class BatchSettlementPreviewResponse(BaseModel):
    total_kms: float
    consumo_esperado: float
    consumo_real: float
    diferencia_litros: float
    precio_promedio: float
    deduccion_combustible: float
    alertas: List[str]
    legs_sin_ticket: List[int] = []


class BatchSettlementPayload(BaseModel):
    leg_ids: List[int]
    monto_sueldo: float = 0.0
    monto_bonos: float = 0.0
    monto_maniobras: float = 0.0
    monto_penalizaciones: float = 0.0
    neto_a_pagar: float
    conceptos_extra: List[ConceptoPago] = Field(default_factory=list)


# =========================================================
# FACTURACIÓN Y RELACIONES SAT
# =========================================================

class ReceivableInvoiceCreate(BaseModel):
    viaje_id: int
    is_nominal: bool = Field(default=False)
    folio_forzado: Optional[int] = None

    use_dummy: Optional[bool] = False
    ocultar_montos: Optional[bool] = False

    tipo_relacion: Optional[str] = Field(default=None)
    uuid_relacionado: Optional[str] = Field(default=None)

    metodo_pago: str = Field(default="PUE", pattern="^(PUE|PPD)$")
    forma_pago: str = Field(default="03")
    uso_cfdi: str = Field(default="G03")

    motivo_cancelacion: Optional[str] = None
    acuse_cancelacion_url: Optional[str] = None
    fecha_cancelacion: Optional[datetime] = None

    @validator("uuid_relacionado", always=True)
    def validate_relacion_04(cls, v, values):
        if values.get("tipo_relacion") == "04" and not v:
            raise ValueError(
                "El UUID relacionado es obligatorio para la sustitución de CFDI (Relación 04)"
            )
        return v


class SatCfdiPayload(BaseModel):
    fecha: str = Field(default="")
    serie: Optional[str] = None
    folio: Optional[str] = None
    folio_interno: Optional[str] = None
    subtotal: str = Field(default="0.00")
    iva: str = Field(default="0.00")
    retenciones: str = Field(default="0.00")
    total: str = Field(default="0.00")
    id_ccp: Optional[str] = None
    
    forma_pago: str = Field(default="99")
    metodo_pago: str = Field(default="PPD")
    uso_cfdi: str = Field(default="G03")
    moneda: str = Field(default="MXN")

    rfc_cliente: str = Field(default="XAXX010101000")
    rfc_operador: str = Field(default="XAXX010101000")
    cp_cliente: str
    cp_destino: str

    peso_bruto: float
    distancia_total: int

    permiso_sct: str = Field(default="TPAF01")
    num_permiso: str = Field(default="123456")
    placas: str = Field(default="XXXXXX")
    placa_remolque_1: str = Field(default="1XXXX99")
    placa_remolque_2: Optional[str] = Field(default="1XXXX99")
    aseguradora: str = Field(default="POR DEFINIR")
    poliza: str = Field(default="00000000")

    sat_clave_producto: str = Field(default="01010101")
    es_material_peligroso: bool = Field(default=False)
    flag_peligroso_catalogo: Optional[str] = "0,1"
    cve_material_peligroso: Optional[str] = None
    embalaje: Optional[str] = None
    aseguradora_med_ambiente: Optional[str] = None
    poliza_med_ambiente: Optional[str] = None
    cantidad: Optional[str] = None
    bienes_transp: Optional[str] = None
    descripcion_mercancia_pdf: Optional[str] = None
    contenedor_1: Optional[str] = None
    contenedor_2: Optional[str] = None
    referencia_cliente: Optional[str] = None
    subcliente_nombre: Optional[str] = None
    subcliente_telefono: Optional[str] = None
    subcliente_correo: Optional[str] = None
    subcliente_direccion: Optional[str] = None
    info_material_peligroso: Optional[str] = None

    model_config = ConfigDict(extra="allow")

    @field_validator("rfc_cliente", "rfc_operador", mode="before")
    @classmethod
    def validate_rfc(cls, v):
        if not v or str(v).strip() in ["", "None"]:
            return "XAXX010101000"
        cleaned = re.sub(r"[^A-Z0-9Ñ]", "", str(v).upper().strip())
        if len(cleaned) not in [12, 13]:
            return "XAXX010101000"
        return cleaned

    @field_validator("cp_cliente", "cp_destino", mode="before")
    @classmethod
    def validate_cp(cls, v, info: ValidationInfo):
        cp_str = str(v).strip() if v else ""
        if len(cp_str) == 4 and cp_str.isdigit():
            return f"0{cp_str}"
        if len(cp_str) != 5 or not cp_str.isdigit():
            campo = "Destino" if "destino" in info.field_name else "Cliente"
            raise ValueError(
                f"El Código Postal del {campo} debe tener exactamente 5 dígitos. Recibido: '{cp_str}'"
            )
        return cp_str

    @field_validator("peso_bruto", mode="before")
    @classmethod
    def validate_peso(cls, v):
        try:
            val = float(v)
            if val <= 0.0:
                raise ValueError()
            return val
        except (ValueError, TypeError):
            raise ValueError(
                "El peso de la mercancía no puede ser 0 ni estar vacío. Por favor, captura el peso en el viaje."
            )

    @field_validator("distancia_total", mode="before")
    @classmethod
    def validate_distancia(cls, v):
        try:
            val = int(float(v))
            if val <= 0:
                raise ValueError()
            return val
        except (ValueError, TypeError):
            raise ValueError(
                "La distancia recorrida (km) no puede ser 0 ni estar vacía. Verifica la ruta o tarifa del viaje."
            )

    @field_validator("placas", "placa_remolque_1", "placa_remolque_2", mode="before")
    @classmethod
    def validate_placas(cls, v, info: ValidationInfo):
        if not v or str(v).strip() in ["", "None"]:
            return "1XXXX99" if "remolque" in info.field_name else "XXXXXX"
        return str(v).replace("-", "").strip().upper()

    @field_validator(
        "permiso_sct", "num_permiso", "aseguradora", "poliza", mode="before"
    )
    @classmethod
    def defaults_strings(cls, v, info: ValidationInfo):
        if not v or str(v).strip() in ["", "None"]:
            default_map = {
                "permiso_sct": "TPAF01",
                "num_permiso": "123456",
                "aseguradora": "POR DEFINIR",
                "poliza": "00000000",
            }
            return default_map.get(info.field_name, "N/A")
        return str(v).strip()

    @field_validator("es_material_peligroso", mode="before")
    @classmethod
    def parse_peligroso(cls, v):
        if v in [True, "true", "1", "Sí", "Si", "SI", "si"]:
            return True
        return False

    @model_validator(mode="after")
    def validate_material_peligroso(self) -> "SatCfdiPayload":
        if self.es_material_peligroso:
            if not self.cve_material_peligroso or str(
                self.cve_material_peligroso
            ).strip() in ["", "None"]:
                raise ValueError(
                    f"El viaje transporta MATERIAL PELIGROSO. Se requiere Clave ONU (Ej. UN1005). Valor recibido: '{self.cve_material_peligroso}'"
                )
            if not self.embalaje or str(self.embalaje).strip() in ["", "None"]:
                raise ValueError(
                    f"El viaje transporta MATERIAL PELIGROSO. Se requiere Embalaje (Ej. 4G). Valor recibido: '{self.embalaje}'"
                )
            if not self.aseguradora_med_ambiente or str(
                self.aseguradora_med_ambiente
            ).strip() in ["", "None"]:
                raise ValueError(
                    f"Material peligroso: El camión DEBE tener registrada una Aseguradora de Medio Ambiente. Valor recibido: '{self.aseguradora_med_ambiente}'"
                )
            if not self.poliza_med_ambiente or str(
                self.poliza_med_ambiente
            ).strip() in ["", "None"]:
                raise ValueError(
                    f"Material peligroso: El camión DEBE tener registrada una Póliza de Medio Ambiente. Valor recibido: '{self.poliza_med_ambiente}'"
                )
        return self

TripResponse.model_rebuild()