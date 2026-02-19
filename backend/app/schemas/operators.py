from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import OperatorStatus  # ajusta el import a tu ruta real


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# OPERATORS
# =========================================================


class OperatorBase(ORMBase):
    # Modelo:
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

    # status = Column(Enum(OperatorStatus, name="operatorstatus"), default=OperatorStatus.ACTIVO)
    status: OperatorStatus = OperatorStatus.ACTIVO

    # assigned_unit_id = Column(Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    assigned_unit_id: Optional[int] = None

    # hire_date = Column(Date)
    hire_date: Optional[date] = None

    # emergency_contact = Column(String(100))
    emergency_contact: Optional[str] = Field(default=None, max_length=100)

    # emergency_phone = Column(String(20))
    emergency_phone: Optional[str] = Field(default=None, max_length=20)


class OperatorCreate(OperatorBase):
    """
    Para crear, no necesitas created_at/updated_at (los pone BD).
    public_id es opcional por tu modelo (nullable=True).
    """

    pass


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
    emergency_contact: Optional[str] = Field(default=None, max_length=100)
    emergency_phone: Optional[str] = Field(default=None, max_length=20)


class OperatorResponse(OperatorBase):
    id: int

    # AuditMixin (siempre existen en modelo)
    created_at: datetime
    updated_at: datetime

    # Auditoría (nullable=True)
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # Soft status
    record_status: Optional[str] = (
        None  # si quieres tiparlo estricto usa RecordStatus (ver nota abajo)
    )
