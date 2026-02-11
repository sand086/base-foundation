from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas import tires as schemas
from app.crud import tires as crud

router = APIRouter()

# --- LECTURA ---


@router.get("/tires", response_model=List[schemas.TireResponse])
def read_tires(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtiene el inventario global de llantas con sus ubicaciones actuales"""
    return crud.get_tires(db, skip=skip, limit=limit)


@router.get("/tires/{tire_id}", response_model=schemas.TireResponse)
def read_tire(tire_id: int, db: Session = Depends(get_db)):
    """Obtiene detalle de una llanta específica y su historial completo"""
    tire = crud.get_tire(db, tire_id=tire_id)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return tire


# --- CREACIÓN ---


@router.post(
    "/tires", response_model=schemas.TireResponse, status_code=status.HTTP_201_CREATED
)
def create_tire(tire: schemas.TireCreate, db: Session = Depends(get_db)):
    """Da de alta una nueva llanta en el sistema (Stock inicial)"""
    # Validación simple de código duplicado (opcional, si el DB lanza error lo captura el middleware)
    existing = crud.get_tire_by_code(
        db, tire.codigo_interno
    )  # Asegúrate de tener este helper o captura IntegrityError
    if existing:
        raise HTTPException(status_code=400, detail="El Código Interno ya existe")
    return crud.create_tire(db, tire)


# --- ACCIONES OPERATIVAS ---


@router.post("/tires/{tire_id}/assign")
def assign_tire(
    tire_id: int, payload: schemas.AssignTirePayload, db: Session = Depends(get_db)
):
    """
    Asigna una llanta a una unidad (Montaje) o la envía a almacén (Desmontaje).
    Genera registro automático en historial.
    """
    try:
        tire = crud.assign_tire(db, tire_id=tire_id, payload=payload)
        if not tire:
            raise HTTPException(status_code=404, detail="Llanta no encontrada")
        return {"message": "Operación realizada con éxito", "id": tire.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tires/{tire_id}/maintenance")
def maintenance_tire(
    tire_id: int, payload: schemas.MaintenanceTirePayload, db: Session = Depends(get_db)
):
    """Registra mantenimiento, reparación, renovado o desecho"""
    tire = crud.register_maintenance(db, tire_id=tire_id, payload=payload)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return {"message": "Mantenimiento registrado", "id": tire.id}


# --- EDICIÓN Y ELIMINACIÓN (NUEVOS) ---


@router.put("/tires/{tire_id}", response_model=schemas.TireResponse)
def update_tire(
    tire_id: int, tire_in: schemas.TireUpdate, db: Session = Depends(get_db)
):
    """
    Actualiza datos generales de una llanta.
    Nota: No permite cambiar código interno ni historial para mantener integridad.
    """
    tire = crud.update_tire(db, tire_id=tire_id, tire_in=tire_in)
    if not tire:
        raise HTTPException(status_code=404, detail="Llanta no encontrada")
    return tire


@router.delete("/tires/{tire_id}")
def delete_tire(tire_id: int, db: Session = Depends(get_db)):
    """
    Elimina una llanta del sistema y su historial asociado.
    """
    success = crud.delete_tire(db, tire_id=tire_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Llanta no encontrada o error al eliminar"
        )
    return {"message": "Llanta eliminada correctamente"}
