"""
SQLAlchemy ORM Models for TMS
- Postgres ready
- AuditMixin estandarizado (record_status, created_at, updated_at, created_by_id, updated_by_id)
- sin created_at/updated_at manuales repetidos
- Enum names alineados a los tipos existentes en Postgres.
"""

import uuid
from datetime import date
from enum import Enum as PyEnum
from sqlalchemy import Enum as SAEnum
from typing import List, Optional, Any
from sqlalchemy.sql import func
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
    UniqueConstraint,
    JSON,
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


class PurchaseOrderStatus(str, PyEnum):
    BORRADOR = "borrador"
    PENDIENTE = "pendiente"
    AUTORIZADA = "autorizada"
    RECIBIDA = "recibida"
    CANCELADA = "cancelada"


class UnitType(str, PyEnum):
    SENCILLO = "sencillo"
    FULL = "full"
    RABON = "rabon"
    TRACTOCAMION = "tractocamion"
    REMOLQUE = "remolque"
    CAMIONETA = "camioneta"
    CAMION = "camion"
    MOTOGENERADOR = "motogenerador"
    OTRO = "otro"


class Currency(str, PyEnum):
    MXN = "MXN"
    USD = "USD"


class SettlementConceptType(str, PyEnum):
    INGRESO = "ingreso"
    DEDUCCION = "deduccion"


class UnitStatus(str, PyEnum):
    DISPONIBLE = "disponible"
    EN_RUTA = "en_ruta"
    MANTENIMIENTO = "mantenimiento"
    BLOQUEADO = "bloqueado"


