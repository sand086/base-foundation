"""
FastAPI Main Application for TMS
RESTful API endpoints
"""
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import crud
from database import engine, get_db
from auth import router as auth_router

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rápidos 3T - TMS API",
    description="Sistema de Gestión de Transporte - Backend API",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication router
app.include_router(auth_router)


# ============= HEALTH CHECK =============

@app.get("/")
def root():
    return {"status": "ok", "service": "TMS API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ============= CLIENTS =============

@app.get("/clientes", response_model=List[schemas.ClientResponse])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Lista clientes con subclientes y tarifas (eager loading)"""
    return crud.get_clients(db, skip=skip, limit=limit)


@app.get("/clientes/{client_id}", response_model=schemas.ClientResponse)
def get_client(client_id: str, db: Session = Depends(get_db)):
    """Obtiene un cliente específico con todas sus relaciones"""
    client = crud.get_client(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@app.post("/clientes", response_model=schemas.ClientResponse, status_code=201)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    """Crea un cliente con subclientes y tarifas anidadas"""
    # Check RFC único
    existing = db.query(models.Client).filter(models.Client.rfc == client.rfc).first()
    if existing:
        raise HTTPException(status_code=400, detail="RFC ya registrado")
    
    return crud.create_client(db, client)


# ============= FLEET / UNITS =============

@app.get("/flota/unidades", response_model=List[schemas.UnitResponse])
def list_units(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista unidades con filtros opcionales"""
    return crud.get_units(db, skip=skip, limit=limit, status=status, tipo=tipo)


@app.get("/flota/unidades/disponibles")
def list_available_units(
    tipo: Optional[str] = Query(None, description="Filtrar por tipo: sencillo, full, rabon"),
    db: Session = Depends(get_db)
):
    """
    Lista unidades disponibles para despacho
    Regla: status='disponible' AND documentos_vencidos=0
    """
    return crud.get_available_units_for_dispatch(db, unit_type=tipo)


@app.get("/flota/unidades/{unit_id}", response_model=schemas.UnitResponse)
def get_unit(unit_id: str, db: Session = Depends(get_db)):
    unit = crud.get_unit(db, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return unit


@app.post("/flota/unidades", response_model=schemas.UnitResponse, status_code=201)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    # Check numero economico único
    existing = db.query(models.Unit).filter(
        models.Unit.numero_economico == unit.numero_economico
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Número económico ya registrado")
    
    return crud.create_unit(db, unit)


@app.patch("/flota/unidades/{unit_id}/status")
def update_unit_status(
    unit_id: str, 
    status: str = Query(..., description="Nuevo status: disponible, en_ruta, mantenimiento, bloqueado"),
    db: Session = Depends(get_db)
):
    """Actualiza el status de una unidad"""
    unit = crud.update_unit_status(db, unit_id, status)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"message": "Status actualizado", "unit_id": unit_id, "new_status": status}


# ============= OPERATORS =============

@app.get("/flota/operadores")
def list_operators(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    include_expired: bool = Query(True, description="Incluir operadores con documentos vencidos"),
    db: Session = Depends(get_db)
):
    """
    Lista operadores con estados de vencimiento calculados
    Incluye: license_status, medical_status, days_until_*_expiry
    """
    return crud.get_operators(db, skip=skip, limit=limit, status=status, include_expired=include_expired)


@app.get("/flota/operadores/{operator_id}")
def get_operator(operator_id: str, db: Session = Depends(get_db)):
    operator = crud.get_operator(db, operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return operator


@app.post("/flota/operadores", status_code=201)
def create_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    # Check licencia única
    existing = db.query(models.Operator).filter(
        models.Operator.license_number == operator.license_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Número de licencia ya registrado")
    
    return crud.create_operator(db, operator)


# ============= TRIPS =============

@app.get("/viajes")
def list_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lista viajes para Centro de Monitoreo
    Incluye: client_name, unit_number, operator_name, timeline_events
    """
    return crud.get_trips(db, skip=skip, limit=limit, status=status)


@app.post("/viajes", status_code=201)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    """
    Crea un viaje nuevo
    Validaciones:
    - Unidad debe estar disponible y sin documentos vencidos
    - Operador debe estar activo
    - Calcula saldo_operador automáticamente
    """
    try:
        return crud.create_trip(db, trip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/viajes/{trip_id}/status")
def update_trip_status(
    trip_id: str,
    status: str = Query(..., description="Nuevo status"),
    location: Optional[str] = Query(None, description="Ubicación actual"),
    db: Session = Depends(get_db)
):
    """
    Actualiza status del viaje
    Si se cierra (entregado/cerrado), libera la unidad automáticamente
    """
    trip = crud.update_trip_status(db, trip_id, status, location)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return {"message": "Status actualizado", "trip_id": trip_id, "new_status": status}


# ============= TARIFFS (Utility) =============

@app.get("/tarifas/por-subcliente/{sub_client_id}")
def get_tariffs_by_subclient(sub_client_id: str, db: Session = Depends(get_db)):
    """Obtiene tarifas autorizadas de un subcliente específico"""
    tariffs = db.query(models.Tariff).filter(
        models.Tariff.sub_client_id == sub_client_id
    ).all()
    return tariffs


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
