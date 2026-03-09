from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class BrandBase(BaseModel):
    nombre: str
    tipo_activo: Optional[str] = None


class BrandCreate(BrandBase):
    pass


class BrandResponse(BrandBase):
    id: int
    record_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
