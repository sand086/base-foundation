from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Type, Any, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.models import models

router = APIRouter()

# ==========================================
# 1. SCHEMAS (PYDANTIC) BASE
# ==========================================


class SatProductCreate(BaseModel):
    clave: str
    descripcion: str
    es_material_peligroso: str


class SatProductResponse(SatProductCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


# --- Esquema Genérico (Clave, Descripcion) ---
class SatGenericCreate(BaseModel):
    clave: str
    descripcion: str


class SatGenericResponse(SatGenericCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


# --- Esquemas Específicos ---
class SatTruckConfigCreate(SatGenericCreate):
    ejes: Optional[int] = None
    llantas: Optional[int] = None


class SatTruckConfigResponse(SatTruckConfigCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


class SatLocationCreate(BaseModel):
    clave: str
    estado_clave: str
    descripcion: str


class SatLocationResponse(SatLocationCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


class SatNeighborhoodCreate(BaseModel):
    clave: str
    codigo_postal: str
    nombre: str


class SatNeighborhoodResponse(SatNeighborhoodCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


class SatPermitTypeCreate(SatGenericCreate):
    clave_transporte: Optional[str] = None


class SatPermitTypeResponse(SatPermitTypeCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


class SatHazardousMaterialCreate(SatGenericCreate):
    clase_div: Optional[str] = None


class SatHazardousMaterialResponse(SatHazardousMaterialCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


class SatStationCreate(BaseModel):
    clave_identificacion: str
    descripcion: str
    clave_transporte: Optional[str] = None
    nacionalidad: Optional[str] = None


class SatStationResponse(SatStationCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


class SatUnitWeightCreate(BaseModel):
    clave: str
    nombre: str
    descripcion: Optional[str] = None
    simbolo: Optional[str] = None


class SatUnitWeightResponse(SatUnitWeightCreate):
    id: int
    activo: bool

    class Config:
        from_attributes = True


# ==========================================
# 2. GENERADOR DINÁMICO DE CRUDS (FACTORY)
# ==========================================
# Se actualizó 'id_field' por 'unique_fields' para soportar llaves compuestas (Ej. Colonias)


def create_crud_endpoints(
    router: APIRouter,
    path: str,
    model: Type[Any],
    schema_create: Type[BaseModel],
    schema_response: Type[BaseModel],
    tag: str,
    unique_fields: List[str] = ["clave"],  # Lista de campos para validar unicidad
):
    @router.get(f"{path}", response_model=List[schema_response], tags=[tag])
    def get_all(db: Session = Depends(get_db)):
        return db.query(model).filter(model.activo == True).all()

    @router.post(
        f"{path}",
        response_model=schema_response,
        status_code=status.HTTP_201_CREATED,
        tags=[tag],
    )
    def create_item(payload: schema_create, db: Session = Depends(get_db)):
        # Validar unicidad basado en los campos principales (Ej: clave, o clave + codigo_postal)
        filtro = {field: getattr(payload, field) for field in unique_fields}
        existente = db.query(model).filter_by(**filtro).first()

        if existente:
            if existente.activo:
                # Generamos un mensaje de error amigable con los campos que fallaron
                campos_str = " y ".join([f"{k} '{v}'" for k, v in filtro.items()])
                raise HTTPException(
                    status_code=400,
                    detail=f"El registro con {campos_str} ya existe.",
                )
            else:
                # Si existía pero estaba borrado (Soft Delete), lo revive y actualiza
                existente.activo = True
                for key, value in payload.model_dump().items():
                    setattr(existente, key, value)
                db.commit()
                db.refresh(existente)
                return existente

        nuevo_item = model(**payload.model_dump())
        db.add(nuevo_item)
        db.commit()
        db.refresh(nuevo_item)
        return nuevo_item

    @router.put(f"{path}/{{item_id}}", response_model=schema_response, tags=[tag])
    def update_item(
        item_id: int, payload: schema_create, db: Session = Depends(get_db)
    ):
        item = db.query(model).filter(model.id == item_id, model.activo == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        for key, value in payload.model_dump().items():
            setattr(item, key, value)

        db.commit()
        db.refresh(item)
        return item

    @router.delete(
        f"{path}/{{item_id}}", status_code=status.HTTP_204_NO_CONTENT, tags=[tag]
    )
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        item = db.query(model).filter(model.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        item.activo = False
        db.commit()
        return None


# ==========================================
# 3. REGISTRO DE ENDPOINTS
# ==========================================

# 1. Productos/Servicios
create_crud_endpoints(
    router,
    "/sat-products",
    models.SatProduct,
    SatProductCreate,
    SatProductResponse,
    "SAT - Productos CP",
)

# 2. Servicios
create_crud_endpoints(
    router,
    "/sat-services",
    models.SatServiceType,
    SatGenericCreate,
    SatGenericResponse,
    "SAT - Carta Porte",
)

# 3. Tipos de Carga
create_crud_endpoints(
    router,
    "/sat-cargo-types",
    models.SatCargoType,
    SatGenericCreate,
    SatGenericResponse,
    "SAT - Carta Porte",
)

# 4. Subtipos Remolque
create_crud_endpoints(
    router,
    "/sat-trailer-subtypes",
    models.SatTrailerSubtype,
    SatGenericCreate,
    SatGenericResponse,
    "SAT - Carta Porte",
)

# 5. Configuración Autotransporte
create_crud_endpoints(
    router,
    "/sat-truck-configs",
    models.SatTruckConfig,
    SatTruckConfigCreate,
    SatTruckConfigResponse,
    "SAT - Carta Porte",
)

# 6. Municipios
create_crud_endpoints(
    router,
    "/sat-municipalities",
    models.SatMunicipality,
    SatLocationCreate,
    SatLocationResponse,
    "SAT - Ubicaciones",
)

# 7. Localidades
create_crud_endpoints(
    router,
    "/sat-localities",
    models.SatLocality,
    SatLocationCreate,
    SatLocationResponse,
    "SAT - Ubicaciones",
)

# 8. Colonias (USA LLAVE COMPUESTA: clave + codigo_postal)
create_crud_endpoints(
    router,
    "/sat-neighborhoods",
    models.SatNeighborhood,
    SatNeighborhoodCreate,
    SatNeighborhoodResponse,
    "SAT - Ubicaciones",
    unique_fields=["clave", "codigo_postal"],
)

# 9. Tipos Permiso
create_crud_endpoints(
    router,
    "/sat-permit-types",
    models.SatPermitType,
    SatPermitTypeCreate,
    SatPermitTypeResponse,
    "SAT - Carta Porte",
)

# 10. Tipos Embalaje
create_crud_endpoints(
    router,
    "/sat-packaging-types",
    models.SatPackagingType,
    SatGenericCreate,
    SatGenericResponse,
    "SAT - Carta Porte",
)

# 11. Materiales Peligrosos
create_crud_endpoints(
    router,
    "/sat-hazardous-materials",
    models.SatHazardousMaterial,
    SatHazardousMaterialCreate,
    SatHazardousMaterialResponse,
    "SAT - Carta Porte",
)

# 12. Estaciones y Puertos (Usa 'clave_identificacion')
create_crud_endpoints(
    router,
    "/sat-stations",
    models.SatStation,
    SatStationCreate,
    SatStationResponse,
    "SAT - Carta Porte",
    unique_fields=["clave_identificacion"],
)

# 13. Unidades de Medida
create_crud_endpoints(
    router,
    "/sat-unit-weights",
    models.SatUnitWeight,
    SatUnitWeightCreate,
    SatUnitWeightResponse,
    "SAT - Carta Porte",
)
