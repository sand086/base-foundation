"""
SQLAlchemy ORM Models for TMS
- Postgres ready
- AuditMixin estandarizado (record_status, created_at, updated_at, created_by_id, updated_by_id)
- sin created_at/updated_at manuales repetidos
- Enum names alineados a los tipos existentes en Postgres.
"""

from __future__ import annotations

from datetime import date
from enum import Enum as PyEnum
from sqlalchemy import Enum as SAEnum
from typing import List, Optional, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Date,
    Text,
    Boolean,
    Float,
    Enum,
    Index,
    func,
)
from sqlalchemy.orm import relationship, declarative_mixin, declared_attr
from sqlalchemy.dialects.postgresql import JSONB, DOUBLE_PRECISION

from app.db.database import Base


# =========================================================
# ENUMS
# =========================================================


def pg_enum(py_enum, pg_name: str):
    return SAEnum(
        py_enum,
        name=pg_name,
        native_enum=True,
        create_type=False,
        values_callable=lambda e: [x.value for x in e],
    )


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
    BLOQUEADO = "bloqueado"


class TripLegType(str, PyEnum):
    CARGA = "carga_muelle"  # Fase 1: Patio -> Muelle -> Patio (Drop)
    RUTA = "ruta_carretera"  # Fase 2: Patio -> Destino -> Patio (Drop)
    VACIO = "entrega_vacio"  # Fase 3: Patio -> Muelle (Fin)


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


class TireStatus(str, PyEnum):
    NUEVO = "nuevo"
    USADO = "usado"
    RENOVADO = "renovado"
    DESECHO = "desecho"


class TireCondition(str, PyEnum):
    BUENA = "buena"
    REGULAR = "regular"
    MALA = "mala"


class TireEventType(str, PyEnum):
    COMPRA = "compra"
    MONTAJE = "montaje"
    DESMONTAJE = "desmontaje"
    REPARACION = "reparacion"
    RENOVADO = "renovado"
    ROTACION = "rotacion"
    INSPECCION = "inspeccion"
    DESECHO = "desecho"


class WorkOrderStatus(str, PyEnum):
    ABIERTA = "abierta"
    EN_PROGRESO = "en_progreso"
    CERRADA = "cerrada"
    CANCELADA = "cancelada"


class InventoryCategory(str, PyEnum):
    MOTOR = "motor"
    FRENOS = "frenos"
    ELECTRICO = "eléctrico"
    SUSPENSION = "suspensión"
    TRANSMISION = "transmisión"
    GENERAL = "general"


class SupplierStatus(str, PyEnum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    SUSPENDIDO = "suspendido"


class InvoiceStatus(str, PyEnum):
    PENDIENTE = "pendiente"
    PAGO_PARCIAL = "pago_parcial"
    PAGADO = "pagado"
    CANCELADO = "cancelado"


class RecordStatus(str, PyEnum):
    ACTIVO = "A"
    INACTIVO = "I"
    ELIMINADO = "E"


class PaymentMethod(str, PyEnum):
    TAG = "TAG"
    EFECTIVO = "EFECTIVO"
    AMBOS = "AMBOS"


class TollUnitType(str, PyEnum):
    EJES_5 = "5ejes"
    EJES_9 = "9ejes"


# =========================================================
# MIXINS
# =========================================================


@declarative_mixin
class AuditMixin:
    record_status = Column(
        pg_enum(RecordStatus, "recordstatus"),
        nullable=False,
        server_default=RecordStatus.ACTIVO.value,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=func.now(),
    )

    created_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    @declared_attr
    def created_by(cls):
        return relationship("User", foreign_keys=[cls.created_by_id], lazy="joined")

    @declared_attr
    def updated_by(cls):
        return relationship("User", foreign_keys=[cls.updated_by_id], lazy="joined")


# =========================================================
# MODELS
# =========================================================


class Client(AuditMixin, Base):
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

    estatus = Column(
        pg_enum(ClientStatus, "clientstatus"), default=ClientStatus.PENDIENTE
    )

    dias_credito = Column(Integer, default=0)
    contrato_url = Column(String(500))

    sub_clients = relationship(
        "SubClient", back_populates="client", cascade="all, delete-orphan"
    )
    trips = relationship("Trip", back_populates="client")
    document_history = relationship(
        "ClientDocumentHistory", back_populates="client", cascade="all, delete-orphan"
    )


class SubClient(AuditMixin, Base):
    __tablename__ = "sub_clients"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )

    nombre = Column(String(200), nullable=False)
    alias = Column(String(100))
    direccion = Column(Text, nullable=False)
    ciudad = Column(String(100), nullable=False)
    estado = Column(String(100), nullable=False)
    codigo_postal = Column(String(10))

    tipo_operacion = Column(
        pg_enum(OperationType, "operationtype"), default=OperationType.NACIONAL
    )

    contacto = Column(String(100))
    telefono = Column(String(20))
    horario_recepcion = Column(String(50))
    estatus = Column(String(20), default="activo")
    dias_credito = Column(Integer)
    requiere_contrato = Column(Boolean, default=False)
    convenio_especial = Column(Boolean, default=False)
    contrato_url = Column(String(500))

    client = relationship("Client", back_populates="sub_clients")
    tariffs = relationship(
        "Tariff", back_populates="sub_client", cascade="all, delete-orphan"
    )
    trips = relationship("Trip", back_populates="sub_client")


