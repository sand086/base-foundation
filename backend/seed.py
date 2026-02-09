"""
Seed Script for TMS Database (Refactored for Integer IDs)
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

# Create tables
models.Base.metadata.create_all(bind=engine)

def truncate_all(db):
    print("🧹 Limpiando base de datos (TRUNCATE CASCADE)...")
    tables = [
        "trip_timeline_events", "trips", "tariffs", "sub_clients",
        "operators", "tires", "units", "clients", "bulk_upload_history",
        "providers", "system_configs", "users", "roles",
    ]
    try:
        sql = f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE;"
        db.execute(text(sql))
        db.commit()
        print("✓ Base de datos limpiada")
    except Exception as e:
        db.rollback()
        print(f"⚠️  Error en Truncate: {e}. Intentando borrado manual...")
        # Fallback simple delete
        for model in [models.TripTimelineEvent, models.Trip, models.Tariff, models.SubClient, 
                      models.Operator, models.Tire, models.Unit, models.Client, 
                      models.BulkUploadHistory, models.Provider, models.User, models.Role]:
            db.query(model).delete()
        db.commit()

def get_or_create(db, model, defaults=None, **filters):
    instance = db.query(model).filter_by(**filters).first()
    if instance:
        return instance, False
    params = dict(filters)
    if defaults:
        params.update(defaults)
    instance = model(**params)
    db.add(instance)
    db.commit() # Commit inmediato para obtener el ID autogenerado
    db.refresh(instance)
    return instance, True

def seed_roles(db):
    roles = [
        {"key": "admin", "nombre": "Administrador", "permisos": {"all": True}},
        {"key": "operativo", "nombre": "Operativo", "permisos": {"flota": True, "viajes": True}},
        {"key": "finanzas", "nombre": "Finanzas", "permisos": {"finanzas": True}},
    ]
    for r in roles:
        get_or_create(db, models.Role, name_key=r["key"], defaults={"nombre": r["nombre"], "permisos": r["permisos"]})
    print("✓ Roles creados")

def seed_users(db):
    role_admin = db.query(models.Role).filter_by(name_key="admin").first()
    if not role_admin: return

    get_or_create(db, models.User, email="admin@transportes.com", defaults={
        "password_hash": get_password_hash("admin"),
        "nombre": "Administrador", "apellido": "Sistema",
        "role_id": role_admin.id,
        "is_2fa_enabled": False
    })
    print("✓ Usuario Admin creado")

def seed_client_sub_tariffs(db):
    # Client
    client, _ = get_or_create(db, models.Client, rfc="CLA021001AA1", defaults={
        "razon_social": "Corporativo Logístico Alfa S.A. de C.V.",
        "public_id": "CLI-001", # ID Visual legacy
        "estatus": models.ClientStatus.ACTIVO
    })

    # Subcliente
    sub1, _ = get_or_create(db, models.SubClient, nombre="Planta Norte Monterrey", client_id=client.id, defaults={
        "direccion": "Blvd. Diaz Ordaz 500", "ciudad": "Monterrey", "estado": "NL"
    })

    # Tarifas
    get_or_create(db, models.Tariff, sub_client_id=sub1.id, nombre_ruta="CDMX - Monterrey", tipo_unidad=models.UnitType.SENCILLO, defaults={
        "tarifa_base": 28500.00, "vigencia": date(2026, 12, 31)
    })
    print("✓ Clients y Tarifas creados")

def seed_units(db):
    # Unidad
    u1, _ = get_or_create(db, models.Unit, numero_economico="TR-204", defaults={
        "public_id": "UNIT-001",
        "placas": "AAA-000-A", "marca": "Freightliner", "modelo": "Cascadia",
        "tipo": models.UnitType.FULL, "status": models.UnitStatus.DISPONIBLE
    })
    print("✓ Unidades creadas")
    return u1

def seed_operators_trips(db, unit):
    # Operador
    op, _ = get_or_create(db, models.Operator, license_number="LIC-2024-78451", defaults={
        "public_id": "OP-001",
        "name": "Juan Pérez", "license_expiry": date(2026, 8, 15),
        "medical_check_expiry": date(2026, 3, 20),
        "assigned_unit_id": unit.id
    })

    # Viaje
    client = db.query(models.Client).first()
    sub = db.query(models.SubClient).first()
    
    if client and sub and unit and op:
        get_or_create(db, models.Trip, public_id="TRP-001", defaults={
            "client_id": client.id, "sub_client_id": sub.id,
            "unit_id": unit.id, "operator_id": op.id,
            "origin": "CDMX", "destination": "Monterrey",
            "tarifa_base": 28500.00, "start_date": datetime.utcnow()
        })
        print("✓ Operadores y Viajes creados")

def main():
    print("\n🚛 Iniciando Seed V2 (Auto-Incremental)...")
    db = SessionLocal()
    try:
        truncate_all(db)
        seed_roles(db)
        seed_users(db)
        seed_client_sub_tariffs(db)
        unit = seed_units(db)
        seed_operators_trips(db, unit)
        print("\n✅ Seed completado. BD lista con IDs numéricos.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()