class OperatorStatus(str, PyEnum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    EN_RUTA = "en_ruta"
    VACACIONES = "vacaciones"
    INCAPACIDAD = "incapacidad"


class TripStatus(str, PyEnum):
    CREADO = "creado"
    EN_TRANSITO = "en_transito"
    DETENIDO = "detenido"
    RETRASO = "retraso"
    ENTREGADO = "entregado"
    CERRADO = "cerrado"
    LIQUIDADO = "liquidado"
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
    IMPORTACION = "importacion"
    EXPORTACION = "exportacion"
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
    TAG = "tag"
    EFECTIVO = "efectivo"
    AMBOS = "ambos"


class TollUnitType(str, PyEnum):
    EJES_5 = "5ejes"
    EJES_9 = "9ejes"


class UnitAxleConfig(str, PyEnum):
    TRACTO = "TRACTO_10"  # Tractocamión (10 llantas)
    RABON = "RABON_6"  # Rabón (6 llantas)
    REMOLQUE = "REMOLQUE_8"  # Remolque (8 llantas)
    DOLLY = "DOLLY_8"  # Dolly (8 llantas)


# =========================================================
# MIXINS
# =========================================================


@declarative_mixin
class AuditMixin:
    record_status = Column(
        pg_enum(RecordStatus, "recordstatus"),
        nullable=False,
        default=RecordStatus.ACTIVO,
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


class UnitTypeCatalog(AuditMixin, Base):
    __tablename__ = "unit_types_catalog"

    id = Column(String(50), primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    icono = Column(String(20), nullable=False, default="🚛")
    activo = Column(Boolean, default=True)
    descripcion = Column(Text, nullable=True)


class Brand(AuditMixin, Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    tipo_activo = Column(String(50), nullable=True)  # TRACTO, REMOLQUE, AMBOS


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

    forma_pago = Column(String(5), default="99")  # Ej: 01, 03, 99
    metodo_pago = Column(String(5), default="PPD")  # PUE o PPD
    moneda = Column(String(5), default="MXN")  # MXN, USD

    dias_credito = Column(Integer, default=0)
    contrato_url = Column(String(500))

    constancia_fiscal_url = Column(String(500), nullable=True)
    acta_constitutiva_url = Column(String(500), nullable=True)
    comprobante_domicilio_url = Column(String(500), nullable=True)

    sub_clients = relationship(
        "SubClient", back_populates="client", cascade="all, delete-orphan"
    )
    trips = relationship("Trip", back_populates="client")
    document_history = relationship(
        "ClientDocumentHistory", back_populates="client", cascade="all, delete-orphan"
    )
    tarifas_autorizadas = relationship(
        "RateTemplate", back_populates="client", cascade="all, delete-orphan"
    )
    receivable_invoices = relationship("ReceivableInvoice", back_populates="client")


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
    horario_cita = Column(String(50), nullable=True)
    horario_recepcion = Column(String(50), nullable=True)
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
    sueldo_operador = Column(Float, nullable=False, default=0.0)

    iva_porcentaje = Column(Float, default=16.0)
    retencion_porcentaje = Column(Float, default=4.0)
    distancia_km = Column(Float, default=0.0)

    costo_casetas = Column(Float, default=0.0)
    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    vigencia = Column(Date, nullable=False)
    estatus = Column(pg_enum(TariffStatus, "tariffstatus"), default=TariffStatus.ACTIVA)

    sub_client = relationship("SubClient", back_populates="tariffs")
    route_template = relationship("RateTemplate", lazy="joined")
    trips = relationship("Trip", back_populates="tariff")


class Terminal(AuditMixin, Base):
    __tablename__ = "terminals"
    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False, unique=True)


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
    capacidad_tanque_diesel = Column(String(50), nullable=True, default="600.0")
    capacidad_tanque_urea = Column(String(50), nullable=True, default="40.0")

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
    permiso_sct_tipo = Column(
        String(20), nullable=True, default="TPAF01", server_default="TPAF01"
    )
    config_vehicular_sat = Column(
        String(20), nullable=True, default="T3S2", server_default="T3S2"
    )
    aseguradora_resp_civil = Column(
        String(100), nullable=True, default="POR DEFINIR", server_default="POR DEFINIR"
    )
    poliza_resp_civil = Column(
        String(50), nullable=True, default="00000000", server_default="00000000"
    )

    tarjeta_circulacion_url = Column(String(500), nullable=True)
    permiso_doble_articulado_url = Column(String(500), nullable=True)
    poliza_seguro_url = Column(String(500), nullable=True)
    verificacion_humo_url = Column(String(500), nullable=True)
    verificacion_fisico_mecanica_url = Column(String(500), nullable=True)

    permiso_sct_url = Column(String(500), nullable=True)
    caat_url = Column(String(500), nullable=True)
    tarjeta_circulacion_folio = Column(String(50), nullable=True)
    is_loaded = Column(Boolean, nullable=False, server_default="false", default=False)
    configuracion_ejes = Column(
        pg_enum(UnitAxleConfig, "unitaxleconfig"), nullable=True
    )

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
    posicion = Column(Integer, nullable=True)

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
    posicion = Column(Integer, nullable=True)

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
    posicion = Column(Integer, nullable=True)

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
    license_type = relationship("LicenseTypeCatalog")
    license_type_id = Column(
        Integer,
        ForeignKey("license_types_catalog.id", ondelete="SET NULL"),
        nullable=True,
    )
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
    rfc = Column(
        String(13),
        nullable=True,
        default="XAXX010101000",
        server_default="XAXX010101000",
    )

    assigned_unit = relationship("Unit", back_populates="operators")
    trip_legs = relationship("TripLeg", back_populates="operator")
    document_history = relationship(
        "OperatorDocumentHistory",
        back_populates="operator",
        cascade="all, delete-orphan",
    )


class Trip(AuditMixin, Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(50), unique=True, nullable=True)
    uuid_fiscal = Column(String(36), nullable=True)

    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    sub_client_id = Column(
        Integer, ForeignKey("sub_clients.id", ondelete="RESTRICT"), nullable=False
    )
    tariff_id = Column(
        Integer, ForeignKey("tariffs.id", ondelete="SET NULL"), nullable=True
    )

    remolque_1_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    dolly_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    remolque_2_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )

    is_refrigerated_1 = Column(Boolean, default=False, server_default="false")
    motogenerator_1_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )

    is_refrigerated_2 = Column(Boolean, default=False, server_default="false")
    motogenerator_2_id = Column(
        Integer, ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )

    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    route_name = Column(String(200))
    terminal_entrega_vacio = Column(String(255), nullable=True)

    descripcion_mercancia = Column(String(255), default="Carga General")
    peso_toneladas = Column(Float, default=0.0)
    es_material_peligroso = Column(Boolean, default=False)
    cve_material_peligroso = Column(String(10), nullable=True)  # Ej: UN1005
    embalaje = Column(String(10), nullable=True)  # Ej: 4G
    sat_clave_servicio = Column(String(20), default="78101802")  # Flete
    referencia = Column(String(100), nullable=True)
    contenedor_1 = Column(String(100), nullable=True)
    contenedor_2 = Column(String(100), nullable=True)
    clase_imo = Column(String(50), nullable=True)
    sat_clave_producto = Column(String(20), default="01010101")
    sat_clave_unidad = Column(String(10), default="E48")
    mercancia_clave_stcc = Column(String(20), nullable=True)
    status = Column(pg_enum(TripStatus, "tripstatus"), default=TripStatus.CREADO)

    tarifa_base = Column(Float, nullable=False, default=0.0)
    sueldo_operador = Column(Float, nullable=False, default=0.0)
    costo_casetas = Column(Float, default=0.0)

    fecha_programada = Column(Date, nullable=True)
    start_date = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    closed_at = Column(DateTime(timezone=True))
    comprobante_entrega_url = Column(String(500), nullable=True)

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

    legs = relationship(
        "TripLeg",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripLeg.id",
    )
    work_orders = relationship("WorkOrder", back_populates="trip")

    motogenerator_1_unit = relationship(
        "Unit", foreign_keys=[motogenerator_1_id], viewonly=True
    )
    motogenerator_2_unit = relationship(
        "Unit", foreign_keys=[motogenerator_2_id], viewonly=True
    )
    receivable_invoices = relationship("ReceivableInvoice", back_populates="trip")


class TripLeg(AuditMixin, Base):
    __tablename__ = "trip_legs"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )

    leg_type = Column(pg_enum(TripLegType, "triplegtype"), nullable=False)
    status = Column(pg_enum(TripStatus, "tripstatus"), default=TripStatus.CREADO)

    unit_id = Column(
        Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=True
    )
    operator_id = Column(
        Integer, ForeignKey("operators.id", ondelete="RESTRICT"), nullable=True
    )

    anticipo_casetas = Column(Float, default=0.0)
    anticipo_viaticos = Column(Float, default=0.0)
    anticipo_combustible = Column(Float, default=0.0)
    otros_anticipos = Column(Float, default=0.0)

    monto_sueldo = Column(Float, default=0.0)
    monto_bonos = Column(Float, default=0.0)
    monto_maniobras = Column(Float, default=0.0)
    monto_penalizaciones = Column(Float, default=0.0)
    monto_neto_pagado = Column(Float, default=0.0)
    desglose_conceptos = Column(JSONB, default=list, server_default="[]")

    odometro_inicial = Column(Integer, nullable=True, default=0)
    odometro_final = Column(Integer, nullable=True)
    nivel_tanque_inicial = Column(Integer, nullable=True, default=0)
    rendimiento_real = Column(Float, nullable=True)

    start_date = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    last_update = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_location = Column(String(200))
    diesel_audit_completed = Column(Boolean, default=False, server_default="false")

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

    location = Column(String(255), nullable=True)
    lat = Column(String(50), nullable=True)
    lng = Column(String(50), nullable=True)
    comments = Column(Text, nullable=True)

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
    avatar_url = Column(Text, nullable=True)

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))

    activo = Column(Boolean, default=True)
    preferencias = Column(
        JSONB, default=lambda: {"theme": "system", "notifications": True}
    )
    two_factor_secret = Column(String(32), nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True))
    refresh_token = Column(String(512), nullable=True)
    emergency_code = Column(String(6), nullable=True)
    emergency_code_expires = Column(DateTime(timezone=True), nullable=True)

    role = relationship(
        "Role",
        back_populates="users",
        foreign_keys=[role_id],
    )


