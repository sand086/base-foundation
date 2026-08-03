import re
from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    ConfigDict,
    field_validator,
    ValidationInfo,
)
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from app.models.models import RecordStatus


# ==========================================
# PROVIDER SCHEMAS
# ==========================================
class ProviderBase(BaseModel):
    razon_social: str = Field(..., min_length=1, max_length=200)
    rfc: str = Field(..., min_length=12, max_length=13)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    dias_credito: int = 0


class ProviderCreate(ProviderBase):
    id: str


class ProviderUpdate(BaseModel):
    razon_social: Optional[str] = None
    rfc: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    dias_credito: Optional[int] = None


class ProviderResponse(ProviderBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: Optional[datetime] = None


# ==========================================
# BANK ACCOUNT SCHEMAS
# ==========================================
class BankAccountBase(BaseModel):
    banco: str
    banco_logo: Optional[str] = "🏦"
    numero_cuenta: str
    clabe: Optional[str] = None
    moneda: str = "MXN"
    alias: str
    tipo_cuenta: Optional[str] = "operativa"


class BankAccountCreate(BankAccountBase):
    pass


class BankAccountResponse(BankAccountBase):
    id: int
    saldo: float
    estatus: str
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# BANK MOVEMENT SCHEMAS
# ==========================================
class BankMovementResponse(BaseModel):
    id: int
    tipo: str
    monto: float
    moneda: str = "MXN"  # <-- Valor por defecto
    concepto: str
    fecha: date

    # <-- Todos los Optional tienen su '= None' preventivo
    banco: Optional[str] = None
    cuenta_bancaria: Optional[str] = None
    referencia_bancaria: Optional[str] = None
    origen_modulo: Optional[str] = None

    conciliado: bool = False  # <-- Valor por defecto
    fecha_conciliacion: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class BankMovementCreate(BaseModel):
    bank_account_id: int
    tipo: str = Field(
        ..., pattern="^(ingreso|egreso)$", description="Debe ser 'ingreso' o 'egreso'"
    )
    monto: float = Field(..., ge=0, description="El monto debe ser mayor o igual a 0")
    concepto: str = Field(..., min_length=3, max_length=255)
    referencia: Optional[str] = None
    origen_modulo: Optional[str] = None


# ==========================================
# NUEVO: COST CENTER (CECOS)
# ==========================================
class CostCenterBase(BaseModel):
    codigo: str = Field(..., description="Ej: ADM-01")
    nombre: str
    presupuesto_mensual: Optional[float] = 0.0
    activo: Optional[bool] = True


class CostCenterCreate(CostCenterBase):
    pass


class CostCenterResponse(CostCenterBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# PAYABLE INVOICE SCHEMAS (Cuentas por Pagar)
# ==========================================
class PayableInvoiceBase(BaseModel):
    # Relaciones existentes
    supplier_id: Optional[int] = None
    viaje_id: Optional[int] = None
    unit_id: Optional[int] = None
    categoria_indirecto_id: Optional[int] = None
    orden_compra_id: Optional[int] = None
    cost_center_id: Optional[int] = None

    # Identificadores
    uuid: Optional[str] = None
    folio_interno: Optional[str] = None
    serie: Optional[str] = None
    folio: Optional[str] = None

    # Montos
    subtotal: float = 0.0
    descuento: Optional[float] = 0.0
    iva: float = 0.0
    retenciones: float = 0.0
    monto_total: float
    saldo_pendiente: float
    desglose_impuestos: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Moneda y Fechas
    moneda: str = "MXN"
    tipo_cambio: Optional[float] = 1.0
    fecha_emision: date
    fecha_vencimiento: date
    concepto: Optional[str] = None
    clasificacion: Optional[str] = None

    # Metadatos Fiscales
    metodo_pago: Optional[str] = None
    forma_pago: Optional[str] = None
    tipo_comprobante: Optional[str] = None
    uso_cfdi: Optional[str] = None
    validacion_efos: Optional[bool] = False

    estatus: str = "pendiente"
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None

    # CAMPOS DE CANCELACIÓN
    motivo_cancelacion: Optional[str] = None
    acuse_cancelacion_url: Optional[str] = None
    fecha_cancelacion: Optional[datetime] = None

    #   NUEVOS CAMPOS AÑADIDOS
    intentos_cancelacion: Optional[int] = 0
    detalle_sat: Optional[str] = None


# ==========================================
# DOCUMENT HISTORY SCHEMAS
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


class PayableInvoiceCreate(PayableInvoiceBase):
    pass


class PayableInvoiceUpdate(BaseModel):
    # Update permite enviar solo los campos a modificar
    estatus: Optional[str] = None
    saldo_pendiente: Optional[float] = None
    cost_center_id: Optional[int] = None
    uso_cfdi: Optional[str] = None
    validacion_efos: Optional[bool] = None
    clasificacion: Optional[str] = None


class PayableInvoiceResponse(PayableInvoiceBase):
    id: int
    document_history: List[DocumentHistoryResponse] = []
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# INVOICE PAYMENT SCHEMAS (Recibos de Pago)
# ==========================================
class InvoicePaymentBase(BaseModel):
    invoice_id: int
    bank_account_id: Optional[int] = None
    fecha_pago: date
    monto: float

    # (Complemento de Pago / REP)
    parcialidad: Optional[int] = 1
    saldo_anterior: Optional[float] = None
    saldo_insoluto: Optional[float] = None

    metodo_pago: Optional[str] = None
    referencia: Optional[str] = None
    cuenta_retiro: Optional[str] = None
    complemento_uuid: Optional[str] = None
    comprobante_url: Optional[str] = None

    # CAMPOS DE ESTATUS Y CANCELACIÓN
    estatus: str = "ACTIVO"
    motivo_cancelacion: Optional[str] = None
    acuse_cancelacion_url: Optional[str] = None
    fecha_cancelacion: Optional[datetime] = None
    intentos_cancelacion: Optional[int] = 0
    detalle_sat: Optional[str] = None
    sat_error_log: Optional[str] = None


class InvoicePaymentCreate(InvoicePaymentBase):
    pass


class InvoicePaymentResponse(InvoicePaymentBase):
    id: int
    document_history: List[DocumentHistoryResponse] = []
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# MÓDULO DE LIQUIDACIONES (SETTLEMENTS)
# ==========================================


class SettlementConceptCreate(BaseModel):
    descripcion: str = Field(..., description="Ej: Bono por viaje excelente")
    tipo: str = Field(..., description="'ingreso' o 'deduccion'")
    amount: float = Field(..., ge=0)
    concept_id: Optional[int] = None
    is_automatic: bool = False  # False = Manual (Muro anti-duplicidad)


class OperatorSettlementPayload(BaseModel):
    batch_id: str = Field(
        ..., description="UUID generado en el Frontend para agrupar el lote"
    )
    operator_id: int
    legs: List[int] = Field(
        ..., description="Lista de IDs de TripLegs seleccionados para este operador"
    )
    manual_concepts: List[SettlementConceptCreate] = []


# =========================================================
# INDIRECT EXPENSE CATEGORIES (Categorías Indirectas)
# =========================================================


class IndirectCategoryBase(BaseModel):
    nombre: str
    tipo: str  # "fijo" o "variable"


class IndirectCategoryCreate(IndirectCategoryBase):
    pass


class IndirectCategoryUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    record_status: Optional[RecordStatus] = None


class IndirectCategoryResponse(IndirectCategoryBase):
    id: int
    record_status: RecordStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# FACTURAS LIBRES SAT (BILLING SERVICE)
# =========================================================


class ConceptoLibre(BaseModel):
    claveProdServ: str = Field(default="84111506")
    cantidad: float = Field(default=1.0)
    claveUnidad: str = Field(default="E48")
    descripcion: str
    precioUnitario: float
    importe: float
    id: Optional[str] = "01"


class SatFacturaLibrePayload(BaseModel):
    """
    Validador estricto para Facturas de Ingreso (Libres) generadas en Finanzas.
    """

    cliente_rfc: str
    cp_receptor: str
    monto_total: float
    subtotal: float
    iva: float
    retenciones: float
    conceptos: List[ConceptoLibre]
    uuid_relacionado: Optional[str] = None
    tipo_relacion: Optional[str] = "04"

    model_config = ConfigDict(extra="allow")

    @field_validator("cliente_rfc", mode="before")
    @classmethod
    def validate_rfc(cls, v):
        if not v or str(v).strip() in ["", "None"]:
            return "XAXX010101000"
        cleaned = re.sub(r"[^A-Z0-9Ñ]", "", str(v).upper().strip())
        if len(cleaned) not in [12, 13]:
            return "XAXX010101000"
        return cleaned

    @field_validator("cp_receptor", mode="before")
    @classmethod
    def validate_cp(cls, v):
        cp_str = str(v).strip() if v else ""
        if len(cp_str) == 4 and cp_str.isdigit():
            return f"0{cp_str}"
        if len(cp_str) != 5 or not cp_str.isdigit():
            raise ValueError(
                f"El Código Postal del cliente debe tener exactamente 5 dígitos. Recibido: '{cp_str}'"
            )
        return cp_str


# ==========================================
# CFDI HISTORY SCHEMAS (BÓVEDA DIGITAL)
# ==========================================


class CFDIActivityTimeline(BaseModel):
    """Esquema para la línea de tiempo de auditoría de un documento"""

    fecha: datetime
    accion: str
    tipo_accion: str  # Ej: "CREACION", "TIMBRADO", "CANCELACION", "NUEVA_VERSION"
    usuario: str
    detalles: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CFDIHistoryRecord(BaseModel):
    """Esquema unificado para la tabla principal del Historial CFDI"""

    id: int
    tipo_documento: str  # "FACTURAS_CLIENTES", "COMPLEMENTOS_PAGO", "CARTAS_PORTE", "FACTURAS_PROVEEDORES"
    folio: Optional[str] = None
    folio_relacionado: Optional[str] = None
    uuid: Optional[str] = None
    fecha_emision: Optional[datetime] = None
    estatus: str
    cliente_proveedor_nombre: str
    cliente_proveedor_rfc: Optional[str] = None
    monto_total: Optional[float] = None
    creado_por_nombre: Optional[str] = None
    modificado_por_nombre: Optional[str] = None
    fecha_cancelacion: Optional[datetime] = None
    motivo_cancelacion: Optional[str] = None

    subtotal: Optional[float] = 0.0
    iva: Optional[float] = 0.0
    retenciones: Optional[float] = 0.0
    moneda: Optional[str] = "MXN"
    concepto: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None
    saldo_pendiente: Optional[float] = 0.0
    trip_info: Optional[Dict[str, Any]] = Field(default_factory=dict)
    payments: Optional[List[Any]] = Field(default_factory=list)

    intentos_cancelacion: Optional[int] = 0
    detalle_sat: Optional[str] = None
    factura_padre_id: Optional[int] = None
    factura_padre: Optional[Any] = None
    cartas_porte_hijas: Optional[List[Any]] = Field(default_factory=list)
    is_nominal: Optional[bool] = False

    # Lista anidada de versiones de archivos (PDF/XML) y línea de tiempo
    versiones_archivos: List[DocumentHistoryResponse] = Field(default_factory=list)
    viaje_id: Optional[int] = None
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CFDIHistoryResponse(BaseModel):
    """Esquema de respuesta paginada o en lista para la Bóveda"""

    data: List[CFDIHistoryRecord]
    total_records: int
