from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.models.models import Client, Operator, Unit

router = APIRouter(tags=["Utilities"])

#  DICCIONARIO DE SEGURIDAD (WHITELIST)
# Solo permitimos validar estas tablas y las conectamos a su Modelo real de SQLAlchemy
ALLOWED_MODELS = {
    "clients": Client,
    "operators": Operator,
    "units": Unit,
    # "units": Unit, etc...
}


class ValidationResponse(BaseModel):
    is_valid: bool
    error: Optional[str] = None


@router.get("/validate-field", response_model=ValidationResponse)
def validate_dynamic_field(
    table: str = Query(..., description="Nombre de la tabla permitida"),
    field: str = Query(..., description="Nombre de la columna"),
    value: str = Query(..., description="Valor a validar"),
    exclude_id: Optional[int] = Query(
        None, description="ID a ignorar (útil al editar)"
    ),
    db: Session = Depends(get_db),
):
    # 1. Seguridad: Verificar que la tabla existe en la Whitelist
    if table not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400, detail="Tabla no permitida para validación"
        )

    model = ALLOWED_MODELS[table]

    # 2. Seguridad: Verificar que la columna existe en el modelo
    if not hasattr(model, field):
        raise HTTPException(status_code=400, detail="La columna especificada no existe")

    column = getattr(model, field)

    # 3. Validación de Longitud (Dinámica desde el modelo SQLAlchemy)
    col_type = getattr(column, "type", None)
    if col_type and hasattr(col_type, "length") and col_type.length:
        if len(value) > col_type.length:
            return ValidationResponse(
                is_valid=False,
                error=f"Supera la longitud máxima de {col_type.length} caracteres.",
            )

    # 4. Validación de Duplicados (Unicidad)
    query = db.query(model).filter(column == value)

    # Si estamos editando, ignoramos el ID del registro actual para que no choque consigo mismo
    if exclude_id:
        query = query.filter(model.id != exclude_id)

    exists = query.first()

    if exists:
        return ValidationResponse(
            is_valid=False, error="Este valor ya está registrado y no puede duplicarse."
        )

    # Si pasa todo...
    return ValidationResponse(is_valid=True, error=None)
