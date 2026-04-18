# --- Fuente: schemas_finance.py ---
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime, date


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


# Esquemas para Movimientos
class BankMovementResponse(BaseModel):
    id: int
    tipo: str
    monto: float
    moneda: str = "MXN"  # <-- Agregamos valor por defecto
    concepto: str
    fecha: date

    # <-- A todos los Optional les agregamos '= None' al final
    banco: Optional[str] = None
    cuenta_bancaria: Optional[str] = None
    referencia_bancaria: Optional[str] = None
    origen_modulo: Optional[str] = None

    conciliado: bool = False  # <-- Agregamos valor por defecto
    fecha_conciliacion: Optional[date] = None  # <-- Agregamos '= None'

    model_config = ConfigDict(from_attributes=True)


class BankMovementCreate(BaseModel):
    bank_account_id: int
    tipo: str = Field(
        ..., pattern="^(ingreso|egreso)$", description="Debe ser 'ingreso' o 'egreso'"
    )
    monto: float = Field(
        ..., gt=0, description="El monto debe ser estrictamente mayor a 0"
    )
    concepto: str = Field(..., min_length=3, max_length=255)
    referencia: Optional[str] = None
