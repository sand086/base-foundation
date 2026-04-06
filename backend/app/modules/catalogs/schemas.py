
# --- Fuente: schemas_catalogs.py ---
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

# ==========================================
# SECCIÓN: MARCAS (Brands)
# ==========================================


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


# ==========================================
# SECCIÓN: TIPOS DE UNIDADES (Unit Types)
# ==========================================


class UnitTypeBase(BaseModel):
    id: str
    nombre: str
    icono: str
    activo: bool
    descripcion: Optional[str] = None


class UnitTypeCreate(UnitTypeBase):
    pass


class UnitTypeResponse(UnitTypeBase):
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SECCIÓN: LOGÍSTICA (Rutas y Casetas)
# ==========================================


class RouteCreate(BaseModel):
    origen: str
    destino: str
    tipo_unidad: str  # "5ejes" o "9ejes"
    distancia_total_km: Optional[float] = 0.0
    tiempo_total_minutos: Optional[int] = 0
    costo_total_sencillo: Optional[float] = 0.0
    costo_total_full: Optional[float] = 0.0
    client_id: Optional[int] = None


# ==========================================
# SECCIÓN: CONFIGURACIÓN DEL SISTEMA
# ==========================================


class SystemConfigBase(BaseModel):
    key: str
    value: Optional[str] = None
    grupo: Optional[str] = None
    tipo: Optional[str] = "string"
    is_public: Optional[bool] = False


class SystemConfigUpdate(BaseModel):
    value: str


class SystemConfigResponse(SystemConfigBase):
    model_config = ConfigDict(from_attributes=True)


class ModuleSchema(BaseModel):
    id: str
    nombre: str
    icono: str
    descripcion: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SECCIÓN: OTROS CATÁLOGOS (Licencias, Pagos, Seguros)
# ==========================================


class LicenseTypeBase(BaseModel):
    id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True
    model_config = ConfigDict(from_attributes=True)


class LicenseTypeCreate(LicenseTypeBase):
    pass


class SettlementConceptBase(BaseModel):
    id: Optional[int] = None
    nombre: str
    tipo: str  # 'ingreso' o 'deduccion'
    descripcion: Optional[str] = None
    activo: bool = True
    model_config = ConfigDict(from_attributes=True)


class SettlementConceptCreate(SettlementConceptBase):
    pass


class InsurerBase(BaseModel):
    id: Optional[int] = None
    nombre: str
    telefono_siniestros: Optional[str] = None
    activo: bool = True
    model_config = ConfigDict(from_attributes=True)


class InsurerCreate(InsurerBase):
    pass