class SystemConfig(AuditMixin, Base):
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
    grupo = Column(String(50), nullable=True)
    tipo = Column(String(20), default="string")
    is_public = Column(Boolean, default=False)


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
    sku = Column(String(50), nullable=False, index=True)
    descripcion = Column(String(200), nullable=False)

    categoria = Column(
        pg_enum(InventoryCategory, "inventorycategory"),
        default=InventoryCategory.GENERAL,
    )

    stock_actual = Column(Integer, default=0)
    stock_minimo = Column(Integer, default=5)
    ubicacion = Column(String(100))
    precio_unitario = Column(Float, default=0.0)
    proveedor_id = Column(
        Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )
    proveedor = relationship("Supplier")

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

    #  NUEVAS COLUMNAS (Objetivo 4)
    tipo_mantenimiento = Column(
        String(20), default="patio", server_default="patio"
    )  # "patio" o "ruta"
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )

    descripcion_problema = Column(Text, nullable=False)
    status = Column(
        pg_enum(WorkOrderStatus, "workorderstatus"), default=WorkOrderStatus.ABIERTA
    )
    fecha_apertura = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)
    porcentaje_iva = Column(Float, default=16.0, server_default="16.0")
    subtotal = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    costo_mano_obra = Column(Float, default=0.0)

    unit = relationship("Unit", back_populates="work_orders")
    mechanic = relationship("Mechanic", back_populates="work_orders")
    trip = relationship("Trip", back_populates="work_orders")
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

    tipo_proveedor = Column(String(50))
    zonas_cobertura = Column(String(255))

    banco = Column(String(100))
    cuenta_bancaria = Column(String(50))
    clabe = Column(String(18))
    cost_center_id = Column(
        Integer, ForeignKey("cost_centers.id", ondelete="SET NULL"), nullable=True
    )

    estatus = Column(
        pg_enum(SupplierStatus, "supplierstatus"), default=SupplierStatus.ACTIVO
    )
    cost_center = relationship("CostCenter")
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
    costo_casetas = Column(Float, default=0.00)

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
    orden_compra_id = Column(
        Integer, ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True
    )

    # NUEVO: Relación a CECO (nullable=True para no romper registros existentes)
    cost_center_id = Column(
        Integer, ForeignKey("cost_centers.id", ondelete="RESTRICT"), nullable=True
    )

    uuid = Column(String(36), unique=True, nullable=True)
    folio_interno = Column(String(50))

    # NUEVO: Campos SAT (nullable=True)
    serie = Column(String(20), nullable=True)
    folio = Column(String(50), nullable=True)

    subtotal = Column(Float, default=0.0)
    # NUEVO: Descuento
    descuento = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    retenciones = Column(Float, default=0.0)
    monto_total = Column(Float, nullable=False)
    saldo_pendiente = Column(Float, nullable=False)

    # NUEVO: Impuestos detallados (usamos server_default para que la BD no llore con los viejos)
    desglose_impuestos = Column(JSONB, default=dict, server_default="{}")

    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    # NUEVO: Tipo de cambio
    tipo_cambio = Column(Float, default=1.0)

    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    concepto = Column(Text, nullable=True)

    # MANTENIDO: No borramos este campo para no romper tu código actual
    clasificacion = Column(String(50))

    metodo_pago = Column(String(5), nullable=True)
    forma_pago = Column(String(5), nullable=True)
    tipo_comprobante = Column(String(5), nullable=True)

    # NUEVO: Clasificadores SAT
    uso_cfdi = Column(String(5), nullable=True)
    validacion_efos = Column(Boolean, default=False, server_default="false")

    estatus = Column(
        pg_enum(InvoiceStatus, "invoicestatus"), default=InvoiceStatus.PENDIENTE
    )

    pdf_url = Column(String(500))
    xml_url = Column(String(500))

    supplier = relationship("Supplier", back_populates="invoices")
    cost_center = relationship("CostCenter", back_populates="invoices")
    payments = relationship(
        "InvoicePayment", back_populates="invoice", cascade="all, delete-orphan"
    )
    document_history = relationship("InvoiceDocumentHistory", back_populates="invoice")


