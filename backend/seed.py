"""
Seed Script for TMS Database (Refactored for Integer IDs + Tires)
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
        "tire_history", "trip_timeline_events", "trips", "tariffs", "sub_clients",
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
        for model in [models.TireHistory, models.TripTimelineEvent, models.Trip, models.Tariff, models.SubClient, 
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
    db.commit() 
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
        "public_id": "CLI-001", 
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
    # Unidad 1
    u1, _ = get_or_create(db, models.Unit, numero_economico="TR-204", defaults={
        "public_id": "UNIT-001",
        "placas": "AAA-000-A", "marca": "Freightliner", "modelo": "Cascadia",
        "tipo": models.UnitType.FULL, "status": models.UnitStatus.DISPONIBLE
    })
    # Unidad 2
    u2, _ = get_or_create(db, models.Unit, numero_economico="R-050", defaults={
        "public_id": "UNIT-002",
        "placas": "BBB-111-B", "marca": "Kenworth", "modelo": "T680",
        "tipo": models.UnitType.SENCILLO, "status": models.UnitStatus.EN_RUTA
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

def seed_tires(db, unit):
    # Llanta 1 (Montada)
    t1, created = get_or_create(db, models.Tire, codigo_interno="LL-1001", defaults={
        "marca": "Michelin", "modelo": "X Multi", "medida": "295/80R22.5",
        "profundidad_original": 18.0, "profundidad_actual": 15.5,
        "unit_id": unit.id, "posicion": "Eje 1 Izq",
        "fecha_compra": date(2024, 1, 15), "precio_compra": 8500.00
    })
    
    if created:
        # Historial de compra
        h1 = models.TireHistory(
            tire_id=t1.id, fecha=datetime(2024, 1, 15), tipo="compra", 
            descripcion="Compra Inicial", costo=8500.00, responsable="Admin"
        )
        # Historial de montaje
        h2 = models.TireHistory(
            tire_id=t1.id, fecha=datetime(2024, 1, 20), tipo="montaje", 
            descripcion=f"Montaje en {unit.numero_economico}", 
            unidad_id=unit.id, unidad_economico=unit.numero_economico, 
            posicion="Eje 1 Izq", responsable="Taller"
        )
        db.add_all([h1, h2])
        db.commit()

    # Llanta 2 (Almacén)
    t2, _ = get_or_create(db, models.Tire, codigo_interno="LL-1002", defaults={
        "marca": "Bridgestone", "modelo": "R268", "medida": "11R22.5",
        "profundidad_original": 16.0, "profundidad_actual": 16.0,
        "unit_id": None, "posicion": None, # En almacén
        "fecha_compra": date(2024, 5, 10), "precio_compra": 7200.00
    })

    print("✓ Llantas e Historial creados")
    
def seed_maintenance(db):
    # 1. Mecánicos
    mec1, _ = get_or_create(db, models.Mechanic, nombre="Carlos Ruiz", defaults={
        "especialidad": "Motor Diesel", "activo": True
    })
    mec2, _ = get_or_create(db, models.Mechanic, nombre="Pedro Sánchez", defaults={
        "especialidad": "Sistema Eléctrico", "activo": True
    })
    print("✓ Mecánicos creados")

    # 2. Inventario (Refacciones)
    # Filtro de Aceite
    get_or_create(db, models.InventoryItem, sku="REF-001", defaults={
        "descripcion": "Filtro de Aceite Freightliner",
        "categoria": models.InventoryCategory.MOTOR,
        "stock_actual": 15, "stock_minimo": 5,
        "ubicacion": "Pasillo A-1", "precio_unitario": 450.00
    })
    
    # Balatas
    get_or_create(db, models.InventoryItem, sku="REF-002", defaults={
        "descripcion": "Juego de Balatas Traseras",
        "categoria": models.InventoryCategory.FRENOS,
        "stock_actual": 8, "stock_minimo": 4,
        "ubicacion": "Pasillo B-3", "precio_unitario": 1200.00
    })

    # Foco Led
    get_or_create(db, models.InventoryItem, sku="REF-003", defaults={
        "descripcion": "Foco LED H4",
        "categoria": models.InventoryCategory.ELECTRICO,
        "stock_actual": 50, "stock_minimo": 10,
        "ubicacion": "Caja Rápida", "precio_unitario": 180.00
    })
    
    print("✓ Inventario inicial creado")
    

def seed_suppliers(db):
    # Proveedor 1
    prov1, _ = get_or_create(db, models.Supplier, rfc="GOM980101KH2", defaults={
        "razon_social": "Gasolineras del Norte SA de CV",
        "categoria": "Combustible", "dias_credito": 15
    })
    
    # Proveedor 2
    prov2, _ = get_or_create(db, models.Supplier, rfc="REF880520H45", defaults={
        "razon_social": "Refacciones Diesel de Monterrey",
        "categoria": "Refacciones", "dias_credito": 30
    })
    print("✓ Proveedores creados")
    
    # Factura CxP Inicial
    if prov1:
        get_or_create(db, models.PayableInvoice, uuid="550e8400-e29b-41d4-a716-446655440000", defaults={
            "supplier_id": prov1.id,
            "monto_total": 25000.00, "saldo_pendiente": 25000.00,
            "fecha_emision": date(2024, 1, 10), "fecha_vencimiento": date(2024, 1, 25),
            "concepto": "Consumo Diesel Semana 2", "estatus": "pendiente"
        })
        print("✓ Facturas CxP creadas")

def main():
    print("\n🚛 Iniciando Seed V2 (Auto-Incremental + Llantas)...")
    db = SessionLocal()
    try:
        truncate_all(db)
        seed_roles(db)
        seed_users(db)
        seed_client_sub_tariffs(db)
        unit = seed_units(db)
        seed_operators_trips(db, unit)
        seed_tires(db, unit) # <--- Nueva función
        print("\n Seed completado con éxito.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()