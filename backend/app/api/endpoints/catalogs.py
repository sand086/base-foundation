from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import catalogs as schemas
from typing import List
import json
from app.api.endpoints.auth import get_current_active_user


router = APIRouter()

# =========================================================
# CONSTANTES (Necesarias para la carga inicial)
# =========================================================

DEFAULT_MODULES = [
    {"id": "dashboard", "nombre": "Dashboard", "icono": "LayoutDashboard"},
    {"id": "monitoreo", "nombre": "Centro de Monitoreo", "icono": "Radio"},
    {"id": "clients", "nombre": "Clientes", "icono": "Users"},
    {"id": "flota", "nombre": "Flota", "icono": "Truck"},
    {"id": "combustible", "nombre": "Combustible", "icono": "Fuel"},
    {"id": "tarifas", "nombre": "Tarifas", "icono": "DollarSign"},
    {"id": "despacho", "nombre": "Despacho", "icono": "FileText"},
    {"id": "cxc", "nombre": "Cuentas por Cobrar", "icono": "Receipt"},
    {"id": "cxp", "nombre": "Cuentas por Pagar", "icono": "CreditCard"},
    {"id": "reportes", "nombre": "Reportes", "icono": "BarChart3"},
    {"id": "usuarios", "nombre": "Usuarios", "icono": "Shield"},
]

# =========================================================
# CATÁLOGO: TIPOS DE UNIDADES
# =========================================================


@router.get("/unit-types", response_model=List[schemas.UnitTypeBase])
def get_unit_types(db: Session = Depends(get_db)):
    return db.query(models.UnitTypeCatalog).all()


@router.post("/unit-types/bulk")
def save_unit_types_bulk(
    tipos: List[schemas.UnitTypeCreate], db: Session = Depends(get_db)
):
    for item in tipos:
        db_item = (
            db.query(models.UnitTypeCatalog)
            .filter(models.UnitTypeCatalog.id == item.id)
            .first()
        )
        if db_item:
            db_item.nombre = item.nombre
            db_item.icono = item.icono
            db_item.activo = item.activo
            db_item.descripcion = item.descripcion
        else:
            new_item = models.UnitTypeCatalog(**item.model_dump())
            db.add(new_item)
    db.commit()
    return {"message": "Catálogo actualizado correctamente"}


# =========================================================
# CONFIGURACIÓN DEL SISTEMA (SystemConfig)
# =========================================================


@router.get("/system-config", response_model=List[schemas.SystemConfigResponse])
def get_system_config(db: Session = Depends(get_db)):
    """Obtiene todas las configuraciones del sistema (Ruta: /api/catalogs/system-config)"""
    # Filtramos la de 'modules_list' para que no viaje a la pantalla de Settings generales
    return (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key != "modules_list")
        .all()
    )


@router.put("/system-config/{key}", response_model=schemas.SystemConfigResponse)
def upsert_system_config(
    key: str,
    data: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # 🚀 Para la auditoría
):
    """Actualiza o Crea una configuración específica."""
    config = (
        db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    )

    if not config:
        # Si no existe en la BD, la creamos desde cero
        config = models.SystemConfig(
            key=key,
            value=data.value,
            # Los valores por defecto de grupo y tipo los manejará el frontend al crear
        )
        db.add(config)
    else:
        # Si ya existe, solo actualizamos el valor
        config.value = data.value

    # Registramos quién hizo el cambio
    config.updated_by_id = current_user.id

    db.commit()
    db.refresh(config)
    return config


# =========================================================
# RUTAS DE ORIGEN / DESTINO (RateTemplate)
# =========================================================


@router.get("/routes")
def get_routes_catalog(db: Session = Depends(get_db)):
    """Ruta final: /api/catalogs/routes"""
    # Usamos RateTemplate porque es donde guardas tus rutas origen-destino
    return db.query(models.RateTemplate).all()


@router.post("/routes")
def create_route_catalog(ruta: schemas.RouteCreate, db: Session = Depends(get_db)):
    # Lógica para crear una ruta simple
    new_route = models.RateTemplate(**ruta.model_dump())
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route


@router.delete("/routes/{route_id}")
def delete_route_catalog(route_id: int, db: Session = Depends(get_db)):
    route = (
        db.query(models.RateTemplate).filter(models.RateTemplate.id == route_id).first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(route)
    db.commit()
    return {"message": "Ruta eliminada"}


# =========================================================
# MÓDULOS DE PERMISOS
# =========================================================


@router.get("/modules", response_model=List[schemas.ModuleSchema])
def get_modules(db: Session = Depends(get_db)):
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
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
def add_module(modulo: schemas.ModuleSchema, db: Session = Depends(get_db)):
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
        .first()
    )

    current_modules = json.loads(config.value) if config else list(DEFAULT_MODULES)

    if any(m["id"] == modulo.id for m in current_modules):
        raise HTTPException(status_code=400, detail="Ya existe un módulo con este ID")

    current_modules.append(modulo.model_dump())

    if config:
        config.value = json.dumps(current_modules)
    else:
        config = models.SystemConfig(
            key="modules_list",
            value=json.dumps(current_modules),
            grupo="system",
            tipo="json",
            is_public=False,
        )
        db.add(config)

    db.commit()
    return current_modules


@router.put("/modules/{module_id}", response_model=List[schemas.ModuleSchema])
def update_module(
    module_id: str,
    modulo_actualizado: schemas.ModuleSchema,
    db: Session = Depends(get_db),
):
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
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
    db.commit()
    return current_modules


@router.delete("/modules/{module_id}", response_model=List[schemas.ModuleSchema])
def delete_module(module_id: str, db: Session = Depends(get_db)):
    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.key == "modules_list")
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    current_modules = json.loads(config.value)
    filtered_modules = [m for m in current_modules if m["id"] != module_id]

    if len(current_modules) == len(filtered_modules):
        raise HTTPException(status_code=404, detail="Módulo no encontrado")

    config.value = json.dumps(filtered_modules)
    db.commit()
    return filtered_modules