## =========================================================
# COSTOS (CECOS)
# =========================================================
class CostCenter(AuditMixin, Base):
    __tablename__ = "cost_centers"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    presupuesto_mensual = Column(Float, default=0.0)
    activo = Column(Boolean, default=True)

    invoices = relationship("PayableInvoice", back_populates="cost_center")


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
    bank_account_id = Column(
        Integer, ForeignKey("bank_accounts.id", ondelete="SET NULL"), nullable=True
    )

    fecha_pago = Column(Date, default=date.today)
    monto = Column(Float, nullable=False)

    # NUEVOS: Complementos de pago (nullable=True para no romper pagos viejos)
    parcialidad = Column(Integer, default=1, server_default="1")
    saldo_anterior = Column(Float, nullable=True)
    saldo_insoluto = Column(Float, nullable=True)

    metodo_pago = Column(String(50))
    referencia = Column(String(100))
    cuenta_retiro = Column(String(50))
    complemento_uuid = Column(String(36))
    comprobante_url = Column(String(500), nullable=True)

    invoice = relationship("PayableInvoice", back_populates="payments")
    bank_account = relationship("BankAccount")


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
    forma_pago = Column(
        pg_enum(PaymentMethod, "paymentmethod"), default=PaymentMethod.AMBOS
    )
    route_segments = relationship("RateSegment", back_populates="toll")


