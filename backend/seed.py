"""
Seed Script for TMS Database (UPDATED)
Run: python seed.py
"""

import sys
import os
sys.path.append(os.getcwd())

from datetime import date, datetime, timedelta
from sqlalchemy import text
from app.db.database import SessionLocal, engine
from app.models import models
from app.core.security import get_password_hash


# Create tables (siempre)
models.Base.metadata.create_all(bind=engine)


# -------------------------
# Helpers
# -------------------------
def truncate_all(db):
    """
    Limpia todas las tablas usando TRUNCATE ... CASCADE (rápido y evita orden FK)
    Nota: reinicia IDs (RESTART IDENTITY).
    """
    print("🧹 Limpiando base de datos (TRUNCATE CASCADE)...")

    # Ajusta el orden SOLO para evitar problemas raros en algunas configs,
    # pero CASCADE normalmente resuelve dependencias.
    tables = [
        "trip_timeline_events",
        "trips",
        "tariffs",
        "sub_clients",
        "operators",
        "tires",
        "units",
        "clients",
        "bulk_upload_history",
        "providers",
        "system_configs",
        "users",
        "roles",
    ]

    try:
        # TRUNCATE soporta lista separada por coma
        sql = f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE;"
        db.execute(text(sql))
        db.commit()
        print("✓ Base de datos limpiada")
    except Exception as e:
        db.rollback()
        print(f"⚠️  Advertencia al limpiar: {e}")
        # fallback: delete manual (por si alguna tabla no existe aún)
        clear_database_fallback(db)


def clear_database_fallback(db):
    """Fallback si TRUNCATE falla (por tablas inexistentes)"""
    print("🧹 Limpieza fallback (DELETE manual)...")
    try:
        # Hijos -> Padres
        for m in [
            getattr(models, "TripTimelineEvent", None),
            getattr(models, "Trip", None),
            getattr(models, "Tariff", None),
            getattr(models, "SubClient", None),
            getattr(models, "Operator", None),
            getattr(models, "Tire", None),
            getattr(models, "Unit", None),
            getattr(models, "Client", None),
            getattr(models, "BulkUploadHistory", None),
            getattr(models, "Provider", None),
            getattr(models, "SystemConfig", None),
            getattr(models, "User", None),
            getattr(models, "Role", None),
        ]:
            if m:
                db.query(m).delete()

        db.commit()
        print("✓ Base de datos limpiada (fallback)")
    except Exception as e:
        db.rollback()
        print(f"❌ Error limpiando fallback: {e}")
        raise


def get_or_create(db, model, defaults=None, **filters):
    """
    Devuelve (obj, created)
    """
    instance = db.query(model).filter_by(**filters).first()
    if instance:
        return instance, False
    params = dict(filters)
    if defaults:
        params.update(defaults)
    instance = model(**params)
    db.add(instance)
    return instance, True


# -------------------------
# Seeds
# -------------------------
def seed_roles(db):
    roles = [
        {
            "id": "admin",
            "nombre": "Administrador",
            "descripcion": "Acceso total al sistema",
            "permisos": {"all": True},
        },
        {
            "id": "operativo",
            "nombre": "Operativo",
            "descripcion": "Gestión de viajes y flota",
            "permisos": {"flota": True, "viajes": True},
        },
        {
            "id": "finanzas",
            "nombre": "Finanzas",
            "descripcion": "Facturación y cobranza",
            "permisos": {"finanzas": True},
        },
    ]

    created_any = False
    for r in roles:
        _, created = get_or_create(
            db,
            models.Role,
            id=r["id"],
            defaults={
                "nombre": r["nombre"],
                "descripcion": r["descripcion"],
                "permisos": r["permisos"],
            },
        )
        created_any = created_any or created

    print("✓ Roles creados" if created_any else "ℹ️  Roles ya existían")


def seed_users(db):
    # Admin
    admin, created = get_or_create(
        db,
        models.User,
        email="admin@transportes.com",
        defaults={
            "id": "USR-001",
            "password_hash": get_password_hash("admin"),
            "nombre": "Administrador",
            "apellido": "Sistema",
            "puesto": "Gerente General",
            "role_id": "admin",
            "activo": True,
            "is_2fa_enabled": False,
        },
    )
    if created:
        print("✓ Usuario Admin creado: admin@transportes.com / admin")
    else:
        print("ℹ️  Usuario Admin ya existía")


