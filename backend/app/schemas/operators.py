from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from enum import Enum


class OperatorStatusEnum(str, Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    VACACIONES = "vacaciones"
    INCAPACIDAD = "incapacidad"


class OperatorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    license_number: str = Field(..., min_length=1, max_length=50)
    license_type: str = "E"
    license_expiry: date
    medical_check_expiry: date
    phone: Optional[str] = None
    status: OperatorStatusEnum = OperatorStatusEnum.ACTIVO
    assigned_unit_id: Optional[int] = None 
    hire_date: Optional[date] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class OperatorCreate(OperatorBase):
    pass


class OperatorUpdate(BaseModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[str] = None
    license_expiry: Optional[date] = None
    medical_check_expiry: Optional[date] = None
    phone: Optional[str] = None
    status: Optional[OperatorStatusEnum] = None
    assigned_unit_id: Optional[int] = None # int
    hire_date: Optional[date] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class OperatorResponse(OperatorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int 
    created_at: Optional[datetime] = None