class RateTemplate(AuditMixin, Base):
    __tablename__ = "rate_templates"

    #  FASE 1: Se añade el UniqueConstraint de la combinación exacta
    __table_args__ = (
        UniqueConstraint(
            "client_id",
            "origen",
            "destino",
            "tipo_unidad",
            name="uq_rate_template_config",
        ),
    )

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
    client = relationship("Client", back_populates="tarifas_autorizadas")

    segments = relationship(
        "RateSegment",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="RateSegment.orden",
    )


class RateSegment(AuditMixin, Base):
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

    litros = Column(Float, default=0.0, nullable=False)  # Los litros del vale
    precio_por_litro = Column(Float, default=0.0, nullable=False)
    total = Column(Float, default=0.0, nullable=False)
    odometro = Column(Integer, nullable=False)  # Odómetro inicial

    is_motogenerator = Column(Boolean, default=False, server_default="false")
    horometro = Column(Float, nullable=True)  # Lectura inicial del generador
    horas_sm = Column(Float, nullable=True)  # Horas de trabajo registradas al conciliar

    evidencia_url = Column(String(500), nullable=True)
    excede_tanque = Column(Boolean, default=False)
    capacidad_tanque_snapshot = Column(Float, nullable=True)

    # ---  CAMPOS PARA CONCILIACIÓN ---
    is_conciliated = Column(Boolean, default=False, server_default="false")
    km_sm = Column(Float, nullable=True)  # Manual: Kilómetros recorridos según SM
    litros_sm = Column(Float, nullable=True)  # Manual: Litros quemados según SM
    rendimiento_sm = Column(Float, nullable=True)  # Auto: km_sm / litros_sm
    diferencia_litros = Column(Float, nullable=True)  # Auto: litros_sm - litros (vale)
    rendimiento_real = Column(Float, nullable=True)  # Auto: km_sm / litros (vale)
    odometro_final = Column(
        Integer, nullable=True
    )  # Manual: Para usarlo en el siguiente viaje
    # -----------------------------------------------------------

    unit = relationship("Unit", back_populates="fuel_logs")
    operator = relationship("Operator")
    trip_leg = relationship("TripLeg", back_populates="fuel_logs")

    document_history = relationship(
        "FuelDocumentHistory", back_populates="fuel_log", cascade="all, delete-orphan"
    )

    @property
    def trip_id(self):
        return self.trip_leg.trip_id if self.trip_leg else None


class SatProduct(Base):
    __tablename__ = "sat_products"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(20), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    es_material_peligroso = Column(String(5), default="0,1")
    activo = Column(Boolean, default=True)


class SatLocationCode(Base):
    __tablename__ = "sat_location_codes"

    id = Column(Integer, primary_key=True, index=True)
    codigo_postal = Column(String(10), index=True, nullable=False)
    estado_clave = Column(String(10), nullable=False)
    municipio_clave = Column(String(10))
    localidad_clave = Column(String(10))