class Tariff(AuditMixin, Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, index=True)
    sub_client_id = Column(
        Integer, ForeignKey("sub_clients.id", ondelete="CASCADE"), nullable=False
    )

    rate_template_id = Column(
        Integer, ForeignKey("rate_templates.id", ondelete="SET NULL"), nullable=True
    )

    nombre_ruta = Column(String(200), nullable=False)
    tipo_unidad = Column(pg_enum(UnitType, "unittype"), nullable=False)
    tarifa_base = Column(Float, nullable=False, default=0.0)

    iva_porcentaje = Column(Float, default=16.0)
    retencion_porcentaje = Column(Float, default=4.0)
    distancia_km = Column(Float, default=0.0)

    costo_casetas = Column(Float, default=0)
    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    vigencia = Column(Date, nullable=False)
    estatus = Column(pg_enum(TariffStatus, "tariffstatus"), default=TariffStatus.ACTIVA)

    sub_client = relationship("SubClient", back_populates="tariffs")
    route_template = relationship("RateTemplate", lazy="joined")
    trips = relationship("Trip", back_populates="tariff")


class Unit(AuditMixin, Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=False, index=True)

    numero_economico = Column(String(20), unique=True, nullable=False)
    placas = Column(String(15), unique=True, nullable=False)
    vin = Column(String(17))
    marca = Column(String(50), nullable=False)
    modelo = Column(String(50), nullable=False)
    year = Column(Integer)

    tipo = Column(String(50), nullable=True)

    tipo_1 = Column(String(50))
    tipo_carga = Column(String(50))
    numero_serie_motor = Column(String, nullable=True)
    marca_motor = Column(String, nullable=True)
    capacidad_carga = Column(Float, nullable=True)

    status = Column(pg_enum(UnitStatus, "unitstatus"), default=UnitStatus.DISPONIBLE)

    razon_bloqueo = Column(String(255), nullable=True)

    ignore_blocking = Column(Boolean, nullable=False, server_default="false")
    documentos_vencidos = Column(Integer, nullable=False, server_default="0")
    llantas_criticas = Column(Integer, default=0)

    seguro_vence = Column(Date, nullable=True)
    verificacion_humo_vence = Column(Date, nullable=True)
    verificacion_fisico_mecanica_vence = Column(Date, nullable=True)
    verificacion_vence = Column(Date, nullable=True)
    permiso_sct_vence = Column(Date, nullable=True)

    permiso_sct_folio = Column(String(50), nullable=True)
    caat_folio = Column(String(50), nullable=True)
    caat_vence = Column(Date, nullable=True)

    tarjeta_circulacion_url = Column(String(500), nullable=True)
    permiso_doble_articulado_url = Column(String(500), nullable=True)
    poliza_seguro_url = Column(String(500), nullable=True)
    verificacion_humo_url = Column(String(500), nullable=True)
    verificacion_fisico_mecanica_url = Column(String(500), nullable=True)

    permiso_sct_url = Column(String(500), nullable=True)
    caat_url = Column(String(500), nullable=True)
    tarjeta_circulacion_folio = Column(String(50), nullable=True)
    is_loaded = Column(Boolean, nullable=False, server_default="false", default=False)

    # ✅ RELACIONES CORREGIDAS
    operators = relationship("Operator", back_populates="assigned_unit")
    tires = relationship("Tire", back_populates="unit")
    work_orders = relationship("WorkOrder", back_populates="unit")
    fuel_logs = relationship("FuelLog", back_populates="unit")

    trip_legs = relationship(
        "TripLeg", back_populates="unit", foreign_keys="[TripLeg.unit_id]"
    )
    trips_as_remolque_1 = relationship(
        "Trip", back_populates="remolque_1", foreign_keys="[Trip.remolque_1_id]"
    )
    trips_as_remolque_2 = relationship(
        "Trip", back_populates="remolque_2", foreign_keys="[Trip.remolque_2_id]"
    )
    trips_as_dolly = relationship(
        "Trip", back_populates="dolly", foreign_keys="[Trip.dolly_id]"
    )


