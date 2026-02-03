"""
Seed Script for TMS Database
Populates initial test data
Run: python seed.py
"""

import sys
import os

# Agregamos el directorio actual al path
sys.path.append(os.getcwd())

from datetime import date, datetime, timedelta
from app.db.database import SessionLocal, engine
from app.models import models
from app.core.security import get_password_hash

# Create tables
models.Base.metadata.create_all(bind=engine)


def clear_database(db):
    """Limpia todas las tablas en orden correcto (foreign keys)"""
    print("🧹 Limpiando base de datos...")
    try:
        # Orden inverso a la creación (Hijos primero, luego Padres)
        db.query(models.TripTimelineEvent).delete()
        db.query(models.Trip).delete()
        db.query(models.Tariff).delete()
        db.query(models.SubClient).delete()
        db.query(models.Operator).delete()
        db.query(models.Unit).delete()
        db.query(models.Client).delete()

        # Primero borramos usuarios, luego roles (porque Usuario depende de Rol)
        db.query(models.User).delete()
        db.query(models.Role).delete()

        db.commit()
        print("✓ Base de datos limpiada")
    except Exception as e:
        db.rollback()
        print(f"⚠️  Advertencia al limpiar: {e}")


def seed_roles(db):
    """Crea los roles del sistema (Requisito para crear usuarios)"""
    if db.query(models.Role).filter_by(id="admin").first():
        print("ℹ️  Los roles ya existen.")
        return

    roles = [
        models.Role(
            id="admin",
            nombre="Administrador",
            descripcion="Acceso total al sistema",
            permisos={"all": True},
        ),
        models.Role(
            id="operativo",
            nombre="Operativo",
            descripcion="Gestión de viajes y flota",
            permisos={"flota": True, "viajes": True},
        ),
        models.Role(
            id="finanzas",
            nombre="Finanzas",
            descripcion="Facturación y cobranza",
            permisos={"finanzas": True},
        ),
    ]

    for role in roles:
        db.add(role)

    print("✓ Roles creados (Admin, Operativo, Finanzas)")


def seed_users(db):
    """Crea usuario administrador"""
    if db.query(models.User).filter_by(email="admin@transportes.com").first():
        print("ℹ️  El usuario admin ya existe.")
        return

    # Usamos "admin" directo como contraseña para desarrollo
    admin_user = models.User(
        id="USR-001",
        email="admin@transportes.com",
        password_hash=get_password_hash("admin"),
        nombre="Administrador",
        apellido="Sistema",
        puesto="Gerente General",
        role_id="admin",  # <--- Esto ahora funcionará porque seed_roles corrió antes
        activo=True,
        is_2fa_enabled=False,
    )
    db.add(admin_user)
    print("✓ Usuario Admin creado: admin@transportes.com / admin")


def seed_client(db):
    """Crea cliente de prueba con subclientes y tarifas"""
    if db.query(models.Client).filter_by(id="CLI-001").first():
        return

    client = models.Client(
        id="CLI-001",
        razon_social="Corporativo Logístico Alfa S.A. de C.V.",
        rfc="CLA021001AA1",
        regimen_fiscal="601",
        uso_cfdi="G03",
        contacto_principal="Lic. María García",
        telefono="55 1234 5678",
        email="mgarcia@corplogalf.com",
        direccion_fiscal="Av. Insurgentes Sur 1234, CDMX",
        estatus=models.ClientStatus.ACTIVO,
        dias_credito=30,
    )
    db.add(client)

    # Subcliente 1
    sub1 = models.SubClient(
        id="SUB-001-A",
        client_id="CLI-001",
        nombre="Planta Norte Monterrey",
        alias="Planta Norte",
        direccion="Blvd. Díaz Ordaz 500",
        ciudad="Monterrey",
        estado="Nuevo León",
        tipo_operacion=models.OperationType.NACIONAL,
        estatus="activo",
    )
    db.add(sub1)

    # Tarifas
    tariff1 = models.Tariff(
        id="TAR-001-A-1",
        sub_client_id="SUB-001-A",
        nombre_ruta="CDMX - Monterrey",
        tipo_unidad=models.UnitType.SENCILLO,
        tarifa_base=28500.00,
        moneda=models.Currency.MXN,
        vigencia=date(2025, 12, 31),
    )
    db.add(tariff1)

    print("✓ Cliente con subclientes y tarifas creado")


def seed_units(db):
    if db.query(models.Unit).first():
        return

    units = [
        models.Unit(
            id="UNIT-001",
            numero_economico="TR-204",
            placas="AAA-000-A",
            marca="Freightliner",
            modelo="Cascadia",
            year=2022,
            tipo=models.UnitType.FULL,
            status=models.UnitStatus.DISPONIBLE,
        ),
        models.Unit(
            id="UNIT-002",
            numero_economico="TR-118",
            placas="BBB-111-B",
            marca="Kenworth",
            modelo="T680",
            year=2021,
            tipo=models.UnitType.SENCILLO,
            status=models.UnitStatus.DISPONIBLE,
        ),
    ]
    for u in units:
        db.add(u)
    print("✓ Unidades creadas")


def seed_operators(db):
    if db.query(models.Operator).first():
        return

    op = models.Operator(
        id="OP-001",
        name="Juan Pérez González",
        license_number="LIC-2024-78451",
        license_type="E",
        license_expiry=date(2025, 8, 15),
        medical_check_expiry=date(2025, 3, 20),
        status=models.OperatorStatus.ACTIVO,
    )
    db.add(op)
    print("✓ Operadores creados")


def main():
    print("\n🚛 Iniciando seed de TMS Database...\n")
    db = SessionLocal()
    try:
        clear_database(db)  # Limpia todo primero

        # --- EL ORDEN IMPORTA ---
        seed_roles(db)  # 1. Crear Roles (indispensable para usuarios)
        seed_users(db)  # 2. Crear Usuarios
        seed_client(db)  # 3. Crear Clientes (Padres de tarifas)
        seed_units(db)  # 4. Crear Unidades
        seed_operators(db)  # 5. Crear Operadores

        db.commit()
        print("\n✅ Seed completado exitosamente!")
        print("\n🚀 Listo para usar: uvicorn app.main:app --reload")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        # raise # Opcional: comentar si quieres ver solo el print
    finally:
        db.close()


if __name__ == "__main__":
    main()