class ReceivableInvoice(AuditMixin, Base):
    __tablename__ = "receivable_invoices"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    sub_client_id = Column(
        Integer, ForeignKey("sub_clients.id", ondelete="RESTRICT"), nullable=True
    )
    viaje_id = Column(
        Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )

    uuid = Column(String(36), unique=True, nullable=True)
    folio_interno = Column(String(50))
    is_nominal = Column(Boolean, default=False)
    status_sat = Column(String(50), default="PROVISIONAL")
    uuid_relacionado = Column(String(36), nullable=True)

    subtotal = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    retenciones = Column(Float, default=0.0)
    monto_total = Column(Float, nullable=False)
    saldo_pendiente = Column(Float, nullable=False)

    moneda = Column(pg_enum(Currency, "currency"), default=Currency.MXN)
    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    conceptos_detalle = Column(JSONB, default=list, server_default="[]")
    concepto = Column(String(255))

    estatus = Column(
        pg_enum(InvoiceStatus, "invoicestatus"), default=InvoiceStatus.PENDIENTE
    )

    # CAMPOS PARA CANCELACIÓN SAT
    motivo_cancelacion = Column(String(5), nullable=True)  # Ej: "01", "02"
    acuse_cancelacion_url = Column(String(500), nullable=True)
    fecha_cancelacion = Column(DateTime(timezone=True), nullable=True)

    pdf_url = Column(String(500))
    xml_url = Column(String(500))

    metodo_pago = Column(String(5), nullable=True)  # PUE o PPD
    forma_pago = Column(String(5), nullable=True)  # 01, 03, 99...
    tipo_comprobante = Column(String(5), nullable=True)  # I, E, P

    sub_client = relationship("SubClient")
    trip = relationship("Trip", back_populates="receivable_invoices")
    payments = relationship(
        "ReceivableInvoicePayment",
        back_populates="invoice",
        cascade="all, delete-orphan",
    )
    client = relationship("Client", back_populates="receivable_invoices")


class ReceivableInvoicePayment(AuditMixin, Base):
    __tablename__ = "receivable_invoice_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(
        Integer,
        ForeignKey("receivable_invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    bank_account_id = Column(
        Integer, ForeignKey("bank_accounts.id", ondelete="SET NULL"), nullable=True
    )

    fecha_pago = Column(Date, default=date.today)
    monto = Column(Float, nullable=False)

    # NUEVOS CAMPOS AGREGADOS PARA EL REP (Complemento de Pago)
    parcialidad = Column(Integer, default=1, server_default="1")
    saldo_anterior = Column(Float, nullable=True)
    saldo_insoluto = Column(Float, nullable=True)

    metodo_pago = Column(String(50))
    referencia = Column(String(100))
    cuenta_deposito = Column(String(50))
    complemento_uuid = Column(String(36), nullable=True)
    comprobante_url = Column(String(500), nullable=True)

    invoice = relationship("ReceivableInvoice", back_populates="payments")
    bank_account = relationship("BankAccount")


class AlertConfig(AuditMixin, Base):
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True, index=True)
    alerta_combustible = Column(Boolean, default=True)
    umbral_combustible = Column(Integer, default=5)
    alerta_documento_vencido = Column(Boolean, default=True)
    dias_anticipacion_documento = Column(Integer, default=15)
    alerta_retraso_viaje = Column(Boolean, default=True)
    minutos_retraso = Column(Integer, default=30)