class UnitDocumentHistory(AuditMixin, Base):
    __tablename__ = "unit_document_history"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=False
    )

    document_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)

    uploaded_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    uploaded_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    unit = relationship("Unit")
    user = relationship("User", foreign_keys=[uploaded_by])


class Tire(AuditMixin, Base):
    __tablename__ = "tires"

    id = Column(Integer, primary_key=True, index=True)

    codigo_interno = Column(String(50), unique=True, nullable=False, index=True)
    marca = Column(String(50), nullable=False)
    modelo = Column(String(50))
    medida = Column(String(20))
    dot = Column(String(10))

    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    posicion = Column(String(50), nullable=True)

    estado = Column(
        pg_enum(TireStatus, "tirestatus"),
        default=TireStatus.NUEVO,
    )

    estado_fisico = Column(
        pg_enum(TireCondition, "tirecondition"),
        default=TireCondition.BUENA,
    )

    profundidad_actual = Column(Float, default=0.0)
    profundidad_original = Column(Float, default=0.0)
    km_recorridos = Column(Float, default=0.0)

    fecha_compra = Column(Date)
    precio_compra = Column(Float, default=0.0)
    costo_acumulado = Column(Float, default=0.0)
    proveedor = Column(String(100))

    unit = relationship("Unit", back_populates="tires")
    history = relationship(
        "TireHistory", back_populates="tire", cascade="all, delete-orphan"
    )


class TireHistory(AuditMixin, Base):
    __tablename__ = "tire_history"

    id = Column(Integer, primary_key=True, index=True)
    tire_id = Column(
        Integer, ForeignKey("tires.id", ondelete="CASCADE"), nullable=False
    )

    fecha = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    tipo = Column(
        pg_enum(TireEventType, "tireeventtype"),
        nullable=False,
    )
    descripcion = Column(String(255))

    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    unidad_economico = Column(String(50), nullable=True)
    posicion = Column(String(50))

    km = Column(Float, default=0.0)
    costo = Column(Float, default=0.0)
    responsable = Column(String(100))

    tire = relationship("Tire", back_populates="history")
    unidad = relationship("Unit", foreign_keys=[unit_id])


