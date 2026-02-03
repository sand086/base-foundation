from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


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
