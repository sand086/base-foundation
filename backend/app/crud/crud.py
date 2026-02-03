"""
CRUD Operations for TMS
Business logic and database operations
"""

from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

import backend.app.models.models as models
import schemas


# ============= HELPER FUNCTIONS =============


def get_expiry_status(expiry_date: date) -> str:
    """
    Calcula el estado de vencimiento - misma lógica que el frontend
    Returns: 'danger' (vencido), 'warning' (próximo), 'success' (vigente)
    """
    if not expiry_date:
        return "danger"

    today = date.today()
    days_until = (expiry_date - today).days

    if days_until < 0:
        return "danger"  # Vencido
    elif days_until <= 30:
        return "warning"  # Por vencer
    return "success"  # Vigente


def calculate_saldo_operador(trip_data: schemas.TripCreate) -> float:
    """Calcula: Tarifa - (Anticipos) = Saldo"""
    total_anticipos = (
        trip_data.anticipo_casetas
        + trip_data.anticipo_viaticos
        + trip_data.anticipo_combustible
        + trip_data.otros_anticipos
    )
    return trip_data.tarifa_base - total_anticipos


# ============= CLIENT CRUD =============


def get_clients(db: Session, skip: int = 0, limit: int = 100) -> List[models.Client]:
    """
    Obtiene clientes con eager loading de subclientes y tarifas
    Optimizado para evitar N+1 queries
    """
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_client(db: Session, client_id: str) -> Optional[models.Client]:
    """Obtiene un cliente por ID con todas sus relaciones"""
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .filter(models.Client.id == client_id)
        .first()
    )


def create_client(db: Session, client: schemas.ClientCreate) -> models.Client:
    """Crea cliente con subclientes y tarifas anidadas"""
    # Crear cliente
    db_client = models.Client(
        id=client.id,
        razon_social=client.razon_social,
        rfc=client.rfc,
        regimen_fiscal=client.regimen_fiscal,
        uso_cfdi=client.uso_cfdi,
        contacto_principal=client.contacto_principal,
        telefono=client.telefono,
        email=client.email,
        direccion_fiscal=client.direccion_fiscal,
        codigo_postal_fiscal=client.codigo_postal_fiscal,
        estatus=client.estatus,
        dias_credito=client.dias_credito,
    )
    db.add(db_client)

    # Crear subclientes con tarifas
    for sub in client.sub_clients:
        db_sub = models.SubClient(
            id=sub.id,
            client_id=client.id,
            nombre=sub.nombre,
            alias=sub.alias,
            direccion=sub.direccion,
            ciudad=sub.ciudad,
            estado=sub.estado,
            codigo_postal=sub.codigo_postal,
            tipo_operacion=sub.tipo_operacion,
            contacto=sub.contacto,
            telefono=sub.telefono,
            horario_recepcion=sub.horario_recepcion,
            estatus=sub.estatus,
            dias_credito=sub.dias_credito,
            requiere_contrato=sub.requiere_contrato,
            convenio_especial=sub.convenio_especial,
        )
        db.add(db_sub)

        # Crear tarifas del subcliente
        for tariff in sub.tariffs:
            db_tariff = models.Tariff(
                id=tariff.id,
                sub_client_id=sub.id,
                nombre_ruta=tariff.nombre_ruta,
                tipo_unidad=tariff.tipo_unidad,
                tarifa_base=tariff.tarifa_base,
                costo_casetas=tariff.costo_casetas,
                moneda=tariff.moneda,
                vigencia=tariff.vigencia,
                estatus=tariff.estatus,
            )
            db.add(db_tariff)

    db.commit()
    db.refresh(db_client)
    return db_client


# ============= UNIT CRUD =============


def get_units(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    tipo: Optional[str] = None,
) -> List[models.Unit]:
    """
    Obtiene unidades con filtros opcionales
    Regla de negocio: Para despacho, filtrar por status='disponible' y tipo
    """
    query = db.query(models.Unit)

    if status:
        query = query.filter(models.Unit.status == status)
    if tipo:
        query = query.filter(models.Unit.tipo == tipo)

    return query.offset(skip).limit(limit).all()