class Operator(AuditMixin, Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=True)

    name = Column(String(100), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    license_type = Column(String(5), default="E")
    license_expiry = Column(Date, nullable=False)
    medical_check_expiry = Column(Date, nullable=False)
    phone = Column(String(20))

    status = Column(
        pg_enum(OperatorStatus, "operatorstatus"), default=OperatorStatus.ACTIVO
    )

    assigned_unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    hire_date = Column(Date)
    emergency_contact = Column(String(100))
    emergency_phone = Column(String(20))
    foto_url = Column(String(500), nullable=True)
    licencia_url = Column(String(500), nullable=True)
    ine_url = Column(String(500), nullable=True)
    apto_medico_url = Column(String(500), nullable=True)
    comprobante_domicilio_url = Column(String(500), nullable=True)

    # ✅ RELACIONES CORREGIDAS
    assigned_unit = relationship("Unit", back_populates="operators")
    trip_legs = relationship("TripLeg", back_populates="operator")
    document_history = relationship(
        "OperatorDocumentHistory",
        back_populates="operator",
        cascade="all, delete-orphan",
    )


# =========================================================
# MODELS DE VIAJE (REFCTORIZADOS PARA DROPS/TRAMOS)
# =========================================================


class Trip(AuditMixin, Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=True)

    # --- LLAVES FORÁNEAS (Servicio General) ---
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    sub_client_id = Column(
        Integer, ForeignKey("sub_clients.id", ondelete="RESTRICT"), nullable=False
    )
    tariff_id = Column(
        Integer, ForeignKey("tariffs.id", ondelete="SET NULL"), nullable=True
    )

    # ✅ EQUIPOS FIJOS (Los remolques/contenedores viajan en todo el ciclo)
    remolque_1_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    dolly_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    remolque_2_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )

    # --- DATOS DEL VIAJE PADRE ---
    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    route_name = Column(String(200))

    #   CAMPOS DE MERCANCÍA (CARTA PORTE)
    descripcion_mercancia = Column(String(255), default="Carga General")
    peso_toneladas = Column(Float, default=0.0)
    es_material_peligroso = Column(Boolean, default=False)
    clase_imo = Column(String(50), nullable=True)  # Ej. "8 (Corrosivos)", "9"

    status = Column(pg_enum(TripStatus, "tripstatus"), default=TripStatus.CREADO)

    # --- FINANZAS GLOBALES (Cobro al cliente) ---
    tarifa_base = Column(Float, nullable=False, default=0.0)
    costo_casetas = Column(Float, default=0.0)

    # Fechas Globales
    start_date = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    closed_at = Column(DateTime(timezone=True))

    # Relaciones
    client = relationship("Client", back_populates="trips")
    sub_client = relationship("SubClient", back_populates="trips")
    tariff = relationship("Tariff", back_populates="trips")

    remolque_1 = relationship(
        "Unit", foreign_keys=[remolque_1_id], back_populates="trips_as_remolque_1"
    )
    dolly = relationship(
        "Unit", foreign_keys=[dolly_id], back_populates="trips_as_dolly"
    )
    remolque_2 = relationship(
        "Unit", foreign_keys=[remolque_2_id], back_populates="trips_as_remolque_2"
    )

    # ✅ Relación con los Tramos
    legs = relationship(
        "TripLeg",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripLeg.id",
    )


# ✅ NUEVO MODELO: EL TRAMO O DESENGANCHE
class TripLeg(AuditMixin, Base):
    __tablename__ = "trip_legs"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )

    leg_type = Column(pg_enum(TripLegType, "triplegtype"), nullable=False)
    status = Column(pg_enum(TripStatus, "tripstatus"), default=TripStatus.CREADO)

    # --- RECURSOS ASIGNADOS AL TRAMO ---
    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=True
    )
    operator_id = Column(
        Integer, ForeignKey("operators.id", ondelete="RESTRICT"), nullable=True
    )

    # --- FINANZAS DEL TRAMO ---
    anticipo_casetas = Column(Float, default=0.0)
    anticipo_viaticos = Column(Float, default=0.0)
    anticipo_combustible = Column(Float, default=0.0)
    otros_anticipos = Column(Float, default=0.0)
    saldo_operador = Column(Float, default=0.0)

    # --- TELEMETRÍA DE ARRANQUE ---
    odometro_inicial = Column(Integer, nullable=True, default=0)
    nivel_tanque_inicial = Column(Float, nullable=True, default=100.0)

    # --- TIEMPOS Y RASTREO ---
    start_date = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    last_update = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_location = Column(String(200))

    # Relaciones
    trip = relationship("Trip", back_populates="legs")
    unit = relationship("Unit", foreign_keys=[unit_id], back_populates="trip_legs")
    operator = relationship(
        "Operator", foreign_keys=[operator_id], back_populates="trip_legs"
    )

    timeline_events = relationship(
        "TripTimelineEvent", back_populates="trip_leg", cascade="all, delete-orphan"
    )
    fuel_logs = relationship("FuelLog", back_populates="trip_leg")


