"""
SQLAlchemy ORM Models for TMS
Mirrors TypeScript interfaces from frontend
"""

from datetime import date, datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Enum,
    Boolean,
    Text,
)
from sqlalchemy.orm import relationship
from database import Base

from sqlalchemy.dialects.postgresql import JSONB

# ============= ENUMS =============


class UnitType(str, PyEnum):
    SENCILLO = "sencillo"
    FULL = "full"
    RABON = "rabon"


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
    """
    Cliente principal - Entidad fiscal para facturación
    Relación: Client -> SubClients (One-to-Many)
    """

    __tablename__ = "clients"

    id = Column(String(50), primary_key=True)
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
    sub_clients = relationship(
        "SubClient", back_populates="client", cascade="all, delete-orphan"
    )
    trips = relationship("Trip", back_populates="client")


class SubClient(Base):
    """
    Subcliente/Destino - Ubicación de entrega del cliente
    Contiene la Matriz de Tarifas (relación con Tariff)
    """

    __tablename__ = "sub_clients"

    id = Column(String(50), primary_key=True)
    client_id = Column(String(50), ForeignKey("clients.id"), nullable=False)
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

    # Condiciones comerciales específicas del destino
    dias_credito = Column(Integer)
    requiere_contrato = Column(Boolean, default=False)
    convenio_especial = Column(Boolean, default=False)
    contrato_url = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="sub_clients")
    tariffs = relationship(
        "Tariff", back_populates="sub_client", cascade="all, delete-orphan"
    )
    trips = relationship("Trip", back_populates="sub_client")


class Tariff(Base):
    """
    Tarifa Autorizada - Precio pactado por Ruta + Tipo de Unidad
    Permite definir: "CDMX-Monterrey en Sencillo cuesta $28,500, en Full cuesta $42,000"
    """

    __tablename__ = "tariffs"

    id = Column(String(50), primary_key=True)
    sub_client_id = Column(String(50), ForeignKey("sub_clients.id"), nullable=False)
    nombre_ruta = Column(
        String(200), nullable=False
    )  # Ej: "CDMX - Monterrey (Vía Saltillo)"
    tipo_unidad = Column(Enum(UnitType), nullable=False)  # sencillo, full, rabon
    tarifa_base = Column(Float, nullable=False)  # Precio del flete pactado
    costo_casetas = Column(Float, default=0)  # Costo estimado de peajes
    moneda = Column(Enum(Currency), default=Currency.MXN)
    vigencia = Column(Date, nullable=False)  # Fecha hasta la cual se respeta el precio
    estatus = Column(Enum(TariffStatus), default=TariffStatus.ACTIVA)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sub_client = relationship("SubClient", back_populates="tariffs")
    trips = relationship("Trip", back_populates="tariff")


class Unit(Base):
    """
    Unidad/Tracto - Vehículo de la flota
    Status controla disponibilidad para despacho
    """

    __tablename__ = "units"

    id = Column(String(50), primary_key=True)
    numero_economico = Column(String(20), unique=True, nullable=False)  # Ej: TR-204
    placas = Column(String(15), unique=True, nullable=False)
    vin = Column(String(17))
    marca = Column(String(50), nullable=False)
    modelo = Column(String(50), nullable=False)
    year = Column(Integer)
    tipo = Column(Enum(UnitType), nullable=False)  # sencillo, full, rabon
    status = Column(Enum(UnitStatus), default=UnitStatus.DISPONIBLE)

    # Alertas de documentos
    documentos_vencidos = Column(Integer, default=0)
    llantas_criticas = Column(Integer, default=0)

    # Fechas de vencimiento de documentos clave
    seguro_vence = Column(Date)
    verificacion_vence = Column(Date)
    permiso_sct_vence = Column(Date)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trips = relationship("Trip", back_populates="unit")
    operators = relationship("Operator", back_populates="assigned_unit")


class Operator(Base):
    """
    Operador/Conductor - Con tracking de vencimientos
    Frontend usa getExpiryStatus() para alertas visuales
    """

    __tablename__ = "operators"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    license_type = Column(String(5), default="E")  # A, B, C, D, E
    license_expiry = Column(
        Date, nullable=False
    )  # CRÍTICO: Para alertas de vencimiento
    medical_check_expiry = Column(Date, nullable=False)  # Apto médico
    phone = Column(String(20))
    status = Column(Enum(OperatorStatus), default=OperatorStatus.ACTIVO)

    # Unidad asignada actualmente
    assigned_unit_id = Column(String(50), ForeignKey("units.id"), nullable=True)

    # Datos adicionales
    hire_date = Column(Date)
    emergency_contact = Column(String(100))
    emergency_phone = Column(String(20))

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_unit = relationship("Unit", back_populates="operators")
    trips = relationship("Trip", back_populates="operator")