class EmailTemplate(AuditMixin, Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    asunto = Column(String(200), nullable=False)
    cuerpo = Column(Text, nullable=False)


class BankAccount(AuditMixin, Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    banco = Column(String(100), nullable=False)
    banco_logo = Column(String(20))
    numero_cuenta = Column(String(50), nullable=False)
    clabe = Column(String(18))
    moneda = Column(String(10), default="MXN")
    alias = Column(String(100), nullable=False)
    saldo = Column(Float, default=0.0)
    estatus = Column(String(20), default="activo")
    tipo_cuenta = Column(String(50))


class BankMovement(AuditMixin, Base):
    __tablename__ = "bank_movements"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(
        Integer, ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False
    )

    tipo = Column(String(20))
    monto = Column(Float, nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    concepto = Column(String(255))
    referencia = Column(String(100))
    comprobante_url = Column(String(500), nullable=True)

    conciliado = Column(Boolean, default=False, server_default="false")
    fecha_conciliacion = Column(Date, nullable=True)
    origen_modulo = Column(String(50), nullable=True)

    bank_account = relationship("BankAccount", backref="movements")

    @property
    def banco(self):
        return self.bank_account.banco if self.bank_account else None

    @property
    def cuenta_bancaria(self):
        return self.bank_account.numero_cuenta if self.bank_account else None


class UserNotification(AuditMixin, Base):
    """
    Historial centralizado de alertas, incidencias y tracking enviado.
    """

    __tablename__ = "user_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, server_default="false")

    # ej: 'trip_tracking_update', 'trip_incident', 'fuel_alert'
    event_type = Column(String(100), index=True)

    # ID del recurso relacionado (Trip ID, Invoice ID, etc.)
    reference_id = Column(String(100), nullable=True)

    #  Metadata en JSONB para guardar ubicación, coordenadas o datos del cliente
    metadata_info = Column(JSONB, nullable=True)

    user = relationship("User", foreign_keys=[user_id])


class Notification(AuditMixin, Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    event_type = Column(String(50), nullable=True)
    reference_id = Column(String(50), nullable=True)

    user = relationship("User", foreign_keys=[user_id])


# =========================================================
# NUEVOS CATÁLOGOS OPERATIVOS
# =========================================================


class LicenseTypeCatalog(AuditMixin, Base):
    __tablename__ = "license_types_catalog"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)  # Ej: Federal Tipo A
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, server_default="true")


class SettlementConceptCatalog(AuditMixin, Base):
    __tablename__ = "settlement_concepts_catalog"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)  # Ej: Viáticos, Maniobras
    tipo = Column(
        pg_enum(SettlementConceptType, "settlementconcepttype"),
        nullable=False,
        default=SettlementConceptType.INGRESO,
    )
    descripcion = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True, server_default="true")


class SettlementBatch(AuditMixin, Base):
    """
    El Registro Maestro del Lote de pago (Generado con UUID desde el Frontend).
    Agrupa peticiones para no perder el tracking temporal.
    """

    __tablename__ = "settlement_batches"

    # Usamos UUIDs para poder mandarlo generado desde el frontend y agrupar peticiones asíncronas
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Relaciones
    settlements = relationship(
        "OperatorSettlement", back_populates="batch", cascade="all, delete-orphan"
    )


class OperatorSettlement(AuditMixin, Base):
    """
    Foto inmutable del tramo operado. Protege la historia.
    Si mañana cambian la tarifa_base, la liquidación histórica no se rompe.
    """

    __tablename__ = "operator_settlements"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(
        String(36),
        ForeignKey("settlement_batches.id", ondelete="CASCADE"),
        nullable=False,
    )
    trip_leg_id = Column(
        Integer, ForeignKey("trip_legs.id", ondelete="RESTRICT"), nullable=False
    )
    operator_id = Column(
        Integer, ForeignKey("operators.id", ondelete="RESTRICT"), nullable=False
    )

    # Snapshots Financieros y Operativos Inmutables
    snapshot_km = Column(Float, default=0.0)
    snapshot_diesel_liters = Column(Float, default=0.0)
    snapshot_base_salary = Column(Float, default=0.0)

    # Relaciones
    batch = relationship("SettlementBatch", back_populates="settlements")
    leg = relationship("TripLeg")
    operator = relationship("Operator")
    concepts = relationship(
        "OperatorSettlementConcept",
        back_populates="settlement",
        cascade="all, delete-orphan",
    )


class OperatorSettlementConcept(AuditMixin, Base):
    """
    Desglose por bolsa de operador.
    Separa bonos/cargos ingresados a mano (Bolsa de Juan) vs los inyectados por el sistema (Sueldo base).
    """

    __tablename__ = "operator_settlement_concepts"

    id = Column(Integer, primary_key=True, index=True)
    operator_settlement_id = Column(
        Integer,
        ForeignKey("operator_settlements.id", ondelete="CASCADE"),
        nullable=False,
    )
    concept_id = Column(
        Integer,
        ForeignKey("settlement_concepts_catalog.id", ondelete="SET NULL"),
        nullable=True,
    )

    descripcion = Column(String(255), nullable=False)
    tipo = Column(
        pg_enum(SettlementConceptType, "settlementconcepttype"), nullable=False
    )
    amount = Column(Float, nullable=False, default=0.0)

    # EL FILTRO ANTI-DUPLICIDAD: True = Sistema (ej. Sueldo Base), False = Manual (ej. Bono extra)
    is_automatic = Column(Boolean, default=False, server_default="false")

    # Relaciones
    settlement = relationship("OperatorSettlement", back_populates="concepts")
    catalog_concept = relationship("SettlementConceptCatalog")


