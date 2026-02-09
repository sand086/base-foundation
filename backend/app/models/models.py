"""
SQLAlchemy ORM Models for TMS - REFACTORED FOR AUTO-INCREMENT (FINAL FIX)
"""
import uuid
from datetime import date, datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, func, Text, Boolean, Float, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.dialects.postgresql import JSONB

# ============= ENUMS =============
class UnitType(str, PyEnum):
    SENCILLO = "sencillo"
    FULL = "full"
    RABON = "rabon"
    TRACTOCAMION = "tractocamion"
    REMOLQUE = "remolque"
    CAMIONETA = "camioneta"
    CAMION = "camion"
    OTRO = "otro"

class Currency(str, PyEnum):
    MXN = "MXN"
    USD = "USD"

class UnitStatus(str, PyEnum):
    DISPONIBLE = "disponible"
    EN_RUTA = "en_ruta"
    MANTENIMIENTO = "mantenimiento"
    BLOQUEADO = "bloqueado"

class OperatorStatus(str, PyEnum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    VACACIONES = "vacaciones"
    INCAPACIDAD = "incapacidad"

class TripStatus(str, PyEnum):
    CREADO = "creado"
    EN_TRANSITO = "en_transito"
    DETENIDO = "detenido"
    RETRASO = "retraso"
    ENTREGADO = "entregado"
    CERRADO = "cerrado"
    ACCIDENTE = "accidente"

class ClientStatus(str, PyEnum):
    ACTIVO = "activo"
    PENDIENTE = "pendiente"
    INCOMPLETO = "incompleto"

class TariffStatus(str, PyEnum):
    ACTIVA = "activa"
    VENCIDA = "vencida"
    POR_VENCER = "por_vencer"

class OperationType(str, PyEnum):
    IMPORTACION = "importación"
    EXPORTACION = "exportación"
    NACIONAL = "nacional"

# ============= MODELS =============

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=True) 

    razon_social = Column(String(200), nullable=False)
    rfc = Column(String(13), unique=True, nullable=False)
    regimen_fiscal = Column(String(10))
    uso_cfdi = Column(String(10))
    contacto_principal = Column(String(100))
    telefono = Column(String(20))
    email = Column(String(100))
    direccion_fiscal = Column(Text)
    codigo_postal_fiscal = Column(String(10))
    estatus = Column(Enum(ClientStatus), default=ClientStatus.PENDIENTE)
    contrato_url = Column(String(500))
    dias_credito = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sub_clients = relationship("SubClient", back_populates="client", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="client")


class SubClient(Base):
    __tablename__ = "sub_clients"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    nombre = Column(String(200), nullable=False)
    alias = Column(String(100))
    direccion = Column(Text, nullable=False)
    ciudad = Column(String(100), nullable=False)
    estado = Column(String(100), nullable=False)
    codigo_postal = Column(String(10))
    tipo_operacion = Column(Enum(OperationType), default=OperationType.NACIONAL)
    contacto = Column(String(100))
    telefono = Column(String(20))
    horario_recepcion = Column(String(50))
    estatus = Column(String(20), default="activo")
    dias_credito = Column(Integer)
    requiere_contrato = Column(Boolean, default=False)
    convenio_especial = Column(Boolean, default=False)
    contrato_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="sub_clients")
    tariffs = relationship("Tariff", back_populates="sub_client", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="sub_client")


class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, index=True)
    sub_client_id = Column(Integer, ForeignKey("sub_clients.id"), nullable=False)
    
    nombre_ruta = Column(String(200), nullable=False)
    tipo_unidad = Column(Enum(UnitType), nullable=False)
    tarifa_base = Column(Float, nullable=False)
    costo_casetas = Column(Float, default=0)
    moneda = Column(Enum(Currency), default=Currency.MXN)
    vigencia = Column(Date, nullable=False)
    estatus = Column(Enum(TariffStatus), default=TariffStatus.ACTIVA)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sub_client = relationship("SubClient", back_populates="tariffs")
    trips = relationship("Trip", back_populates="tariff")


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=False, index=True)
    
    numero_economico = Column(String(20), unique=True, nullable=False)
    placas = Column(String(15), unique=True, nullable=False)
    vin = Column(String(17))
    marca = Column(String(50), nullable=False)
    modelo = Column(String(50), nullable=False)
    year = Column(Integer)
    tipo = Column(Enum(UnitType), nullable=False)
    tipo_1 = Column(String(50))
    tipo_carga = Column(String(50))
    numero_serie_motor = Column(String, nullable=True)
    marca_motor = Column(String, nullable=True)
    capacidad_carga = Column(Float, nullable=True)
    status = Column(Enum(UnitStatus), default=UnitStatus.DISPONIBLE)
    documentos_vencidos = Column(Integer, default=0)
    llantas_criticas = Column(Integer, default=0)
    seguro_vence = Column(Date, nullable=True)
    verificacion_humo_vence = Column(Date, nullable=True)
    verificacion_fisico_mecanica_vence = Column(Date, nullable=True)
    verificacion_vence = Column(Date, nullable=True)
    permiso_sct_vence = Column(Date, nullable=True)
    tarjeta_circulacion_url = Column(String(500), nullable=True)
    permiso_doble_articulado_url = Column(String(500), nullable=True)
    poliza_seguro_url = Column(String(500), nullable=True)
    verificacion_humo_url = Column(String(500), nullable=True)
    verificacion_fisico_mecanica_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trips = relationship("Trip", back_populates="unit")
    operators = relationship("Operator", back_populates="assigned_unit")
    tires = relationship("Tire", back_populates="unit", cascade="all, delete-orphan")