class Trip(Base):
    """
    Viaje - Tabla central del TMS
    Registra cada servicio despachado con su estado y saldos
    """

    __tablename__ = "trips"

    id = Column(String(50), primary_key=True)

    # Relaciones principales
    client_id = Column(String(50), ForeignKey("clients.id"), nullable=False)
    sub_client_id = Column(String(50), ForeignKey("sub_clients.id"), nullable=False)
    unit_id = Column(String(50), ForeignKey("units.id"), nullable=False)
    operator_id = Column(String(50), ForeignKey("operators.id"), nullable=False)
    tariff_id = Column(String(50), ForeignKey("tariffs.id"), nullable=True)

    # Datos de ruta
    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    route_name = Column(String(200))

    # Estado del viaje
    status = Column(Enum(TripStatus), default=TripStatus.CREADO)

    # Financiero - Modelo: Tarifa - Anticipos = Saldo Operador
    tarifa_base = Column(Float, nullable=False)  # Precio del flete
    costo_casetas = Column(Float, default=0)
    anticipo_casetas = Column(Float, default=0)
    anticipo_viaticos = Column(Float, default=0)
    anticipo_combustible = Column(Float, default=0)
    otros_anticipos = Column(Float, default=0)
    saldo_operador = Column(Float, default=0)  # Calculado: tarifa - anticipos

    # Fechas
    start_date = Column(DateTime, nullable=False)
    estimated_arrival = Column(DateTime)
    actual_arrival = Column(DateTime)
    closed_at = Column(DateTime)

    # Tracking
    last_update = Column(DateTime, default=datetime.utcnow)
    last_location = Column(String(200))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="trips")
    sub_client = relationship("SubClient", back_populates="trips")
    unit = relationship("Unit", back_populates="trips")
    operator = relationship("Operator", back_populates="trips")
    tariff = relationship("Tariff", back_populates="trips")
    timeline_events = relationship(
        "TripTimelineEvent", back_populates="trip", cascade="all, delete-orphan"
    )


class TripTimelineEvent(Base):
    """
    Eventos del timeline de un viaje
    Checkpoint, Alert, Info
    """

    __tablename__ = "trip_timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String(50), ForeignKey("trips.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    event = Column(String(500), nullable=False)
    event_type = Column(String(20), default="info")  # checkpoint, alert, info
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    trip = relationship("Trip", back_populates="timeline_events")


# ============= SYSTEM & SECURITY MODELS =============


class Role(Base):
    """
    Roles del sistema con matriz de permisos flexible.
    Ej: permissions = {
        "flota": {"read": true, "write": false},
        "finanzas": {"read": true, "write": true}
    }
    """

    __tablename__ = "roles"

    id = Column(String(50), primary_key=True)  # Ej: "admin", "gerente", "chofer"
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(200))
    # Usamos JSONB para búsquedas rápidas de permisos en Postgres
    permisos = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relación inversa
    users = relationship("User", back_populates="role")


class User(Base):
    """
    Usuarios administrativos del sistema (Dashboard access).
    """

    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)

    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    telefono = Column(String(20))
    puesto = Column(String(100))
    avatar_url = Column(String(500))

    role_id = Column(String(50), ForeignKey("roles.id"))
    activo = Column(Boolean, default=True)

    # Preferencias visuales (Dark mode, idioma, notificaciones)
    preferencias = Column(
        JSONB, default=lambda: {"theme": "system", "notifications": True}
    )

    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    role = relationship("Role", back_populates="users")


class SystemConfig(Base):
    """
    Tabla Key-Value para configuraciones globales.
    Evita tener que alterar la DB para cambiar parámetros simples.
    """

    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True)  # Ej: "empresa.rfc", "smtp.host"
    value = Column(Text)
    grupo = Column(String(50))  # Ej: "general", "legal", "notificaciones"
    tipo = Column(String(20), default="string")  # "string", "boolean", "int"
    is_public = Column(Boolean, default=False)  # Si es visible sin login
