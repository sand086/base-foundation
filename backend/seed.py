"""
Seed Script for TMS Database
Populates initial test data
Run: python seed.py
"""

import sys
import os

# Agregamos el directorio actual al path para poder importar 'app'
sys.path.append(os.getcwd())

from datetime import date, datetime, timedelta
from app.db.database import SessionLocal, engine  # <--- Ajustado
from app.models import models  # <--- Ajustado para la nueva estructura

# Create tables
models.Base.metadata.create_all(bind=engine)


def clear_database(db):
    """Limpia todas las tablas en orden correcto (foreign keys)"""
    print("🧹 Limpiando base de datos...")
    try:
        # Orden inverso a la creación para evitar conflictos de FK
        db.query(models.TripTimelineEvent).delete()
        db.query(models.Trip).delete()
        db.query(models.Tariff).delete()
        db.query(models.SubClient).delete()
        db.query(models.Operator).delete()
        db.query(models.Unit).delete()
        db.query(models.Client).delete()
        # Si agregaste Providers (Proveedores), añádelo aquí también:
        # db.query(models.Provider).delete()
        db.commit()
        print("✓ Base de datos limpiada")
    except Exception as e:
        db.rollback()
        print(f"⚠️  Advertencia al limpiar: {e}")


def seed_client(db):
    """Crea cliente de prueba con subclientes y tarifas"""
    # Verificar si ya existe para no duplicar error
    if db.query(models.Client).filter_by(id="CLI-001").first():
        print("ℹ️  El cliente CLI-001 ya existe.")
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
        direccion_fiscal="Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, CP 03100",
        estatus=models.ClientStatus.ACTIVO,
        dias_credito=30,
    )
    db.add(client)

    # Subcliente 1: Planta Norte Monterrey
    sub1 = models.SubClient(
        id="SUB-001-A",
        client_id="CLI-001",
        nombre="Planta Norte Monterrey",
        alias="Planta Norte",
        direccion="Blvd. Díaz Ordaz 500",
        ciudad="Monterrey",
        estado="Nuevo León",
        codigo_postal="64000",
        tipo_operacion=models.OperationType.NACIONAL,
        contacto="Ing. Roberto Salinas",
        telefono="81 5555 4444",
        horario_recepcion="Lun-Vie 7:00-17:00",
        estatus="activo",
        dias_credito=30,
        requiere_contrato=True,
    )
    db.add(sub1)

    # Tarifas para Planta Norte
    tariff1 = models.Tariff(
        id="TAR-001-A-1",
        sub_client_id="SUB-001-A",
        nombre_ruta="CDMX - Monterrey (Vía Saltillo)",
        tipo_unidad=models.UnitType.SENCILLO,
        tarifa_base=28500.00,
        costo_casetas=3200.00,
        moneda=models.Currency.MXN,
        vigencia=date(2025, 12, 31),
        estatus=models.TariffStatus.ACTIVA,
    )
    db.add(tariff1)

    tariff2 = models.Tariff(
        id="TAR-001-A-2",
        sub_client_id="SUB-001-A",
        nombre_ruta="CDMX - Monterrey (Vía Saltillo)",
        tipo_unidad=models.UnitType.FULL,
        tarifa_base=42000.00,
        costo_casetas=4800.00,
        moneda=models.Currency.MXN,
        vigencia=date(2025, 12, 31),
        estatus=models.TariffStatus.ACTIVA,
    )
    db.add(tariff2)

    # Subcliente 2: CEDIS Sur
    sub2 = models.SubClient(
        id="SUB-001-B",
        client_id="CLI-001",
        nombre="Centro de Distribución Sur",
        alias="CEDIS Sur",
        direccion="Carr. Tlalpan 3456",
        ciudad="CDMX",
        estado="Ciudad de México",
        codigo_postal="14000",
        tipo_operacion=models.OperationType.NACIONAL,
        contacto="Lic. Ana Torres",
        telefono="55 3333 2222",
        horario_recepcion="Lun-Sab 6:00-22:00",
        estatus="activo",
        dias_credito=15,
    )
    db.add(sub2)

    # Tarifas para CEDIS Sur
    tariff3 = models.Tariff(
        id="TAR-001-B-1",
        sub_client_id="SUB-001-B",
        nombre_ruta="Veracruz - CDMX (Vía Xalapa)",
        tipo_unidad=models.UnitType.SENCILLO,
        tarifa_base=18000.00,
        costo_casetas=1800.00,
        moneda=models.Currency.MXN,
        vigencia=date(2025, 12, 31),
        estatus=models.TariffStatus.ACTIVA,
    )
    db.add(tariff3)

    tariff4 = models.Tariff(
        id="TAR-001-B-2",
        sub_client_id="SUB-001-B",
        nombre_ruta="Veracruz - CDMX (Vía Xalapa)",
        tipo_unidad=models.UnitType.FULL,
        tarifa_base=26500.00,
        costo_casetas=2400.00,
        moneda=models.Currency.MXN,
        vigencia=date(2025, 12, 31),
        estatus=models.TariffStatus.ACTIVA,
    )
    db.add(tariff4)

    print("✓ Cliente con 2 subclientes y 4 tarifas creado")