class TripTimelineEvent(AuditMixin, Base):
    __tablename__ = "trip_timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_leg_id = Column(
        Integer, ForeignKey("trip_legs.id", ondelete="CASCADE"), nullable=False
    )

    time = Column(DateTime(timezone=True), nullable=False)
    event = Column(String(500), nullable=False)
    event_type = Column(String(20), default="info")

    trip_leg = relationship("TripLeg", back_populates="timeline_events")


class Role(AuditMixin, Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name_key = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(200))
    permisos = Column(JSONB, default=dict)

    users = relationship(
        "User",
        back_populates="role",
        foreign_keys="User.role_id",
    )


class User(AuditMixin, Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    telefono = Column(String(20))
    puesto = Column(String(100))
    avatar_url = Column(String(500))

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))

    activo = Column(Boolean, default=True)
    preferencias = Column(
        JSONB, default=lambda: {"theme": "system", "notifications": True}
    )
    two_factor_secret = Column(String(32), nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True))

    role = relationship(
        "Role",
        back_populates="users",
        foreign_keys=[role_id],
    )


class SystemConfig(Base):
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True)
    value = Column(Text)
    grupo = Column(String(50))
    tipo = Column(String(20), default="string")
    is_public = Column(Boolean, default=False)


class Provider(AuditMixin, Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(200), nullable=False)
    rfc = Column(String(13), unique=True, nullable=False)
    email = Column(String(100))
    telefono = Column(String(20))
    direccion = Column(Text)
    dias_credito = Column(Integer, default=0)


class BulkUploadHistory(AuditMixin, Base):
    __tablename__ = "bulk_upload_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    stored_filename = Column(String(255))
    file_path = Column(String(500))
    upload_type = Column(String(50))
    status = Column(String(20))
    record_count = Column(Integer, default=0)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    user = relationship("User", foreign_keys=[user_id])


class InventoryItem(AuditMixin, Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    descripcion = Column(String(200), nullable=False)

    categoria = Column(
        pg_enum(InventoryCategory, "inventorycategory"),
        default=InventoryCategory.GENERAL,
    )

    stock_actual = Column(Integer, default=0)
    stock_minimo = Column(Integer, default=5)
    ubicacion = Column(String(100))
    precio_unitario = Column(Float, default=0.0)

    work_order_parts = relationship("WorkOrderPart", back_populates="item")


class Mechanic(AuditMixin, Base):
    __tablename__ = "mechanics"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    especialidad = Column(String(100))

    telefono = Column(String(20))
    email = Column(String(100))
    direccion = Column(Text)
    fecha_nacimiento = Column(Date)

    fecha_contratacion = Column(Date)
    nss = Column(String(20))
    rfc = Column(String(13))
    salario_base = Column(Float, default=0.0)

    contacto_emergencia_nombre = Column(String(100))
    contacto_emergencia_telefono = Column(String(20))

    activo = Column(Boolean, default=True)
    foto_url = Column(String(500))

    work_orders = relationship("WorkOrder", back_populates="mechanic")
    documents = relationship(
        "MechanicDocument",
        back_populates="mechanic",
        cascade="all, delete-orphan",
    )


class MechanicDocument(AuditMixin, Base):
    __tablename__ = "mechanic_documents"

    id = Column(Integer, primary_key=True, index=True)
    mechanic_id = Column(
        Integer, ForeignKey("mechanics.id", ondelete="CASCADE"), nullable=False
    )

    tipo_documento = Column(String(50), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    url_archivo = Column(String(500), nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)
    file_size = Column(Integer, nullable=True)
    subido_en = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    mechanic = relationship("Mechanic", back_populates="documents")


class WorkOrder(AuditMixin, Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(20), unique=True, nullable=False)

    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False
    )
    mechanic_id = Column(
        Integer, ForeignKey("mechanics.id", ondelete="SET NULL"), nullable=True
    )

    descripcion_problema = Column(Text, nullable=False)

    status = Column(
        pg_enum(WorkOrderStatus, "workorderstatus"), default=WorkOrderStatus.ABIERTA
    )

    fecha_apertura = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)

    unit = relationship("Unit", back_populates="work_orders")
    mechanic = relationship("Mechanic", back_populates="work_orders")
    parts = relationship(
        "WorkOrderPart", back_populates="work_order", cascade="all, delete-orphan"
    )