def seed_client_sub_tariffs(db):
    # Client
    client, created_client = get_or_create(
        db,
        models.Client,
        id="CLI-001",
        defaults={
            "razon_social": "Corporativo Logístico Alfa S.A. de C.V.",
            "rfc": "CLA021001AA1",
            "regimen_fiscal": "601",
            "uso_cfdi": "G03",
            "contacto_principal": "Lic. María García",
            "telefono": "55 1234 5678",
            "email": "mgarcia@corplogalf.com",
            "direccion_fiscal": "Av. Insurgentes Sur 1234, CDMX",
            "codigo_postal_fiscal": "03100",
            "estatus": models.ClientStatus.ACTIVO,
            "dias_credito": 30,
        },
    )

    # SubClient
    sub1, created_sub = get_or_create(
        db,
        models.SubClient,
        id="SUB-001-A",
        defaults={
            "client_id": client.id,
            "nombre": "Planta Norte Monterrey",
            "alias": "Planta Norte",
            "direccion": "Blvd. Díaz Ordaz 500",
            "ciudad": "Monterrey",
            "estado": "Nuevo León",
            "codigo_postal": "64000",
            "tipo_operacion": models.OperationType.NACIONAL,
            "estatus": "activo",
            "contacto": "Recepción",
            "telefono": "81 1111 2222",
            "horario_recepcion": "L-V 9:00-18:00",
            "dias_credito": 30,
            "requiere_contrato": False,
            "convenio_especial": False,
        },
    )

    # Tariff (SENCILLO)
    _, created_tariff = get_or_create(
        db,
        models.Tariff,
        id="TAR-001-A-1",
        defaults={
            "sub_client_id": sub1.id,
            "nombre_ruta": "CDMX - Monterrey",
            "tipo_unidad": models.UnitType.SENCILLO,
            "tarifa_base": 28500.00,
            "costo_casetas": 3500.00,
            "moneda": models.Currency.MXN,
            "vigencia": date(2026, 12, 31),
            "estatus": models.TariffStatus.ACTIVA,
        },
    )

    # Tariff (FULL)
    _, created_tariff2 = get_or_create(
        db,
        models.Tariff,
        id="TAR-001-A-2",
        defaults={
            "sub_client_id": sub1.id,
            "nombre_ruta": "CDMX - Monterrey",
            "tipo_unidad": models.UnitType.FULL,
            "tarifa_base": 42000.00,
            "costo_casetas": 4500.00,
            "moneda": models.Currency.MXN,
            "vigencia": date(2026, 12, 31),
            "estatus": models.TariffStatus.ACTIVA,
        },
    )

    if created_client or created_sub or created_tariff or created_tariff2:
        print("✓ Cliente/Subcliente/Tarifas creados")
    else:
        print("ℹ️  Cliente/Subcliente/Tarifas ya existían")


def seed_units_and_tires(db):
    """
    Unit.id ahora es Integer autoincrement.
    Debes llenar public_id (obligatorio) y NO setear id manualmente.
    """
    # Unit 1
    u1 = db.query(models.Unit).filter_by(public_id="UNIT-001").first()
    if not u1:
        u1 = models.Unit(
            public_id="UNIT-001",
            numero_economico="TR-204",
            placas="AAA-000-A",
            vin=None,
            marca="Freightliner",
            modelo="Cascadia",
            year=2022,
            tipo=models.UnitType.FULL,
            status=models.UnitStatus.DISPONIBLE,
            tipo_1="Tracto",
            tipo_carga="General",
            numero_serie_motor=None,
            marca_motor=None,
            capacidad_carga=25.0,
        )
        db.add(u1)

    # Unit 2
    u2 = db.query(models.Unit).filter_by(public_id="UNIT-002").first()
    if not u2:
        u2 = models.Unit(
            public_id="UNIT-002",
            numero_economico="TR-118",
            placas="BBB-111-B",
            vin=None,
            marca="Kenworth",
            modelo="T680",
            year=2021,
            tipo=models.UnitType.SENCILLO,
            status=models.UnitStatus.DISPONIBLE,
            tipo_1="Tracto",
            tipo_carga="General",
            capacidad_carga=18.0,
        )
        db.add(u2)

    db.flush()  # <- IMPORTANT: para que se asignen u1.id y u2.id

    # Tires (ejemplo simple: 4 llantas por unidad)
    def ensure_tire(unit_id: int, position: str):
        t = db.query(models.Tire).filter_by(unit_id=unit_id, position=position).first()
        if not t:
            db.add(
                models.Tire(
                    unit_id=unit_id,
                    position=position,
                    tire_id=None,
                    marca="Michelin",
                    modelo="X Multi",
                    profundidad=12.0,
                    presion=100.0,
                    estado="bueno",
                    renovado=0,
                )
            )

    for pos in ["LI", "LD", "RI", "RD"]:
        ensure_tire(u1.id, pos)
        ensure_tire(u2.id, pos)

    print("✓ Unidades y llantas creadas/actualizadas")


