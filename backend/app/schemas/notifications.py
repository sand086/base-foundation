# backend/app/schemas/notifications.py
from pydantic import BaseModel, ConfigDict
from typing import Optional


# ==========================================
# CONFIGURACIÓN DE ALERTAS
# ==========================================
class AlertConfigBase(BaseModel):
    alerta_combustible: bool = True
    umbral_combustible: int = 5
    alerta_documento_vencido: bool = True
    dias_anticipacion_documento: int = 15
    alerta_retraso_viaje: bool = True
    minutos_retraso: int = 30


class AlertConfigUpdate(AlertConfigBase):
    pass


class AlertConfigResponse(AlertConfigBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# PLANTILLAS DE CORREO
# ==========================================
class EmailTemplateBase(BaseModel):
    codigo: str
    nombre: str
    asunto: str
    cuerpo: str


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    nombre: Optional[str] = None
    asunto: Optional[str] = None
    cuerpo: Optional[str] = None


class EmailTemplateResponse(EmailTemplateBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