class Tire(Base):
    __tablename__ = "tires"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    
    position = Column(String(20), nullable=False)
    tire_id = Column(String(50))
    marca = Column(String(50))
    modelo = Column(String(50))
    profundidad = Column(Float, default=0.0)
    presion = Column(Float, default=0.0)
    estado = Column(String(20), default="bueno")
    renovado = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    unit = relationship("Unit", back_populates="tires")


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=True)

    name = Column(String(100), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    license_type = Column(String(5), default="E")
    license_expiry = Column(Date, nullable=False)
    medical_check_expiry = Column(Date, nullable=False)
    phone = Column(String(20))
    status = Column(Enum(OperatorStatus), default=OperatorStatus.ACTIVO)
    assigned_unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    hire_date = Column(Date)
    emergency_contact = Column(String(100))
    emergency_phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

    assigned_unit = relationship("Unit", back_populates="operators")
    trips = relationship("Trip", back_populates="operator")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    sub_client_id = Column(Integer, ForeignKey("sub_clients.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    tariff_id = Column(Integer, ForeignKey("tariffs.id"), nullable=True)

    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    route_name = Column(String(200))
    status = Column(Enum(TripStatus), default=TripStatus.CREADO)
    tarifa_base = Column(Float, nullable=False)
    costo_casetas = Column(Float, default=0)
    anticipo_casetas = Column(Float, default=0)
    anticipo_viaticos = Column(Float, default=0)
    anticipo_combustible = Column(Float, default=0)
    otros_anticipos = Column(Float, default=0)
    saldo_operador = Column(Float, default=0)
    start_date = Column(DateTime, nullable=False)
    estimated_arrival = Column(DateTime)
    actual_arrival = Column(DateTime)
    closed_at = Column(DateTime)
    last_update = Column(DateTime, default=datetime.utcnow)
    last_location = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="trips")
    sub_client = relationship("SubClient", back_populates="trips")
    unit = relationship("Unit", back_populates="trips")
    operator = relationship("Operator", back_populates="trips")
    tariff = relationship("Tariff", back_populates="trips")
    timeline_events = relationship("TripTimelineEvent", back_populates="trip", cascade="all, delete-orphan")


class TripTimelineEvent(Base):
    __tablename__ = "trip_timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    event = Column(String(500), nullable=False)
    event_type = Column(String(20), default="info")
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="timeline_events")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name_key = Column(String(50), unique=True, nullable=False) # admin, operative
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(200))
    permisos = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    telefono = Column(String(20))
    puesto = Column(String(100))
    avatar_url = Column(String(500))
    
    role_id = Column(Integer, ForeignKey("roles.id"))
    
    activo = Column(Boolean, default=True)
    preferencias = Column(JSONB, default=lambda: {"theme": "system", "notifications": True})
    two_factor_secret = Column(String(32), nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    role = relationship("Role", back_populates="users")


class SystemConfig(Base):
    __tablename__ = "system_configs"
    key = Column(String(100), primary_key=True)
    value = Column(Text)
    grupo = Column(String(50))
    tipo = Column(String(20), default="string")
    is_public = Column(Boolean, default=False)


class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(200), nullable=False)
    rfc = Column(String(13), unique=True, nullable=False)
    email = Column(String(100))
    telefono = Column(String(20))
    direccion = Column(Text)
    dias_credito = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class BulkUploadHistory(Base):
    __tablename__ = "bulk_upload_history"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    stored_filename = Column(String(255))
    file_path = Column(String(500))
    upload_type = Column(String(50))
    status = Column(String(20))
    record_count = Column(Integer, default=0)
    
    # CORRECCIÓN: Definir tipo DateTime explícito y usar default
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User")