class InsurerCatalog(AuditMixin, Base):
    __tablename__ = "insurers_catalog"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)  # Ej: Quálitas, AXA
    telefono_siniestros = Column(String(50), nullable=True)
    activo = Column(Boolean, default=True, server_default="true")


class SystemModule(AuditMixin, Base):
    __tablename__ = "system_modules"

    # Usamos String(50) como ID para que sean palabras en inglés (ej: "fleet", "monitoring")
    id = Column(String(50), primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    icono = Column(String(50), default="LayoutDashboard")
    descripcion = Column(String(200), nullable=True)


class PurchaseOrder(AuditMixin, Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(50), unique=True, nullable=False)

    # compra (inventario), servicio, gasto_indirecto
    tipo = Column(String(50), nullable=False)

    supplier_id = Column(
        Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False
    )
    cost_center = Column(String(50))
    indirect_category_id = Column(
        Integer, ForeignKey("indirect_expense_categories.id"), nullable=True
    )

    requester = Column(String(100))
    required_date = Column(Date)
    service_description = Column(Text)

    subtotal = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    moneda = Column(String(10), default="MXN")

    status = Column(
        pg_enum(PurchaseOrderStatus, "purchaseorderstatus"),
        default=PurchaseOrderStatus.PENDIENTE,
    )

    supplier = relationship("Supplier")
    items = relationship(
        "PurchaseOrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class PurchaseOrderItem(AuditMixin, Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False
    )
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)

    descripcion = Column(String(200))
    cantidad = Column(Float)
    unidad = Column(String(20))
    precio_unitario = Column(Float)
    subtotal = Column(Float)

    order = relationship("PurchaseOrder", back_populates="items")
    inventory_item = relationship("InventoryItem")


# =========================================================
# CATÁLOGOS DEL SAT PARA CARTA PORTE 3.1
# =========================================================


class SatServiceType(Base):
    __tablename__ = "sat_service_types"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatCargoType(Base):
    __tablename__ = "sat_cargo_types"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatTrailerSubtype(Base):
    __tablename__ = "sat_trailer_subtypes"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatTruckConfig(Base):
    __tablename__ = "sat_truck_configs"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    ejes = Column(Integer, nullable=True)
    llantas = Column(Integer, nullable=True)
    activo = Column(Boolean, default=True)


class SatMunicipality(Base):
    __tablename__ = "sat_municipalities"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), nullable=False)
    estado_clave = Column(String(10), nullable=False)
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatLocality(Base):
    __tablename__ = "sat_localities"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), nullable=False)
    estado_clave = Column(String(10), nullable=False)
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatNeighborhood(Base):
    __tablename__ = "sat_neighborhoods"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), nullable=False)
    codigo_postal = Column(String(10), index=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatPermitType(Base):
    __tablename__ = "sat_permit_types"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    clave_transporte = Column(String(10), nullable=True)
    activo = Column(Boolean, default=True)


class SatPackagingType(Base):
    __tablename__ = "sat_packaging_types"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)


class SatHazardousMaterial(Base):
    __tablename__ = "sat_hazardous_materials"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    descripcion = Column(Text, nullable=False)
    clase_div = Column(String(50), nullable=True)
    activo = Column(Boolean, default=True)


class SatStation(Base):
    __tablename__ = "sat_stations"
    id = Column(Integer, primary_key=True, index=True)
    clave_identificacion = Column(String(20), unique=True, index=True, nullable=False)
    descripcion = Column(String(255), nullable=False)
    clave_transporte = Column(String(10), nullable=True)
    nacionalidad = Column(String(50), nullable=True)
    activo = Column(Boolean, default=True)


class SatUnitWeight(Base):
    __tablename__ = "sat_unit_weights"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(10), unique=True, index=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    simbolo = Column(String(20), nullable=True)
    activo = Column(Boolean, default=True)