def get_available_units_for_dispatch(
    db: Session, unit_type: Optional[str] = None
) -> List[dict]:
    """
    Obtiene unidades disponibles para despacho
    Regla: status='disponible' AND documentos_vencidos=0
    """
    query = db.query(models.Unit).filter(
        and_(
            models.Unit.status == models.UnitStatus.DISPONIBLE,
            models.Unit.documentos_vencidos == 0,
        )
    )

    if unit_type:
        query = query.filter(models.Unit.tipo == unit_type)

    units = query.all()

    result = []
    for unit in units:
        result.append(
            {
                "id": unit.id,
                "numero_economico": unit.numero_economico,
                "marca": unit.marca,
                "modelo": unit.modelo,
                "tipo": unit.tipo,
                "status": unit.status,
                "documentos_vencidos": unit.documentos_vencidos,
                "is_blocked": False,
                "block_reason": None,
            }
        )

    return result


def get_unit(db: Session, unit_id: str) -> Optional[models.Unit]:
    return db.query(models.Unit).filter(models.Unit.id == unit_id).first()


def create_unit(db: Session, unit: schemas.UnitCreate) -> models.Unit:
    db_unit = models.Unit(**unit.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


def update_unit_status(db: Session, unit_id: str, status: str) -> Optional[models.Unit]:
    """Actualiza el status de una unidad (ej: al despachar pasa a 'en_ruta')"""
    db_unit = get_unit(db, unit_id)
    if db_unit:
        db_unit.status = status
        db_unit.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_unit)
    return db_unit


# ============= OPERATOR CRUD =============


def get_operators(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    include_expired: bool = True,
) -> List[dict]:
    """
    Obtiene operadores con estados de vencimiento calculados
    Incluye days_until_license_expiry para alertas del frontend
    """
    query = db.query(models.Operator)

    if status:
        query = query.filter(models.Operator.status == status)

    operators = query.offset(skip).limit(limit).all()

    result = []
    today = date.today()

    for op in operators:
        license_days = (op.license_expiry - today).days if op.license_expiry else -999
        medical_days = (
            (op.medical_check_expiry - today).days if op.medical_check_expiry else -999
        )

        # Skip expired if not including them (para despacho)
        if not include_expired and (license_days < 0 or medical_days < 0):
            continue

        result.append(
            {
                "id": op.id,
                "name": op.name,
                "license_number": op.license_number,
                "license_type": op.license_type,
                "license_expiry": op.license_expiry,
                "medical_check_expiry": op.medical_check_expiry,
                "phone": op.phone,
                "status": op.status,
                "assigned_unit_id": op.assigned_unit_id,
                "hire_date": op.hire_date,
                "emergency_contact": op.emergency_contact,
                "emergency_phone": op.emergency_phone,
                "created_at": op.created_at,
                # Campos calculados
                "license_status": get_expiry_status(op.license_expiry),
                "medical_status": get_expiry_status(op.medical_check_expiry),
                "days_until_license_expiry": license_days,
                "days_until_medical_expiry": medical_days,
            }
        )

    return result


def get_operator(db: Session, operator_id: str) -> Optional[models.Operator]:
    return db.query(models.Operator).filter(models.Operator.id == operator_id).first()


def create_operator(db: Session, operator: schemas.OperatorCreate) -> models.Operator:
    db_operator = models.Operator(**operator.model_dump())
    db.add(db_operator)
    db.commit()
    db.refresh(db_operator)
    return db_operator


# ============= TRIP CRUD =============


