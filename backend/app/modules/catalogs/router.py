# --- Fuente: api_brands.py ---
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import Brand, RecordStatus
from .schemas import BrandResponse, BrandCreate

router = APIRouter()


@router.get("/brand", response_model=List[BrandResponse])
def get_brands(db: Session = Depends(get_db)):
    return (
        db.query(Brand)
        .filter(Brand.record_status != RecordStatus.ELIMINADO)
        .order_by(Brand.nombre.asc())
        .all()
    )


@router.post("/brand", response_model=BrandResponse)
def create_brand(obj_in: BrandCreate, db: Session = Depends(get_db)):
    # Evitar duplicados por nombre
    nombre_limpio = obj_in.nombre.strip().upper()

    # Buscamos si ya existe para no duplicar
    existing = db.query(Brand).filter(Brand.nombre == nombre_limpio).first()

    if existing:
        # Si existe pero estaba borrada, la revivimos en lugar de crear un error
        if existing.record_status == RecordStatus.ELIMINADO:
            existing.record_status = RecordStatus.ACTIVO
            existing.tipo_activo = (
                obj_in.tipo_activo.upper() if obj_in.tipo_activo else None
            )
            db.commit()
            db.refresh(existing)
            return existing
        return existing

    # Si no existe, la creamos
    new_brand = Brand(
        nombre=nombre_limpio,
        tipo_activo=obj_in.tipo_activo.upper() if obj_in.tipo_activo else None,
    )
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)
    return new_brand


# --- Fuente: api_catalogs.py ---
# backend/app/api/endpoints/catalogs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.models.models import RecordStatus
from pydantic import BaseModel
from . import schemas
from typing import List
import json
from app.modules.auth.router import get_current_active_user

# =========================================================
# CONSTANTES
# =========================================================

DEFAULT_MODULES = [
    {"id": "dashboard", "nombre": "Dashboard", "icono": "LayoutDashboard"},
    {"id": "clients", "nombre": "Clientes", "icono": "Users"},
    {"id": "rates", "nombre": "Tarifas", "icono": "Calculator"},
    {"id": "fleet", "nombre": "Flota", "icono": "Truck"},
    {"id": "monitoring", "nombre": "Histórico", "icono": "Radar"},
    {"id": "traffic", "nombre": "Tracking Op", "icono": "Navigation"},
    {"id": "dispatch", "nombre": "Despacho", "icono": "CalendarPlus"},
    {"id": "fuel", "nombre": "Combustible", "icono": "Fuel"},
    {"id": "settlements", "nombre": "Liquidación", "icono": "FileCheck"},
    {"id": "suppliers", "nombre": "Proveedores", "icono": "Briefcase"},
    {"id": "payables", "nombre": "Cuentas por Pagar", "icono": "CreditCard"},
    {"id": "receivables", "nombre": "Cuentas por Cobrar", "icono": "DollarSign"},
    {"id": "treasury", "nombre": "Tesorería", "icono": "Landmark"},
    {"id": "reports", "nombre": "Reportes", "icono": "BarChart3"},
    {"id": "users", "nombre": "Usuarios", "icono": "Users"},
    {"id": "roles", "nombre": "Roles y Permisos", "icono": "Shield"},
    {"id": "settings", "nombre": "Configuración", "icono": "Settings"}
]

# =========================================================
# CATÁLOGO: TIPOS DE UNIDADES
# =========================================================


@router.get("/unit-types", response_model=List[schemas.UnitTypeBase])
def get_unit_types(db: Session = Depends(get_db)):
    return (
        db.query(models.UnitTypeCatalog)
        .filter(models.UnitTypeCatalog.record_status != RecordStatus.ELIMINADO)
        .all()
    )