class WorkOrderPart(AuditMixin, Base):
    __tablename__ = "work_order_parts"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(
        Integer, ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False
    )
    inventory_item_id = Column(
        Integer, ForeignKey("inventory_items.id", ondelete="RESTRICT"), nullable=False
    )

    cantidad = Column(Integer, nullable=False)
    costo_unitario_snapshot = Column(Float, nullable=False)

    work_order = relationship("WorkOrder", back_populates="parts")
    item = relationship("InventoryItem", back_populates="work_order_parts")


class Supplier(AuditMixin, Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(200), nullable=False)
    rfc = Column(String(13), unique=True, nullable=False)
    email = Column(String(100))
    telefono = Column(String(20))
    direccion = Column(Text)
    codigo_postal = Column(String(10))

    dias_credito = Column(Integer, default=0)
    limite_credito = Column(Float, default=0.0)

    contacto_principal = Column(String(100))
    categoria = Column(String(50))

    tipo_proveedor = Column(String(50))
    zonas_cobertura = Column(String(255))

    banco = Column(String(100))
    cuenta_bancaria = Column(String(50))
    clabe = Column(String(18))

    estatus = Column(
        pg_enum(SupplierStatus, "supplierstatus"), default=SupplierStatus.ACTIVO
    )

    invoices = relationship("PayableInvoice", back_populates="supplier")
    tariffs = relationship(
        "SupplierTariff", back_populates="supplier", cascade="all, delete-orphan"
    )
    document_history = relationship(
        "SupplierDocumentHistory",
        back_populates="supplier",
        cascade="all, delete-orphan",
    )


class SupplierTariff(AuditMixin, Base):
    __tablename__ = "supplier_tariffs"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(
        Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False
    )

    rate_template_id = Column(
        Integer, ForeignKey("rate_templates.id", ondelete="SET NULL"), nullable=True
    )

    nombre_ruta = Column(String(200), nullable=False)
    tipo_unidad = Column(pg_enum(UnitType, "unittype"), nullable=False)

    tarifa_base = Column(Float, nullable=False, default=0.0)
    costo_casetas = Column(Float, default=0)

    iva_porcentaje = Column(Float, default=16.0)
    retencion_porcentaje = Column(Float, default=4.0)

    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    vigencia = Column(Date, nullable=False)
    estatus = Column(pg_enum(TariffStatus, "tariffstatus"), default=TariffStatus.ACTIVA)

    supplier = relationship("Supplier", back_populates="tariffs")
    route_template = relationship("RateTemplate", lazy="joined")


class SupplierDocumentHistory(AuditMixin, Base):
    __tablename__ = "supplier_document_history"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(
        Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False
    )

    document_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    supplier = relationship("Supplier", back_populates="document_history")


class IndirectExpenseCategory(AuditMixin, Base):
    __tablename__ = "indirect_expense_categories"
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    tipo = Column(String(20))


class PayableInvoice(AuditMixin, Base):
    __tablename__ = "payable_invoices"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(
        Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=True
    )

    viaje_id = Column(
        Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )
    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    categoria_indirecto_id = Column(
        Integer, ForeignKey("indirect_expense_categories.id"), nullable=True
    )

    uuid = Column(String(36), unique=True, nullable=True)
    folio_interno = Column(String(50))

    subtotal = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    retenciones = Column(Float, default=0.0)
    monto_total = Column(Float, nullable=False)
    saldo_pendiente = Column(Float, nullable=False)

    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    concepto = Column(String(200))
    clasificacion = Column(String(50))

    estatus = Column(
        pg_enum(InvoiceStatus, "invoicestatus"), default=InvoiceStatus.PENDIENTE
    )

    pdf_url = Column(String(500))
    xml_url = Column(String(500))

    supplier = relationship("Supplier", back_populates="invoices")
    payments = relationship(
        "InvoicePayment", back_populates="invoice", cascade="all, delete-orphan"
    )
    document_history = relationship("InvoiceDocumentHistory", back_populates="invoice")