def seed_operators(db):
    op, created = get_or_create(
        db,
        models.Operator,
        id="OP-001",
        defaults={
            "name": "Juan Pérez González",
            "license_number": "LIC-2024-78451",
            "license_type": "E",
            "license_expiry": date(2026, 8, 15),
            "medical_check_expiry": date(2026, 3, 20),
            "phone": "55 9999 8888",
            "status": models.OperatorStatus.ACTIVO,
            "assigned_unit_id": None,  # lo asignamos después si quieres
        },
    )

    # Asignar unidad al operador (ejemplo)
    unit = db.query(models.Unit).filter_by(public_id="UNIT-002").first()
    if unit and op.assigned_unit_id != unit.id:
        op.assigned_unit_id = unit.id

    print("✓ Operadores creados/actualizados" if created else "ℹ️  Operador ya existía (se actualizó asignación)")


def seed_system_configs(db):
    items = [
        ("empresa.nombre", "Transportes TMS Demo", "general", "string", True),
        ("empresa.rfc", "TMS010101AA1", "legal", "string", False),
        ("smtp.host", "smtp.gmail.com", "notificaciones", "string", False),
    ]
    created_any = False
    for key, value, grupo, tipo, is_public in items:
        _, created = get_or_create(
            db,
            models.SystemConfig,
            key=key,
            defaults={"value": value, "grupo": grupo, "tipo": tipo, "is_public": is_public},
        )
        created_any = created_any or created

    print("✓ SystemConfig creado" if created_any else "ℹ️  SystemConfig ya existía")


def seed_providers(db):
    prov, created = get_or_create(
        db,
        models.Provider,
        id="PROV-001",
        defaults={
            "razon_social": "Casetas y Peajes del Norte S.A. de C.V.",
            "rfc": "CPN010101AA1",
            "email": "facturas@casetasnorte.com",
            "telefono": "81 2222 3333",
            "direccion": "Monterrey, NL",
            "dias_credito": 15,
        },
    )
    print("✓ Proveedor creado" if created else "ℹ️  Proveedor ya existía")


def seed_trips(db):
    """
    Trip depende de Client/SubClient/Unit(int)/Operator/Tariff
    """
    trip_exists = db.query(models.Trip).filter_by(id="TRP-001").first()
    if trip_exists:
        print("ℹ️  Trip ya existía")
        return

    client = db.query(models.Client).filter_by(id="CLI-001").first()
    sub = db.query(models.SubClient).filter_by(id="SUB-001-A").first()
    unit = db.query(models.Unit).filter_by(public_id="UNIT-002").first()
    op = db.query(models.Operator).filter_by(id="OP-001").first()
    tariff = db.query(models.Tariff).filter_by(id="TAR-001-A-1").first()

    if not all([client, sub, unit, op]):
        print("⚠️  No se pudo crear Trip: faltan dependencias (client/sub/unit/operator).")
        return

    start = datetime.utcnow()
    eta = start + timedelta(hours=16)

    trip = models.Trip(
        id="TRP-001",
        client_id=client.id,
        sub_client_id=sub.id,
        unit_id=unit.id,  # <- int
        operator_id=op.id,
        tariff_id=tariff.id if tariff else None,
        origin="CDMX",
        destination="Monterrey, NL",
        route_name="CDMX - Monterrey",
        status=models.TripStatus.CREADO,
        tarifa_base=28500.00,
        costo_casetas=3500.00,
        anticipo_casetas=1500.00,
        anticipo_viaticos=800.00,
        anticipo_combustible=3000.00,
        otros_anticipos=0.00,
        saldo_operador=28500.00 - (1500.00 + 800.00 + 3000.00),
        start_date=start,
        estimated_arrival=eta,
        last_location="CDMX",
    )
    db.add(trip)
    db.flush()

    # Timeline events
    events = [
        ("Viaje creado", "info"),
        ("Unidad asignada", "checkpoint"),
        ("Operador asignado", "checkpoint"),
    ]
    for i, (ev, ev_type) in enumerate(events):
        db.add(
            models.TripTimelineEvent(
                trip_id=trip.id,
                time=start + timedelta(minutes=5 * i),
                event=ev,
                event_type=ev_type,
            )
        )

    print("✓ Trip y timeline creados")


# -------------------------
# Main
# -------------------------
def main():
    print("\n🚛 Iniciando seed de TMS Database (UPDATED)...\n")
    db = SessionLocal()
    try:
        # Limpieza
        truncate_all(db)

        # Orden correcto
        seed_roles(db)
        seed_users(db)

        seed_system_configs(db)
        seed_providers(db)

        seed_client_sub_tariffs(db)
        seed_units_and_tires(db)
        seed_operators(db)
        seed_trips(db)

        db.commit()
        print("\n✅ Seed completado exitosamente!")
        print("\n🚀 Listo para usar: uvicorn app.main:app --reload")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