@router.post("/unit-types/bulk")
def save_unit_types_bulk(
    tipos: List[schemas.UnitTypeCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    for item in tipos:
        db_item = (
            db.query(models.UnitTypeCatalog)
            .filter(
                models.UnitTypeCatalog.id == item.id,
                models.UnitTypeCatalog.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )
        if db_item:
            db_item.nombre = item.nombre
            db_item.icono = item.icono
            db_item.activo = item.activo
            db_item.descripcion = item.descripcion
            db_item.updated_by_id = current_user.id
        else:
            new_item = models.UnitTypeCatalog(**item.model_dump())
            new_item.created_by_id = current_user.id
            db.add(new_item)
    db.commit()
    return {"message": "Catálogo actualizado correctamente"}


# =========================================================
# CONFIGURACIÓN DEL SISTEMA
# =========================================================


@router.get("/system-config", response_model=List[schemas.SystemConfigResponse])
def get_system_config(db: Session = Depends(get_db)):
    return (
        db.query(models.SystemConfig)
        .filter(
            models.SystemConfig.key != "modules_list",
            models.SystemConfig.record_status != RecordStatus.ELIMINADO,
        )
        .all()
    )


@router.put("/system-config/{key}", response_model=schemas.SystemConfigResponse)
def upsert_system_config(
    key: str,
    data: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    config = (
        db.query(models.SystemConfig)
        .filter(
            models.SystemConfig.key == key,
            models.SystemConfig.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not config:
        config = models.SystemConfig(
            key=key, value=data.value, created_by_id=current_user.id
        )
        db.add(config)
    else:
        config.value = data.value

    config.updated_by_id = current_user.id
    db.commit()
    db.refresh(config)
    return config


class ConfigBulkUpdate(BaseModel):
    key: str
    value: str


@router.put("/system-config-bulk")
def update_system_config_bulk(
    payload: List[ConfigBulkUpdate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    for item in payload:
        config = (
            db.query(models.SystemConfig)
            .filter(
                models.SystemConfig.key == item.key,
                models.SystemConfig.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )
        if config:
            config.value = item.value
            config.updated_by_id = current_user.id
        else:
            #  LÓGICA INTELIGENTE PARA QA:
            # Si la llave nueva es de QA (ej. empresa_rfc_qa), buscamos la base para heredar su grupo
            base_key = item.key.replace("_qa", "")
            base_config = (
                db.query(models.SystemConfig)
                .filter(
                    models.SystemConfig.key == base_key,
                    models.SystemConfig.record_status != RecordStatus.ELIMINADO,
                )
                .first()
            )

            grupo = (
                base_config.grupo if base_config and base_config.grupo else "general"
            )
            tipo = base_config.tipo if base_config and base_config.tipo else "string"

            new_config = models.SystemConfig(
                key=item.key,
                value=item.value,
                grupo=grupo,
                tipo=tipo,
                is_public=False,  # Para QA lo ideal es que no sea public
                created_by_id=current_user.id,
            )
            db.add(new_config)

    db.commit()
    return {"message": "Configuraciones actualizadas correctamente"}


# =========================================================
# RUTAS DE ORIGEN / DESTINO (RateTemplate)
# =========================================================


@router.get("/routes")
def get_routes_catalog(db: Session = Depends(get_db)):
    return (
        db.query(models.RateTemplate)
        .filter(models.RateTemplate.record_status != RecordStatus.ELIMINADO)
        .all()
    )


@router.post("/routes")
def create_route_catalog(
    ruta: schemas.RouteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    existing = (
        db.query(models.RateTemplate)
        .filter(
            models.RateTemplate.client_id == ruta.client_id,
            models.RateTemplate.origen == ruta.origen,
            models.RateTemplate.destino == ruta.destino,
            models.RateTemplate.tipo_unidad == ruta.tipo_unidad,
            models.RateTemplate.record_status
            != RecordStatus.ELIMINADO,  # <-- IGNORAR ELIMINADOS
        )
        .first()
    )

    if existing:
        config_str = (
            "FULL (9 Ejes)" if ruta.tipo_unidad == "9ejes" else "SENCILLO (5 Ejes)"
        )
        raise HTTPException(
            status_code=400,
            detail=f"La ruta {ruta.origen} a {ruta.destino} en configuración {config_str} ya existe para este cliente.",
        )

    new_route = models.RateTemplate(**ruta.model_dump())
    new_route.created_by_id = current_user.id
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route


@router.delete("/routes/{route_id}")
def delete_route_catalog(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    route = (
        db.query(models.RateTemplate)
        .filter(
            models.RateTemplate.id == route_id,
            models.RateTemplate.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    # <-- SOFT DELETE EN LUGAR DE db.delete(route)
    route.record_status = RecordStatus.ELIMINADO
    db.commit()
    return {"message": "Ruta eliminada"}


# =========================================================
# MÓDULOS DE PERMISOS
# =========================================================


@router.get("/modules", response_model=List[schemas.ModuleSchema])
def get_modules(db: Session = Depends(get_db)):
    config = (
        db.query(models.SystemConfig)
        .filter(
            models.SystemConfig.key == "modules_list",
            models.SystemConfig.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not config:
        config = models.SystemConfig(
            key="modules_list",
            value=json.dumps(DEFAULT_MODULES),
            grupo="system",
            tipo="json",
            is_public=False,
        )
        db.add(config)
        db.commit()
        return DEFAULT_MODULES

    return json.loads(config.value)


@router.post("/modules", response_model=List[schemas.ModuleSchema])
def add_module(
    modulo: schemas.ModuleSchema,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    config = (
        db.query(models.SystemConfig)
        .filter(
            models.SystemConfig.key == "modules_list",
            models.SystemConfig.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )

    current_modules = json.loads(config.value) if config else list(DEFAULT_MODULES)

    if any(m["id"] == modulo.id for m in current_modules):
        raise HTTPException(status_code=400, detail="Ya existe un módulo con este ID")

    current_modules.append(modulo.model_dump())

    if config:
        config.value = json.dumps(current_modules)
        config.updated_by_id = current_user.id
    else:
        config = models.SystemConfig(
            key="modules_list",
            value=json.dumps(current_modules),
            grupo="system",
            tipo="json",
            created_by_id=current_user.id,
        )
        db.add(config)

    db.commit()
    return current_modules


@router.put("/modules/{module_id}", response_model=List[schemas.ModuleSchema])
def update_module(
    module_id: str,
    modulo_actualizado: schemas.ModuleSchema,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    config = (
        db.query(models.SystemConfig)
        .filter(
            models.SystemConfig.key == "modules_list",
            models.SystemConfig.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    current_modules = json.loads(config.value)
    updated = False

    for i, m in enumerate(current_modules):
        if m["id"] == module_id:
            current_modules[i] = modulo_actualizado.model_dump()
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")

    config.value = json.dumps(current_modules)
    config.updated_by_id = current_user.id
    db.commit()
    return current_modules


@router.delete("/modules/{module_id}", response_model=List[schemas.ModuleSchema])
def delete_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    config = (
        db.query(models.SystemConfig)
        .filter(
            models.SystemConfig.key == "modules_list",
            models.SystemConfig.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    current_modules = json.loads(config.value)
    filtered_modules = [m for m in current_modules if m["id"] != module_id]

    if len(current_modules) == len(filtered_modules):
        raise HTTPException(status_code=404, detail="Módulo no encontrado")

    config.value = json.dumps(filtered_modules)
    config.updated_by_id = current_user.id
    db.commit()
    return filtered_modules


# =========================================================
# CATÁLOGO: TIPOS DE LICENCIA
# =========================================================


@router.get("/license-types", response_model=List[schemas.LicenseTypeBase])
def get_license_types(db: Session = Depends(get_db)):
    return (
        db.query(models.LicenseTypeCatalog)
        .filter(models.LicenseTypeCatalog.record_status != RecordStatus.ELIMINADO)
        .all()
    )


@router.post("/license-types/bulk")
def save_license_types_bulk(
    tipos: List[schemas.LicenseTypeCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    for item in tipos:
        db_item = (
            db.query(models.LicenseTypeCatalog)
            .filter(
                models.LicenseTypeCatalog.id == item.id,
                models.LicenseTypeCatalog.record_status != RecordStatus.ELIMINADO,
            )
            .first()
            if item.id
            else None
        )
        if db_item:
            for key, value in item.model_dump().items():
                setattr(db_item, key, value)
            db_item.updated_by_id = current_user.id
        else:
            new_item = models.LicenseTypeCatalog(**item.model_dump())
            new_item.created_by_id = current_user.id
            db.add(new_item)
    db.commit()
    return {"message": "Catálogo de licencias actualizado"}


# =========================================================
# CATÁLOGO: CONCEPTOS DE PAGO
# =========================================================


@router.get("/settlement-concepts", response_model=List[schemas.SettlementConceptBase])
def get_settlement_concepts(db: Session = Depends(get_db)):
    return (
        db.query(models.SettlementConceptCatalog)
        .filter(models.SettlementConceptCatalog.record_status != RecordStatus.ELIMINADO)
        .all()
    )


@router.post("/settlement-concepts/bulk")
def save_settlement_concepts_bulk(
    conceptos: List[schemas.SettlementConceptCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    for item in conceptos:
        db_item = (
            db.query(models.SettlementConceptCatalog)
            .filter(
                models.SettlementConceptCatalog.id == item.id,
                models.SettlementConceptCatalog.record_status != RecordStatus.ELIMINADO,
            )
            .first()
            if item.id
            else None
        )
        if db_item:
            for key, value in item.model_dump().items():
                setattr(db_item, key, value)
            db_item.updated_by_id = current_user.id
        else:
            new_item = models.SettlementConceptCatalog(**item.model_dump())
            new_item.created_by_id = current_user.id
            db.add(new_item)
    db.commit()
    return {"message": "Catálogo de conceptos actualizado"}


# =========================================================
# CATÁLOGO: ASEGURADORAS
# =========================================================


@router.get("/insurers", response_model=List[schemas.InsurerBase])
def get_insurers(db: Session = Depends(get_db)):
    return (
        db.query(models.InsurerCatalog)
        .filter(models.InsurerCatalog.record_status != RecordStatus.ELIMINADO)
        .all()
    )


@router.post("/insurers/bulk")
def save_insurers_bulk(
    insurers: List[schemas.InsurerCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    for item in insurers:
        db_item = (
            db.query(models.InsurerCatalog)
            .filter(
                models.InsurerCatalog.id == item.id,
                models.InsurerCatalog.record_status != RecordStatus.ELIMINADO,
            )
            .first()
            if item.id
            else None
        )
        if db_item:
            for key, value in item.model_dump().items():
                setattr(db_item, key, value)
            db_item.updated_by_id = current_user.id
        else:
            new_item = models.InsurerCatalog(**item.model_dump())
            new_item.created_by_id = current_user.id
            db.add(new_item)
    db.commit()
    return {"message": "Catálogo de aseguradoras actualizado"}


# --- Fuente: api_terminals.py ---
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.models.models import RecordStatus
from pydantic import BaseModel
from typing import List
from app.modules.auth.router import get_current_user


# Esquemas rápidos
class TerminalBase(BaseModel):
    nombre: str


class TerminalResponse(TerminalBase):
    id: int
    record_status: str


@router.get("/terminals", response_model=List[TerminalResponse])
def get_terminals(search: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Terminal).filter(
        models.Terminal.record_status != RecordStatus.ELIMINADO
    )
    if search:
        query = query.filter(models.Terminal.nombre.ilike(f"%{search}%"))
    return query.order_by(models.Terminal.nombre.asc()).all()


@router.post("/terminals", response_model=TerminalResponse)
def create_terminal(
    data: TerminalBase, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    # Verificar si ya existe (ignorando mayúsculas/minúsculas)
    exist = (
        db.query(models.Terminal)
        .filter(models.Terminal.nombre.ilike(data.nombre))
        .first()
    )
    if exist:
        # Si existe pero fue eliminada, la "revivimos"
        if exist.record_status == RecordStatus.ELIMINADO:
            exist.record_status = RecordStatus.ACTIVO
            db.commit()
            db.refresh(exist)
            return exist
        return exist  # Si ya existe y está activa, solo la devolvemos

    new_terminal = models.Terminal(
        nombre=data.nombre.upper().strip(), created_by_id=user.id
    )
    db.add(new_terminal)
    db.commit()
    db.refresh(new_terminal)
    return new_terminal


@router.delete("/terminals/{terminal_id}")
def delete_terminal(
    terminal_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    terminal = (
        db.query(models.Terminal)
        .filter(
            models.Terminal.id == terminal_id,
            models.Terminal.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not terminal:
        raise HTTPException(status_code=404, detail="Terminal no encontrada")

    # Soft delete
    terminal.record_status = RecordStatus.ELIMINADO
    terminal.updated_by_id = user.id
    db.commit()
    return {"message": "Terminal eliminada"}


@router.put("/terminals/{terminal_id}")
def update_terminal(
    terminal_id: int,
    data: TerminalBase,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    terminal = (
        db.query(models.Terminal)
        .filter(
            models.Terminal.id == terminal_id,
            models.Terminal.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not terminal:
        raise HTTPException(status_code=404, detail="Terminal no encontrada")

    terminal.nombre = data.nombre.upper().strip()
    terminal.updated_by_id = user.id
    db.commit()
    db.refresh(terminal)
    return terminal