class InvoiceDocumentHistory(AuditMixin, Base):
    __tablename__ = "invoice_document_history"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("payable_invoices.id", ondelete="CASCADE"))
    document_type = Column(String(20))
    file_url = Column(String(500))
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    invoice = relationship("PayableInvoice", back_populates="document_history")


class InvoicePayment(AuditMixin, Base):
    __tablename__ = "invoice_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(
        Integer, ForeignKey("payable_invoices.id", ondelete="CASCADE"), nullable=False
    )

    fecha_pago = Column(Date, default=date.today)
    monto = Column(Float, nullable=False)
    metodo_pago = Column(String(50))
    referencia = Column(String(100))
    cuenta_retiro = Column(String(50))

    complemento_uuid = Column(String(36))

    invoice = relationship("PayableInvoice", back_populates="payments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    accion = Column(String(255), nullable=False)
    tipo_accion = Column(String(50), nullable=False)
    modulo = Column(String(100), nullable=False)
    detalles = Column(Text, nullable=True)

    ip = Column(String(50), nullable=True)
    dispositivo = Column(String(255), nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User")


class ClientDocumentHistory(AuditMixin, Base):
    __tablename__ = "client_document_history"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )

    document_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    client = relationship("Client", back_populates="document_history")


class TollBooth(AuditMixin, Base):
    __tablename__ = "toll_booths"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    tramo = Column(String(255), nullable=False)
    carretera = Column(String(100), nullable=True)
    estado = Column(String(50), nullable=True)
    costo_5_ejes_sencillo = Column(Float, default=0.0)
    costo_5_ejes_full = Column(Float, default=0.0)
    costo_9_ejes_sencillo = Column(Float, default=0.0)
    costo_9_ejes_full = Column(Float, default=0.0)
    forma_pago = Column(String(20), default="AMBOS")
    route_segments = relationship("RateSegment", back_populates="toll")


class RateTemplate(AuditMixin, Base):
    __tablename__ = "rate_templates"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=True
    )
    origen = Column(String(150), nullable=False)
    destino = Column(String(150), nullable=False)
    tipo_unidad = Column(pg_enum(TollUnitType, "tollunittype"), nullable=False)
    costo_total_sencillo = Column(Float, default=0.0)
    costo_total_full = Column(Float, default=0.0)
    distancia_total_km = Column(Float, default=0.0)
    tiempo_total_minutos = Column(Integer, default=0)

    segments = relationship(
        "RateSegment",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="RateSegment.orden",
    )


class RateSegment(Base):
    __tablename__ = "rate_template_segments"
    id = Column(Integer, primary_key=True)
    rate_template_id = Column(
        Integer, ForeignKey("rate_templates.id", ondelete="CASCADE")
    )
    nombre_segmento = Column(String(255), nullable=False)
    estado = Column(String(50))
    carretera = Column(String(100))
    distancia_km = Column(Float, default=0.0)
    tiempo_minutos = Column(Integer, default=0)
    toll_booth_id = Column(
        Integer, ForeignKey("toll_booths.id", ondelete="SET NULL"), nullable=True
    )
    orden = Column(Integer, nullable=False)
    costo_momento_sencillo = Column(Float, default=0.0)
    costo_momento_full = Column(Float, default=0.0)

    template = relationship("RateTemplate", back_populates="segments")
    toll = relationship("TollBooth", back_populates="route_segments")


class OperatorDocumentHistory(AuditMixin, Base):
    __tablename__ = "operator_document_history"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(
        Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False
    )

    document_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    operator = relationship("Operator", back_populates="document_history")


# =========================================================
#  Historial de Documentos de Combustible
# =========================================================


class FuelDocumentHistory(AuditMixin, Base):
    __tablename__ = "fuel_document_history"

    id = Column(Integer, primary_key=True, index=True)
    fuel_log_id = Column(
        Integer, ForeignKey("fuel_logs.id", ondelete="CASCADE"), nullable=False
    )

    document_type = Column(String(50), nullable=False, server_default="ticket")
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    fuel_log = relationship("FuelLog", back_populates="document_history")