def get_trips(
    db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None
) -> List[dict]:
    """
    Obtiene viajes para el Centro de Monitoreo
    Incluye nombres de cliente, unidad y operador
    """
    query = db.query(models.Trip).options(
        joinedload(models.Trip.client),
        joinedload(models.Trip.unit),
        joinedload(models.Trip.operator),
        joinedload(models.Trip.timeline_events),
    )

    if status:
        query = query.filter(models.Trip.status == status)

    trips = (
        query.order_by(models.Trip.start_date.desc()).offset(skip).limit(limit).all()
    )

    result = []
    for trip in trips:
        result.append(
            {
                "id": trip.id,
                "client_id": trip.client_id,
                "client_name": trip.client.razon_social if trip.client else None,
                "sub_client_id": trip.sub_client_id,
                "unit_id": trip.unit_id,
                "unit_number": trip.unit.numero_economico if trip.unit else None,
                "operator_id": trip.operator_id,
                "operator_name": trip.operator.name if trip.operator else None,
                "origin": trip.origin,
                "destination": trip.destination,
                "route_name": trip.route_name,
                "status": trip.status,
                "tarifa_base": trip.tarifa_base,
                "costo_casetas": trip.costo_casetas,
                "anticipo_casetas": trip.anticipo_casetas,
                "anticipo_viaticos": trip.anticipo_viaticos,
                "anticipo_combustible": trip.anticipo_combustible,
                "saldo_operador": trip.saldo_operador,
                "start_date": trip.start_date,
                "estimated_arrival": trip.estimated_arrival,
                "last_update": trip.last_update,
                "last_location": trip.last_location,
                "timeline_events": [
                    {
                        "id": evt.id,
                        "time": evt.time,
                        "event": evt.event,
                        "event_type": evt.event_type,
                    }
                    for evt in trip.timeline_events
                ],
            }
        )

    return result


def create_trip(db: Session, trip: schemas.TripCreate) -> models.Trip:
    """
    Crea un viaje con validaciones de negocio:
    1. Unidad debe estar disponible
    2. Operador debe estar activo
    3. Calcula saldo_operador automáticamente
    """
    # Validar unidad disponible
    unit = get_unit(db, trip.unit_id)
    if not unit:
        raise ValueError(f"Unidad {trip.unit_id} no encontrada")
    if unit.status != models.UnitStatus.DISPONIBLE:
        raise ValueError(
            f"Unidad {unit.numero_economico} no está disponible (status: {unit.status})"
        )
    if unit.documentos_vencidos > 0:
        raise ValueError(
            f"Unidad {unit.numero_economico} tiene {unit.documentos_vencidos} documentos vencidos"
        )

    # Validar operador activo
    operator = get_operator(db, trip.operator_id)
    if not operator:
        raise ValueError(f"Operador {trip.operator_id} no encontrado")
    if operator.status != models.OperatorStatus.ACTIVO:
        raise ValueError(
            f"Operador {operator.name} no está activo (status: {operator.status})"
        )

    # Calcular saldo
    saldo = calculate_saldo_operador(trip)

    # Crear viaje
    db_trip = models.Trip(
        id=trip.id,
        client_id=trip.client_id,
        sub_client_id=trip.sub_client_id,
        unit_id=trip.unit_id,
        operator_id=trip.operator_id,
        tariff_id=trip.tariff_id,
        origin=trip.origin,
        destination=trip.destination,
        route_name=trip.route_name,
        status=trip.status,
        tarifa_base=trip.tarifa_base,
        costo_casetas=trip.costo_casetas,
        anticipo_casetas=trip.anticipo_casetas,
        anticipo_viaticos=trip.anticipo_viaticos,
        anticipo_combustible=trip.anticipo_combustible,
        otros_anticipos=trip.otros_anticipos,
        saldo_operador=saldo,
        start_date=trip.start_date,
        estimated_arrival=trip.estimated_arrival,
    )
    db.add(db_trip)

    # Actualizar status de unidad a 'en_ruta'
    unit.status = models.UnitStatus.EN_RUTA
    unit.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_trip)
    return db_trip


def update_trip_status(
    db: Session, trip_id: str, status: str, location: Optional[str] = None
) -> Optional[models.Trip]:
    """Actualiza status del viaje y agrega evento al timeline"""
    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()

    if db_trip:
        old_status = db_trip.status
        db_trip.status = status
        db_trip.last_update = datetime.utcnow()

        if location:
            db_trip.last_location = location

        # Si se cierra el viaje, liberar la unidad
        if status in [models.TripStatus.ENTREGADO, models.TripStatus.CERRADO]:
            db_trip.closed_at = datetime.utcnow()
            if db_trip.unit:
                db_trip.unit.status = models.UnitStatus.DISPONIBLE

        # Agregar evento al timeline
        event = models.TripTimelineEvent(
            trip_id=trip_id,
            time=datetime.utcnow(),
            event=f"Status cambiado de {old_status} a {status}"
            + (f" - {location}" if location else ""),
            event_type=(
                "checkpoint" if status == models.TripStatus.ENTREGADO else "info"
            ),
        )
        db.add(event)

        db.commit()
        db.refresh(db_trip)

    return db_trip