def seed_units(db):
    """Crea unidades de prueba"""
    if db.query(models.Unit).first():
        print("ℹ️  Las unidades ya existen.")
        return

    units = [
        models.Unit(
            id="UNIT-001",
            numero_economico="TR-204",
            placas="AAA-000-A",
            vin="1FUJGLDR5CLBP8834",
            marca="Freightliner",
            modelo="Cascadia",
            year=2022,
            tipo=models.UnitType.FULL,
            status=models.UnitStatus.DISPONIBLE,
            documentos_vencidos=0,
            llantas_criticas=0,
            seguro_vence=date(2025, 6, 15),
            verificacion_vence=date(2025, 3, 20),
            permiso_sct_vence=date(2025, 12, 31),
        ),
        models.Unit(
            id="UNIT-002",
            numero_economico="TR-118",
            placas="BBB-111-B",
            vin="1XKWD49X7GR123456",
            marca="Kenworth",
            modelo="T680",
            year=2021,
            tipo=models.UnitType.SENCILLO,
            status=models.UnitStatus.DISPONIBLE,
            documentos_vencidos=0,
            llantas_criticas=0,
            seguro_vence=date(2025, 8, 30),
            verificacion_vence=date(2025, 5, 15),
            permiso_sct_vence=date(2025, 12, 31),
        ),
        models.Unit(
            id="UNIT-003",
            numero_economico="TR-410",
            placas="CCC-222-C",
            vin="1XPWD40X1ED123789",
            marca="Peterbilt",
            modelo="579",
            year=2021,
            tipo=models.UnitType.FULL,
            status=models.UnitStatus.BLOQUEADO,
            documentos_vencidos=2,
            llantas_criticas=0,
            seguro_vence=date(2024, 12, 15),  # Vencido
            verificacion_vence=date(2024, 11, 30),  # Vencido
            permiso_sct_vence=date(2025, 12, 31),
        ),
    ]

    for unit in units:
        db.add(unit)

    print(f"✓ {len(units)} unidades creadas (1 bloqueada por documentos vencidos)")


def seed_operators(db):
    """Crea operadores de prueba"""
    if db.query(models.Operator).first():
        print("ℹ️  Los operadores ya existen.")
        return

    today = date.today()

    operators = [
        models.Operator(
            id="OP-001",
            name="Juan Pérez González",
            license_number="LIC-2024-78451",
            license_type="E",
            license_expiry=date(2025, 8, 15),  # Vigente
            medical_check_expiry=date(2025, 3, 20),  # Vigente
            phone="+52 55 1234 5678",
            status=models.OperatorStatus.ACTIVO,
            assigned_unit_id=None,
            hire_date=date(2019, 3, 15),
            emergency_contact="María González",
            emergency_phone="+52 55 8765 4321",
        ),
        models.Operator(
            id="OP-002",
            name="Fernando García Vega",
            license_number="LIC-2023-65234",
            license_type="E",
            license_expiry=today + timedelta(days=15),  # Por vencer en 15 días
            medical_check_expiry=date(2025, 6, 10),
            phone="+52 55 2345 6789",
            status=models.OperatorStatus.ACTIVO,
            assigned_unit_id=None,
            hire_date=date(2020, 7, 22),
            emergency_contact="Laura Vega",
            emergency_phone="+52 55 9876 5432",
        ),
        models.Operator(
            id="OP-003",
            name="Roberto Martínez López",
            license_number="LIC-2022-41256",
            license_type="D",
            license_expiry=date(2024, 12, 15),  # Vencida
            medical_check_expiry=date(2024, 11, 30),  # Vencida
            phone="+52 55 3456 7890",
            status=models.OperatorStatus.INACTIVO,
            assigned_unit_id=None,
            hire_date=date(2018, 1, 10),
            emergency_contact="Ana López",
            emergency_phone="+52 55 0987 6543",
        ),
    ]

    for op in operators:
        db.add(op)

    print(f"✓ {len(operators)} operadores creados (1 con licencia vencida)")


def main():
    print("\n🚛 Iniciando seed de TMS Database...\n")

    db = SessionLocal()

    try:
        # Opcional: comentar clear_database si no quieres borrar todo cada vez
        clear_database(db)
        seed_client(db)
        seed_units(db)
        seed_operators(db)

        db.commit()
        print("\n✅ Seed completado exitosamente!")
        print(
            "\n🚀 Listo para usar: uvicorn app.main:app --reload"
        )  # Nota el cambio en el comando de ejecución

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