class FuelLog(AuditMixin, Base):
    __tablename__ = "fuel_logs"

    id = Column(Integer, primary_key=True, index=True)

    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False
    )
    operator_id = Column(
        Integer, ForeignKey("operators.id", ondelete="RESTRICT"), nullable=False
    )

    trip_leg_id = Column(
        Integer, ForeignKey("trip_legs.id", ondelete="SET NULL"), nullable=True
    )

    fecha_hora = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    estacion = Column(String(200), nullable=False)
    tipo_combustible = Column(String(20), nullable=False)

    litros = Column(Float, default=0.0, nullable=False)
    precio_por_litro = Column(Float, default=0.0, nullable=False)
    total = Column(Float, default=0.0, nullable=False)
    odometro = Column(Integer, nullable=False)

    evidencia_url = Column(String(500), nullable=True)
    excede_tanque = Column(Boolean, default=False)
    capacidad_tanque_snapshot = Column(Float, nullable=True)

    unit = relationship("Unit", back_populates="fuel_logs")
    operator = relationship("Operator")
    trip_leg = relationship("TripLeg", back_populates="fuel_logs")

    document_history = relationship(
        "FuelDocumentHistory", back_populates="fuel_log", cascade="all, delete-orphan"
    )


# =========================================================
# CATÁLOGOS SAT (Para Carta Porte)
# =========================================================


class SatProduct(Base):
    """Catálogo de Bienes y Servicios (Mercancía) del SAT"""

    __tablename__ = "sat_products"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(20), unique=True, index=True, nullable=False)  # Ej: 50131801
    descripcion = Column(String(255), nullable=False)  # Ej: Queso natural
    es_material_peligroso = Column(String(5), default="0,1")  # 0, 1 (No, Sí)
    activo = Column(Boolean, default=True)


class SatLocationCode(Base):
    """Catálogo de Códigos Postales, Municipios y Estados del SAT"""

    __tablename__ = "sat_location_codes"

    id = Column(Integer, primary_key=True, index=True)
    codigo_postal = Column(String(10), index=True, nullable=False)  # Ej: 91700
    estado_clave = Column(String(10), nullable=False)  # Ej: VER
    municipio_clave = Column(String(10))  # Ej: 193
    localidad_clave = Column(String(10))  # Ej: 17


class ReceivableInvoice(AuditMixin, Base):
    __tablename__ = "receivable_invoices"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones al cliente y al viaje
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    sub_client_id = Column(
        Integer, ForeignKey("sub_clients.id", ondelete="RESTRICT"), nullable=True
    )
    viaje_id = Column(
        Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )

    uuid = Column(
        String(36), unique=True, nullable=True
    )  # UUID del SAT cuando se timbre
    folio_interno = Column(String(50))

    # Finanzas
    subtotal = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    retenciones = Column(Float, default=0.0)
    monto_total = Column(Float, nullable=False)
    saldo_pendiente = Column(Float, nullable=False)

    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    concepto = Column(String(255))

    estatus = Column(
        pg_enum(InvoiceStatus, "invoicestatus"), default=InvoiceStatus.PENDIENTE
    )

    pdf_url = Column(String(500))
    xml_url = Column(String(500))

    # Relaciones de navegación
    client = relationship("Client")
    sub_client = relationship("SubClient")
    trip = relationship("Trip")


class ReceivableInvoicePayment(AuditMixin, Base):
    __tablename__ = "receivable_invoice_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(
        Integer,
        ForeignKey("receivable_invoices.id", ondelete="CASCADE"),
        nullable=False,
    )

    fecha_pago = Column(Date, default=date.today)
    monto = Column(Float, nullable=False)
    metodo_pago = Column(String(50))  # Ej: TRANSFERENCIA, CHEQUE, EFECTIVO
    referencia = Column(String(100))  # Ej: Folio de transferencia
    cuenta_deposito = Column(String(50))  # A qué cuenta de la empresa cayó

    # Relación inversa
    invoice = relationship("ReceivableInvoice", backref="payments")
