from pydantic import BaseModel, EmailStr, Field, ConfigDict
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

    # NUEVO (100% Opcional para no romper)
    cost_center_id: Optional[int] = None

    # Identificadores
    uuid: Optional[str] = None
    folio_interno: Optional[str] = None
    serie: Optional[str] = None  # NUEVO SAT
    folio: Optional[str] = None  # NUEVO SAT

    # Montos
    subtotal: float = 0.0
    descuento: Optional[float] = 0.0  # NUEVO SAT
    iva: float = 0.0
    retenciones: float = 0.0
    monto_total: float
    saldo_pendiente: float

    # Granularidad de Impuestos (JSON)
    desglose_impuestos: Optional[Dict[str, Any]] = Field(default_factory=dict)  # NUEVO

    # Moneda y Fechas
    moneda: str = "MXN"
    tipo_cambio: Optional[float] = 1.0  # NUEVO SAT
    fecha_emision: date
    fecha_vencimiento: date
    concepto: Optional[str] = None
    clasificacion: Optional[str] = None

    # Metadatos Fiscales
    metodo_pago: Optional[str] = None
    forma_pago: Optional[str] = None
    tipo_comprobante: Optional[str] = None
    uso_cfdi: Optional[str] = None  # NUEVO SAT
    validacion_efos: Optional[bool] = False  # NUEVO Compliance

    estatus: str = "pendiente"
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None


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
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# INVOICE PAYMENT SCHEMAS (Recibos de Pago)
# ==========================================
class InvoicePaymentBase(BaseModel):
    invoice_id: int
    bank_account_id: Optional[int] = None
    fecha_pago: date
    monto: float

    # NUEVOS CAMPOS (Complemento de Pago / REP)
    parcialidad: Optional[int] = 1
    saldo_anterior: Optional[float] = None
    saldo_insoluto: Optional[float] = None

    metodo_pago: Optional[str] = None
    referencia: Optional[str] = None
    cuenta_retiro: Optional[str] = None
    complemento_uuid: Optional[str] = None
    comprobante_url: Optional[str] = None


class InvoicePaymentCreate(InvoicePaymentBase):
    pass


class InvoicePaymentResponse(InvoicePaymentBase):
    id: int
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
