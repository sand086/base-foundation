import traceback
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from fastapi import HTTPException
from datetime import datetime, timedelta, date

from app.models import models
from app.models.models import RecordStatus  # <-- Importante para el filtro
from . import schemas

# =====================================================================
# TREASURY & BANKS (Cuentas y Tesorería)
# =====================================================================


def get_bank_accounts(db: Session):
    """Obtiene solo las cuentas bancarias activas (Oculta las archivadas y eliminadas)"""
    return (
        db.query(models.BankAccount)
        .filter(
            models.BankAccount.estatus == "activo",
            models.BankAccount.record_status != RecordStatus.ELIMINADO,
        )
        .all()
    )


def create_bank_account(db: Session, account: schemas.BankAccountCreate, user_id: int):
    """Crea una nueva cuenta bancaria."""
    db_account = models.BankAccount(**account.model_dump(), created_by_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


def update_bank_account(db: Session, account_id: int, account_data: dict, user_id: int):
    """
    Actualiza parcialmente los datos de una cuenta bancaria.
    Si trae 'saldo' (por ajuste manual de administrador), también lo afectará.
    """
    account = (
        db.query(models.BankAccount)
        .filter(
            models.BankAccount.id == account_id,
            models.BankAccount.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not account:
        return None

    for key, value in account_data.items():
        if hasattr(account, key) and value is not None:
            setattr(account, key, value)

    db.commit()
    db.refresh(account)
    return account


def delete_bank_account(db: Session, account_id: int):
    """
    Realiza un SOFT DELETE (Archivado) de la cuenta bancaria.
    No se elimina de la base de datos para no romper reportes históricos.
    """
    account = (
        db.query(models.BankAccount)
        .filter(
            models.BankAccount.id == account_id,
            models.BankAccount.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not account:
        return False

    # MAGIA: SOFT DELETE
    account.estatus = "inactivo"
    account.record_status = RecordStatus.ELIMINADO

    db.commit()
    return True


def get_bank_movements(db: Session):
    try:
        return (
            db.query(models.BankMovement)
            .options(joinedload(models.BankMovement.bank_account))
            .filter(
                models.BankMovement.record_status != RecordStatus.ELIMINADO,
                models.BankMovement.monto > 0,  # <--- MAGIA: OCULTA TODOS LOS DE $0.00
                ~models.BankMovement.concepto.ilike("%Reverso de Cobro Anulado%"),
            )
            .order_by(models.BankMovement.fecha.desc())
            .all()
        )
    except Exception as e:
        print(
            f"Error en get_bank_movements: {e} el problema es de que si vopy atener movimientos con mononto en 0 po lo de cuentas por pagar "
        )
        raise e


def create_bank_movement(
    db: Session, movement_data: schemas.BankMovementCreate, current_user_id: int
):
    """
    Registra un movimiento bancario y actualiza el saldo de la cuenta.
    Esta función es el corazón del módulo de Treasury.
    """
    # Bloqueo de fila ESPECÍFICO para evitar el error del LEFT JOIN en Postgres
    account = (
        db.query(models.BankAccount)
        .filter(
            models.BankAccount.id == movement_data.bank_account_id,
            models.BankAccount.record_status != RecordStatus.ELIMINADO,
        )
        .with_for_update(of=models.BankAccount)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada.")

    # Lógica de saldos
    if movement_data.tipo == "ingreso":
        account.saldo += movement_data.monto
    elif movement_data.tipo == "egreso":
        account.saldo -= movement_data.monto

    # 🚨 EXTRAEMOS LA FECHA (Si no viene, usamos la de hoy para proteger la BD)
    fecha_mov = getattr(movement_data, "fecha", None)
    if not fecha_mov:
        from datetime import datetime

        fecha_mov = datetime.now()

    nuevo_movimiento = models.BankMovement(
        bank_account_id=account.id,
        tipo=movement_data.tipo,
        monto=movement_data.monto,
        concepto=movement_data.concepto,
        referencia=movement_data.referencia,
        origen_modulo=getattr(
            movement_data, "origen_modulo", None
        ),  #  FIX: Aseguramos el módulo (CxC o CxP)
        fecha=fecha_mov,
        created_by_id=current_user_id,
    )

    db.add(nuevo_movimiento)
    db.flush()  # Para que el ID esté disponible pero sin cerrar la transacción aún
    return nuevo_movimiento


# =====================================================================
# INVOICES (Facturación y CXP)
# =====================================================================


def process_bulk_payables(db: Session, payload_data: list[dict]):
    """
    Procesa un array de diccionarios proveniente del Excel del SAT.
    Reglas de negocio:
    1. Evita duplicados por UUID.
    2. Crea el proveedor automáticamente si no existe por RFC.
    3. Calcula fecha de vencimiento basada en días de crédito.
    4. Hereda automáticamente el Centro de Costos (CECO) asignado al proveedor.
    """
    facturas_creadas = 0
    proveedores_creados = 0

    for item in payload_data:
        rfc = str(item.get("rfc_emisor") or "").strip()
        nombre = str(item.get("nombre_emisor") or "").strip()
        uuid_fiscal = str(item.get("uuid") or "").strip()

        # Ignorar filas vacías o inválidas
        if not rfc or not uuid_fiscal:
            continue

        # 1. EVITAR DUPLICADOS
        existing_invoice = (
            db.query(models.PayableInvoice)
            .filter(
                models.PayableInvoice.uuid == uuid_fiscal,
                models.PayableInvoice.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )
        if existing_invoice:
            continue  # Ya existe, nos la saltamos

        # 2. GESTIÓN DEL PROVEEDOR (FIX: El modelo correcto es Supplier)
        supplier = (
            db.query(models.Supplier)
            .filter(
                models.Supplier.rfc == rfc,
                models.Supplier.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )

        # Obtener días de crédito (del Excel o 0 por defecto)
        try:
            dias_credito_excel = int(item.get("dias_credito") or 0)
        except (ValueError, TypeError):
            dias_credito_excel = 0

        if not supplier:
            # Crear proveedor al vuelo usando el Enum correcto
            supplier = models.Supplier(
                razon_social=nombre,
                rfc=rfc,
                dias_credito=dias_credito_excel,
                estatus=models.SupplierStatus.ACTIVO,  # FIX: Enum estricto
            )
            db.add(supplier)
            db.flush()  # Guardar temporalmente para obtener el ID
            proveedores_creados += 1

        # Los días de crédito finales son los del proveedor o los del Excel
        dias_finales = (
            dias_credito_excel
            if dias_credito_excel > 0
            else (supplier.dias_credito or 0)
        )

        # 3. GESTIÓN DE FECHAS
        fecha_str = str(item.get("fecha_emision") or "")
        try:
            fecha_obj = datetime.fromisoformat(fecha_str.replace("Z", "").split(" ")[0])
        except ValueError:
            fecha_obj = datetime.utcnow()

        vencimiento = fecha_obj + timedelta(days=dias_finales)

        # 4. GESTIÓN DE MONTOS
        try:
            subtotal = float(item.get("subtotal") or 0)
            total = float(item.get("total") or 0)
        except (ValueError, TypeError):
            subtotal = 0.0
            total = 0.0

        # ========================================================
        # NUEVO FASE 3.2: HERENCIA AUTOMÁTICA DEL CENTRO DE COSTOS
        # ========================================================
        ceco_heredado = getattr(supplier, "cost_center_id", None)

        # 5. CREACIÓN DE FACTURA (CXP)
        concepto = str(item.get("concepto") or "Factura importada del SAT")

        invoice = models.PayableInvoice(
            supplier_id=supplier.id,
            cost_center_id=ceco_heredado,  # <--- INYECCIÓN DEL CECO AQUÍ
            uuid=uuid_fiscal,
            folio=str(item.get("folio") or ""),
            concepto=concepto[:200],  # Truncar por si viene muy largo
            monto_total=total,
            saldo_pendiente=total,  # Al importarse, se debe todo
            fecha_emision=fecha_obj.date(),
            fecha_vencimiento=vencimiento.date(),
            moneda=str(item.get("moneda") or "MXN").strip()[:3],
            estatus=models.InvoiceStatus.PENDIENTE,  # FIX: Enum Estricto
            clasificacion="gasto_indirecto_variable",  # Clasificación por defecto al subir
        )
        db.add(invoice)
        facturas_creadas += 1

    # Guardar todos los cambios en la BD
    db.commit()

    return {
        "message": f"Se procesaron con éxito {facturas_creadas} facturas y se crearon {proveedores_creados} proveedores nuevos."
    }


# =====================================================================
# PAGOS A PROVEEDORES Y CAJA CHICA
# PAYMENTS (InvoicePayment) & TREASURY BRIDGE
# =========================================================


def register_payable_payment(
    db: Session, invoice_id: int, payment_data: dict, user_id: int
):
    """
    Registra un pago a un proveedor de forma ATÓMICA.
    Si no se proporciona una cuenta bancaria (bank_account_id = None),
    se registrará automáticamente en una "Caja General" virtual para auditoría de Tesorería.
    """
    try:
        # Bloqueo de fila para evitar Race Conditions (Doble cobro simultáneo)
        invoice = (
            db.query(models.PayableInvoice)
            .filter(
                models.PayableInvoice.id == invoice_id,
                models.PayableInvoice.record_status != RecordStatus.ELIMINADO,
            )
            .with_for_update(of=models.PayableInvoice)
            .first()
        )
        if not invoice:
            raise ValueError("Factura no encontrada.")

        #  FIX SEGURIDAD: Bloqueo para no inyectar pagos a facturas canceladas
        if invoice.estatus == models.InvoiceStatus.CANCELADO:
            raise ValueError(
                "No puedes registrar pagos a una factura que ha sido Cancelada."
            )

        monto_pago = float(payment_data.get("monto", 0))
        if monto_pago <= 0 or monto_pago > invoice.saldo_pendiente:
            raise ValueError("El monto es inválido o supera el saldo pendiente.")

        bank_account_id = payment_data.get("bank_account_id")

        # LOGICA CRÍTICA: Si NO hay cuenta de retiro, creamos/buscamos la "Caja General"
        if not bank_account_id:
            caja_general = (
                db.query(models.BankAccount)
                .filter(
                    models.BankAccount.alias == "Caja General Virtual",
                    models.BankAccount.record_status != RecordStatus.ELIMINADO,
                )
                .first()
            )
            if not caja_general:
                caja_general = models.BankAccount(
                    banco="Efectivo / Virtual",
                    numero_cuenta="0000000000",
                    alias="Caja General Virtual",
                    tipo_cuenta="virtual",
                    saldo=0.0,
                    created_by_id=user_id,
                )
                db.add(caja_general)
                db.flush()  # Guardamos temporalmente para obtener su ID
            bank_account_id = caja_general.id

        # ======================================================
        #   1. Crear el registro del abono
        # ======================================================
        nuevo_pago = models.InvoicePayment(
            invoice_id=invoice.id,
            bank_account_id=bank_account_id,
            fecha_pago=payment_data.get("fecha_pago", date.today()),
            monto=monto_pago,
            parcialidad=int(payment_data.get("parcialidad", 1)),
            saldo_anterior=float(
                payment_data.get("saldo_anterior") or invoice.saldo_pendiente
            ),
            saldo_insoluto=float(
                payment_data.get("saldo_insoluto")
                or max(0, invoice.saldo_pendiente - monto_pago)
            ),
            metodo_pago=payment_data.get("metodo_pago", "TRANSFERENCIA"),
            referencia=payment_data.get("referencia", ""),
            cuenta_retiro=payment_data.get("cuenta_retiro", ""),
            complemento_uuid=payment_data.get("complemento_uuid"),
            created_by_id=user_id,
        )
        db.add(nuevo_pago)

        # 2. Descontar el saldo de la factura
        invoice.saldo_pendiente -= monto_pago
        if invoice.saldo_pendiente <= 0.01:
            invoice.saldo_pendiente = 0.0
            invoice.estatus = models.InvoiceStatus.PAGADO
        else:
            invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        # 3. Crear el Egreso en Tesorería (Flujo de Caja)
        #  FIX: AÑADIMOS origen_modulo="CxP" PARA TESORERÍA
        mov_schema = schemas.BankMovementCreate(
            bank_account_id=bank_account_id,
            tipo="egreso",
            monto=monto_pago,
            concepto=f"Pago CxP - Fra. {invoice.folio_interno or invoice.uuid[:8]}",
            referencia=payment_data.get("referencia", ""),
            origen_modulo="CxP",
        )
        create_bank_movement(db, mov_schema, user_id)

        # Confirmamos la transacción
        db.commit()
        db.refresh(invoice)
        return invoice

    except Exception as e:
        # ATOMICIDAD: Si algo falla, echamos todo para atrás
        db.rollback()
        print("\n" + "=" * 50)
        print("💥 ERROR EN REGISTER_PAYABLE_PAYMENT 💥")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise e


def register_petty_cash_expense(db: Session, expense_data: dict, user_id: int):
    """
    Registra un gasto directo (Caja Chica) sin factura de por medio.
    """
    bank_account_id = expense_data.get("bank_account_id")
    if not bank_account_id:
        raise ValueError("Se requiere una cuenta bancaria origen para la Caja Chica.")

    mov_schema = schemas.BankMovementCreate(
        bank_account_id=int(bank_account_id),
        tipo="egreso",
        monto=float(expense_data.get("monto", 0)),
        concepto=f"Caja Chica / Gasto: {expense_data.get('concepto')}",
        referencia=expense_data.get("referencia", "S/F"),
    )
    movimiento = create_bank_movement(db, mov_schema, user_id)
    db.commit()
    return movimiento


def create_manual_receivable(db: Session, data: dict, user_id: int):
    import time
    from datetime import datetime, date

    # Generamos un folio provisional en lo que el sistema la timbra con el SAT
    folio = f"MNL-{int(time.time())}"

    conceptos = data.get("conceptos", [])
    concepto_general = (
        conceptos[0].get("descripcion", "Factura Manual")
        if conceptos
        else "Servicio de Transporte"
    )

    fecha_emision_str = data.get("fecha_emision")
    fecha_vencimiento_str = data.get("fecha_vencimiento")

    try:
        emision_obj = (
            datetime.strptime(fecha_emision_str, "%Y-%m-%d").date()
            if fecha_emision_str
            else date.today()
        )
        vencimiento_obj = (
            datetime.strptime(fecha_vencimiento_str, "%Y-%m-%d").date()
            if fecha_vencimiento_str
            else date.today()
        )
    except Exception:
        emision_obj = date.today()
        vencimiento_obj = date.today()

    nueva_factura = models.ReceivableInvoice(
        client_id=int(data.get("client_id")),
        folio_interno=folio,
        concepto=concepto_general,
        subtotal=float(data.get("subtotal", 0)),
        iva=float(data.get("iva", 0)),
        retenciones=float(data.get("retenciones", 0)),
        monto_total=float(data.get("monto_total", 0)),
        saldo_pendiente=float(data.get("monto_total", 0)),  # Nace debiendo el 100%
        moneda=data.get("moneda", "MXN"),
        fecha_emision=emision_obj,
        fecha_vencimiento=vencimiento_obj,
        metodo_pago=data.get("metodo_pago", "PPD"),
        forma_pago=data.get("forma_pago", "99"),
        tipo_comprobante="I",
        estatus=models.InvoiceStatus.PENDIENTE,
    )

    db.add(nueva_factura)
    db.commit()
    db.refresh(nueva_factura)

    return nueva_factura


def process_sat_master_report(db: Session, payload_data: list, original_file_name: str):
    from datetime import datetime, timedelta, date

    facturas_creadas = 0
    facturas_ignoradas = 0
    cecos_creados = 0

    # =========================================================
    #  HELPER 1: PRECARGAR CECOS EXISTENTES DE LA BD (Tus IDs 1 al 13)
    # =========================================================
    cecos_db = db.query(models.CostCenter).all()
    # Creamos un diccionario en memoria: {"mtto": 1, "administrativo": 2, ...}
    mapa_cecos = {c.nombre.strip().lower(): c.id for c in cecos_db}

    # =========================================================
    #  HELPER 2: DICCIONARIO BASE Y BUSCADOR INTELIGENTE
    # =========================================================
    BASE_PROVEEDORES = {
        "CLO CLO": {"dias": 0, "ceco": "Personal"},
        "CONCESIONARIA AUTOPISTA PEROTE-XALAPA": {"dias": 0, "ceco": "Operaciones"},
        "CONSTRUCOMERCIO Y GESTORIA MG": {"dias": 0, "ceco": "Mtto"},
        "CONSTRUCTORA E INMOBILIARIA MARYLAS": {"dias": 0, "ceco": "Administrativo"},
        "DOGANIA ISAURA ROSALES LICONA": {"dias": 0, "ceco": "Mtto"},
        "FISHER'S CONDESA": {"dias": 0, "ceco": "Personal"},
        "FONDO NACIONAL DE INFRAESTRUCTURA": {"dias": 0, "ceco": "Operaciones"},
        "LA CASA DEL SOL GASOLINERIA": {"dias": 0, "ceco": "Administrativo"},
        "LA ESTANCIA DEL PUERTO DE VERACRUZ": {"dias": 0, "ceco": "Personal"},
        "LA FERRE COMERCIALIZADORA": {"dias": 0, "ceco": "Mtto"},
        "NUEVA WAL MART DE MEXICO": {"dias": 0, "ceco": "Personal"},
        "OPERADORA BAJO DE LA TINTORERA": {"dias": 0, "ceco": "Personal"},
        "OPERADORA DE ESTACIONES GL": {"dias": 0, "ceco": "Administrativo"},
        "OPTIMA G AUTOSPORT": {"dias": 0, "ceco": "Personal"},
        "PROMOTORA PLATINIUM": {"dias": 0, "ceco": "Administrativo"},
        "PROVEEDORA DE ALIMENTOS GOURMET": {"dias": 0, "ceco": "Personal"},
        "QUALITAS COMPAÑIA DE SEGUROS": {"dias": 0, "ceco": "Seguros"},
        "ROCIO MOLINA CHAVEZ": {"dias": 0, "ceco": "Operaciones"},
        "TONY TIENDAS": {"dias": 0, "ceco": "Administrativo"},
        "ABRAHAM OSORIO TINOCO": {"dias": 0, "ceco": "Administrativo"},
        "ALEJANDRA FABIOLA FLORES SANDOVAL": {"dias": 15, "ceco": "Administrativo"},
        "ANGELICA TEMOXTLE GOMEZ": {"dias": 0, "ceco": "Mtto"},
        "ARTURO ISIDRO PEREZ CUREÑO": {"dias": 0, "ceco": "Mtto"},
        "ARTURO SABBAGH LANDA": {"dias": 15, "ceco": "Administrativo"},
        "AUTO SERVICIO GUARDIA": {"dias": 0, "ceco": "Administrativo"},
        "AUTOMOTRIZ ADRIMAR": {"dias": 8, "ceco": "Mtto"},
        "BACOLUM": {"dias": 0, "ceco": "Personal"},
        "BANCO MERCANTIL DEL NORTE": {"dias": 0, "ceco": "Comisiones bancarias"},
        "BANCO MONEX": {"dias": 0, "ceco": "Personal"},
        "BANCO NACIONAL DE MEXICO": {"dias": 0, "ceco": "Comisiones bancarias"},
        "BERENICE GUTIERREZ CAMPOS": {"dias": 0, "ceco": "Mtto"},
        "BETREIBER LOGISTIK": {"dias": 0, "ceco": "Personal"},
        "CENTRO GASOLINERO ANIMAS": {"dias": 30, "ceco": "Administrativo"},
        "CEVER SAN ANTONIO": {"dias": 0, "ceco": "Personal"},
        "CLARA HERNANDEZ GOMEZ": {"dias": 0, "ceco": "Administrativo"},
        "COMERCIALIZADORA TR ZONE": {"dias": 25, "ceco": "Mtto"},
        "CORPORATIVO INTERNACIONAL DE COMERCIO SHIJEHECA": {
            "dias": 0,
            "ceco": "Gastos deducibles",
        },
        "DAIMLER FINANCIAL SERVICES": {"dias": 15, "ceco": "Adquisiciones"},
        "DALIA CERON ROLDAN": {"dias": 0, "ceco": "Operaciones"},
        "DHL EXPRESS MEXICO": {"dias": 0, "ceco": "Administrativo"},
        "DIESEL MARIMAR": {"dias": 15, "ceco": "Mtto"},
        "ECONOMIA EN MATERIALES PUBLICITARIOS": {"dias": 0, "ceco": "Administrativo"},
        "EL PALACIO DE HIERRO": {"dias": 0, "ceco": "Personal"},
        "EL SABOR AUSTRAL": {"dias": 0, "ceco": "Personal"},
        "FERNANDO MARTINEZ RUIZ DEL HOYO": {"dias": 0, "ceco": "Mtto"},
        "FRANCISCO FLORENCIO RODRIGUEZ ROMERO": {"dias": 0, "ceco": "Mtto"},
        "GASOLINERA JEBLA": {"dias": 0, "ceco": "Administrativo"},
        "GENOVEVO CHAVEZ GAMBOA": {"dias": 15, "ceco": "Mtto"},
        "GOMSA CAMIONES": {"dias": 25, "ceco": "Mtto"},
        "GRUPO FERCHE": {"dias": 30, "ceco": "Administrativo"},
        "GRUPO RULLAN": {"dias": 0, "ceco": "Mtto"},
        "HACEMOS FUEGO": {"dias": 0, "ceco": "Personal"},
        "HAMBURGUESAS RAPIDAS LOMAS": {"dias": 0, "ceco": "Personal"},
        "HERRAMIENTAS Y ACCESORIOS OLMECA": {"dias": 15, "ceco": "Mtto"},
        "HOME DEPOT": {"dias": 0, "ceco": "Personal"},
        "IGNACIO VILLEGAS MONTOYA": {"dias": 0, "ceco": "Operaciones"},
        "IMPACTO COMERCIAL FERRETERO": {"dias": 0, "ceco": "Mtto"},
        "INSTITUTO MEXICANO DEL SEGURO SOCIAL": {"dias": 0, "ceco": "Administrativo"},
        "IVON CAMPOS HERRERA": {"dias": 0, "ceco": "Administrativo"},
        "JANNA LOGISTIC": {"dias": 0, "ceco": "Administrativo"},
        "JULIA MAGDALENA GOMEZ TERRONES": {"dias": 0, "ceco": "Administrativo"},
        "JUST IN TIME": {"dias": 0, "ceco": "Operaciones"},
        "ROGELIO AGUILAR ROGEL": {"dias": 0, "ceco": "Administrativo"},
        "LATANST": {"dias": 0, "ceco": "Diesel"},
        "LUCIO RODRIGUEZ PEREYRA": {"dias": 0, "ceco": "Administrativo"},
        "LUIS ALBERTO GARCIA BALBUENA": {"dias": 0, "ceco": "Personal"},
        "MARTHA ELENA MEDINA ROBLEDO": {"dias": 0, "ceco": "Mtto"},
        "MUELLES Y TRACTOPARTES DEL GOLFO": {"dias": 25, "ceco": "Mtto"},
        "OFFICE DEPOT": {"dias": 0, "ceco": "Administrativo"},
        "OPERADORA DE ALIMENTOS DURANGO": {"dias": 0, "ceco": "Personal"},
        "OPERADORA DE ESTACIONES Y PARADORES": {"dias": 0, "ceco": "Diesel"},
        "OSCAR LOPEZ MARTINEZ": {"dias": 0, "ceco": "Administrativo"},
        "PACCAR FINANCIAL": {"dias": 0, "ceco": "Adquisiciones"},
        "PARADOR TURISTICO SAN PEDRO": {"dias": 0, "ceco": "Diesel"},
        "PASE, SERVICIOS ELECTRONICOS": {"dias": 0, "ceco": "Casetas"},
        "PASION SONORENSE": {"dias": 0, "ceco": "Diesel"},
        "PETROMAX": {"dias": 0, "ceco": "Administrativo"},
        "PETROVIM": {"dias": 0, "ceco": "Diesel"},
        "PREVENCION Y REACCION": {"dias": 0, "ceco": "Seguridad"},
        "PRODUCTOS AHULADOS INDUSTRIALES": {"dias": 25, "ceco": "Llantas"},
        "PROPIMEX": {"dias": 0, "ceco": "Administrativo"},
        "PROVEEDOR MAYORISTA AL REFACCIONARIO": {"dias": 20, "ceco": "Mtto"},
        "RADIOMOVIL DIPSA": {"dias": 30, "ceco": "Administrativo"},
        "RENOVADORA ZUCA DEL SURESTE": {"dias": 15, "ceco": "Llantas"},
        "ROBERTO ENRIQUE MUÑOZ CEBALLOS": {"dias": 0, "ceco": "Operaciones"},
        "SEGURIDAD INDUSTRIAL Y SOLDADURAS": {"dias": 0, "ceco": "Mtto"},
        "SICONT MEX": {"dias": 0, "ceco": "Administrativo"},
        "SITRACK": {"dias": 30, "ceco": "Operaciones"},
        "SUMINISTROS TECNICOS COMAI": {"dias": 0, "ceco": "Mtto"},
        "TELEFONOS DE MEXICO": {"dias": 0, "ceco": "Administrativo"},
        "TIENDAS CHEDRAUI": {"dias": 0, "ceco": "Personal"},
        "TRACTO ACCESORIOS COSTA SUR": {"dias": 15, "ceco": "Mtto"},
        "TRASLADOS RAPIDOS DE CARGA": {"dias": 0, "ceco": "Operaciones"},
        "VECTOR, CASA DE BOLSA": {"dias": 0, "ceco": "Administrativo"},
        "VERIFICENTROS DEL SURESTE": {"dias": 8, "ceco": "Operaciones"},
        "GRUPO AUTOPISTAS NACIONALES": {"dias": 0, "ceco": "Operaciones"},
        "REFACCIONARIA GLOBAL TRUCK PARTS": {"dias": 0, "ceco": "Operaciones"},
        "GOBIERNO DEL ESTADO DE VERACRUZ": {"dias": 0, "ceco": "Operaciones"},
        "CONCESIONES Y PROMOCIONES MALIBRAN": {"dias": 0, "ceco": "Operaciones"},
        "CONCESIONARIA LERMA SANTIAGO": {"dias": 0, "ceco": "Operaciones"},
        "PILOTO AUTOMATICO": {"dias": 0, "ceco": "Mtto"},
        "GRUPO TRACVER": {"dias": 0, "ceco": "Mtto"},
        "APE ACEROS DE VERACRUZ": {"dias": 0, "ceco": "Mtto"},
        "CAR MOTION": {"dias": 0, "ceco": "Administrativo"},
        "AUTO PARTES Y MAS": {"dias": 0, "ceco": "Administrativo"},
        "IN LAK ECH HALA KEN": {"dias": 0, "ceco": "Administrativo"},
        "GRUPO FUCHELA": {"dias": 0, "ceco": "Administrativo"},
        "SALAS VILLAGOMEZ": {"dias": 0, "ceco": "Administrativo"},
        "AUTOUNO MOTORS": {"dias": 0, "ceco": "Administrativo"},
        "HULES LAGO": {"dias": 0, "ceco": "Mtto"},
        "VENTA Y RENTA DE MAQUINARIA VRM": {"dias": 0, "ceco": "Administrativo"},
        "OMAR MARCELO GONZALEZ MACIAS": {"dias": 0, "ceco": "Administrativo"},
        "GRUPO GASOLINERO DEL SUR": {"dias": 0, "ceco": "Administrativo"},
        "ANA GRACIELA AYUSO HERNANDEZ": {"dias": 0, "ceco": "Administrativo"},
        "TRANSPORTES Y RADIADORES DAOS": {"dias": 0, "ceco": "Mtto"},
        "ADMINISTRADORA DE GASOLINERAS SAN AGUSTIN": {
            "dias": 0,
            "ceco": "Administrativo",
        },
        "NEKLAR": {"dias": 0, "ceco": "Administrativo"},
        "JF HILLEBRAND MEXICO": {"dias": 0, "ceco": "Operaciones"},
        "COMERCIALIZADORA DISHI": {"dias": 0, "ceco": "Mtto"},
        "COMBUSTIBLES MALDONADO OLVERA": {"dias": 0, "ceco": "Diesel"},
        "GRUPO ZORRO ABARROTERO": {"dias": 0, "ceco": "Administrativo"},
        "OPERADORA DE RESTAURANTES LOS GIROS": {"dias": 0, "ceco": "Personal"},
        "SANDRA POZOS PEREDO": {"dias": 0, "ceco": "Mtto"},
        "OPERADORA CAMA": {"dias": 0, "ceco": "Personal"},
        "JOSE OMAR BRAVO ALARCON": {"dias": 0, "ceco": "Operaciones"},
        "HIDROLITRO LAGUNERO": {"dias": 0, "ceco": "Operaciones"},
        "LOGISTICA INTEGRAL FULEM": {"dias": 0, "ceco": "Operaciones"},
        "GLOBAL INTERNACIONAL AGENCIAS MARITIMAS": {"dias": 0, "ceco": "Operaciones"},
        "SANTA FE GAS&OIL": {"dias": 0, "ceco": "Diesel"},
        "SERVICIO CONDESA DE ZACATECAS": {"dias": 0, "ceco": "Operaciones"},
        "YESENIA JANETH VAZQUEZ SANCHEZ": {"dias": 15, "ceco": "Mtto"},
        "SAVINO DEL BENE MEXICO": {"dias": 15, "ceco": "Operaciones"},
        "COMBUSTIBLES DEL SURESTE DE COATZACOALCOS": {"dias": 0, "ceco": "Diesel"},
        "CORPORACION GASOLINERA MILLENIUM": {"dias": 0, "ceco": "Diesel"},
        "FIDEICOMISO F/1596": {"dias": 0, "ceco": "Operaciones"},
        "ALVAREZ AUTOMOTRIZ": {"dias": 0, "ceco": "Mtto"},
        "OPERADORA OMX": {"dias": 0, "ceco": "Administrativo"},
        "COSTCO DE MEXICO": {"dias": 0, "ceco": "Personal"},
        "CANDEGAS": {"dias": 0, "ceco": "Diesel"},
        "ACEREXPRESS DEL SURESTE": {"dias": 0, "ceco": "Mtto"},
        "SERVICIO ESPECIALIZADO EN RODAMIENTOS": {"dias": 0, "ceco": "Mtto"},
        "GAS Y DERIVADOS DEL CARIBE": {"dias": 0, "ceco": "Diesel"},
        "INSTITUTO DE CAPACITACION DE LA INDUSTRIA": {
            "dias": 15,
            "ceco": "Operaciones",
        },
        "TRANSPORTE Y LOGISTICA BUZMYR": {"dias": 15, "ceco": "Operaciones"},
        "LA CASA DE LAS LOMAS": {"dias": 0, "ceco": "Personal"},
        "COMERCIALIZADORA DE COMBUSTIBLES TIFA": {"dias": 21, "ceco": "Diesel"},
        "LLANTAS & RINES RUTA 17": {"dias": 0, "ceco": "Mtto"},
        "VICTOR MANUEL SANTOS DELGADO": {"dias": 15, "ceco": "Mtto"},
        "LOGISTICA EXPRESS DE CONTENEDORES": {"dias": 0, "ceco": "Operaciones"},
        "SUTSA PRINT DE MEXICO": {"dias": 0, "ceco": "Operaciones"},
        "GRUPO GEO DIESEL": {"dias": 0, "ceco": "Mtto"},
        "SEGUROS INBURSA": {"dias": 15, "ceco": "Seguros"},
        "REFRISERVICIO Y AIRE ACONDICIONADO": {"dias": 0, "ceco": "Mtto"},
        "ASEGURADORA INSURGENTES": {"dias": 15, "ceco": "Administrativo"},
        "SUPER SERVICIO DEL POTOSI": {"dias": 0, "ceco": "Operaciones"},
        "TYMEG MEXICO": {"dias": 0, "ceco": "Operaciones"},
        "TURISMO CAMPECHE": {"dias": 0, "ceco": "Administrativo"},
        "CHRISTIAN ALBERTO HERNANDEZ ANGELES": {"dias": 0, "ceco": "Operaciones"},
        "MIRIAM YESENIA PIMENTEL SANTIAGO": {"dias": 0, "ceco": "Operaciones"},
        "SUMINISTROS ENERGETICOS DE CALIDAD": {"dias": 0, "ceco": "Operaciones"},
        "CLAUDIA ALARCON RAMIREZ": {"dias": 0, "ceco": "Administrativo"},
        "REMOLQUES Y EQUIPOS DEL GOLFO": {"dias": 0, "ceco": "Operaciones"},
        "SERVICIO AUTOVIA": {"dias": 0, "ceco": "Operaciones"},
        "GRUPO GASOLINERO REYNAR": {"dias": 0, "ceco": "Operaciones"},
        "RICHEMONT DE MEXICO": {"dias": 0, "ceco": "Personal"},
        "SURMAN POLANCO": {"dias": 0, "ceco": "Personal"},
        "GRUPO RESTAURANTERO DEL CENTRO": {"dias": 0, "ceco": "Personal"},
        "GM FINANCIAL DE MEXICO": {"dias": 0, "ceco": "Administrativo"},
        "SUSPENSION Y DIRECCION": {"dias": 0, "ceco": "Operaciones"},
        "AUTOZONE DE MEXICO": {"dias": 0, "ceco": "Operaciones"},
        "COMERCIALIZADORA SDMHC": {"dias": 0, "ceco": "Administrativo"},
        "PROMOTORA Y TURISTICA ATHENE": {"dias": 0, "ceco": "Administrativo"},
        "NACIONAL DE COMBUSTIBLES Y LUBRICANTES": {"dias": 0, "ceco": "Administrativo"},
        "GRUPO MURO TEX": {"dias": 0, "ceco": "Mtto"},
        "CORS FLORES LOPEZ Y ASOCIADOS": {"dias": 15, "ceco": "Administrativo"},
        "TRACTOPARTES DIESEL DON TRUCK": {"dias": 0, "ceco": "Mtto"},
        "GASOIL TECNOLOGIAS": {"dias": 0, "ceco": "Administrativo"},
        "RESTAURANTES SUNTORY": {"dias": 0, "ceco": "Personal"},
        "SERVICIO GASOLINERO LA LOMA": {"dias": 0, "ceco": "Administrativo"},
        "ADMINISTRACION HOTELERA DEL SUR": {"dias": 0, "ceco": "Personal"},
        "SERVICIO RAULIAM": {"dias": 0, "ceco": "Administrativo"},
        "RFV TRUCK PARTS": {"dias": 0, "ceco": "Mtto"},
        "VINILOS Y GRAFICOS DIGITALES": {"dias": 0, "ceco": "Administrativo"},
        "ESTACION DE SERVICIO FORA": {"dias": 0, "ceco": "Administrativo"},
        "OPEDEC DE MEXICO": {"dias": 0, "ceco": "Diesel"},
        "GRUPO BIO GUHUSA": {"dias": 0, "ceco": "Diesel"},
        "ZURICH ASEGURADORA MEXICANA": {"dias": 0, "ceco": "Seguros"},
        "VICTOR MARQUINEZ TRESS": {"dias": 0, "ceco": "Mtto"},
        "SOLUCIONES P&L": {"dias": 0, "ceco": "Administrativo"},
        "AMERICAN FILTER": {"dias": 0, "ceco": "Mtto"},
        "PETRO 107": {"dias": 0, "ceco": "Mtto"},
        "DISTRIBUIDORA SAGARO DE MEXICO": {"dias": 0, "ceco": "Administrativo"},
        "SERVICIO PIRAMIDE DEL FUEGO": {"dias": 0, "ceco": "Diesel"},
        "FLORGER COMBUSTIBLES Y ADITIVOS": {"dias": 0, "ceco": "Diesel"},
        "GASOLINERIA RAQUEL": {"dias": 0, "ceco": "Administrativo"},
        "KENWORTH DEL ESTE": {"dias": 30, "ceco": "Mtto"},
        "AGUSTIN FRANCISCO DIAZ CUAUTLE": {"dias": 0, "ceco": "Administrativo"},
        "INDUSTRIA MANUFACTURERA DE REMOLQUES": {"dias": 0, "ceco": "Mtto"},
        "SERVICIOS MODERNOS DE JILOTEPEC": {"dias": 0, "ceco": "Diesel"},
        "VITANOVA": {"dias": 15, "ceco": "Llantas"},
        "EVER TIRE": {"dias": 15, "ceco": "Llantas"},
        "EM WORLDWIDE SERVICES": {"dias": 0, "ceco": "Administrativo"},
        "ROSALINA ADRIANA OROZCO LEON": {"dias": 15, "ceco": "Mtto"},
        "PROMOTORA PP": {"dias": 15, "ceco": "Casetas"},
        "RESTAURANTE TORRE DE CASTILLA": {"dias": 0, "ceco": "Personal"},
        "GASOLINERIA COACALCO": {"dias": 0, "ceco": "Administrativo"},
        "RUOLAC BANDERILLA": {"dias": 0, "ceco": "Administrativo"},
        "PETRO MED": {"dias": 0, "ceco": "Diesel"},
        "SUPER SERVICIO NUEVO BC": {"dias": 0, "ceco": "Diesel"},
        "SUMINISTROS DE COMBUSTIBLE DIESEL Y GASOLINA": {"dias": 0, "ceco": "Diesel"},
        "ALBERTO RAYMUNDO PEREDO CUBRIA": {"dias": 0, "ceco": "Operaciones"},
        "AUTOEXPRESS GSM": {"dias": 0, "ceco": "Diesel"},
        "REPRESENTACIONES AZTNOR": {"dias": 0, "ceco": "Mtto"},
        "CONSORCIO GASOLINERO PLUS": {"dias": 0, "ceco": "Diesel"},
        "HR SOL SERVICIOS ADMINISTRATIVOS": {"dias": 0, "ceco": "Diesel"},
        "SERVICIO FAS": {"dias": 0, "ceco": "Diesel"},
        "ABASTECEDORA GASTRONOMICA INTEGRAL": {"dias": 0, "ceco": "Personal"},
        "GASOLINERA OPERADORA GONZER": {"dias": 0, "ceco": "Diesel"},
        "CORPORACION RNB": {"dias": 0, "ceco": "Mtto"},
        "PROMOTORA DE INVERSION MOCAMBO": {"dias": 0, "ceco": "Personal"},
        "PAULA ALCARAZ MONTAÑO": {"dias": 0, "ceco": "Mtto"},
        "TECNO UREA": {"dias": 20, "ceco": "Operaciones"},
        "ANTONIO DE JESUS GARCIA GALVAN": {"dias": 0, "ceco": "Mtto"},
        "ALEJANDRO ROMO OBSCURA": {"dias": 0, "ceco": "Mtto"},
        "MIRIAM FLORES VICENTE": {"dias": 0, "ceco": "Mtto"},
        "SISTEMAS EMPRESARIALES Y RESGUARDO PATRIMONIAL": {
            "dias": 5,
            "ceco": "Administrativo",
        },
        "TORA JAPONES": {"dias": 0, "ceco": "Personal"},
        "DISTRIBUIDORA LIVERPOOL": {"dias": 0, "ceco": "Personal"},
        "AUTOPISTA ARCO NORTE": {"dias": 0, "ceco": "Casetas"},
        "CONCESIONARIA MEXIQUENSE": {"dias": 0, "ceco": "Casetas"},
        "CONCESIONARIA DE VIAS TRONCALES": {"dias": 0, "ceco": "Casetas"},
        "CFC CONCESIONES": {"dias": 0, "ceco": "Casetas"},
        "PROMOTORA DE CARRETERAS ECATEPEC PIRAMIDES": {"dias": 0, "ceco": "Casetas"},
        "PROMOTORA Y ADMINISTRADORA DE CARRETERAS": {"dias": 0, "ceco": "Casetas"},
        "ANESA HOLDING": {"dias": 0, "ceco": "Casetas"},
        "AUTOPISTAS DE VANGUARDIA": {"dias": 0, "ceco": "Casetas"},
        "SEXTOMADERO": {"dias": 0, "ceco": "Personal"},
        "DESARROLLO GLOBAL DE CONCESIONES": {"dias": 0, "ceco": "Casetas"},
        "REVOLUCION EN MOVIMIENTO": {"dias": 0, "ceco": "Casetas"},
        "AUTOVIAS SAN MARTIN TEXMELUCAN": {"dias": 0, "ceco": "Casetas"},
        "CONCESIONARIA BICENTENARIO": {"dias": 0, "ceco": "Casetas"},
        "AUTOPISTA MORELIA SALAMANCA": {"dias": 0, "ceco": "Casetas"},
        "AUTOVIA QUERETARO": {"dias": 0, "ceco": "Casetas"},
        "AMIGOS ATENDIENDO AMIGOS": {"dias": 0, "ceco": "Personal"},
        "JEAN PIERRE PAGESY HERRERA": {"dias": 0, "ceco": "Personal"},
        "SERVICIO SAN JUAN": {"dias": 0, "ceco": "Administrativo"},
        "GASOLINERIA ALTADENA": {"dias": 0, "ceco": "Administrativo"},
        "RACING TRADING": {"dias": 15, "ceco": "Mtto"},
        "LIBRAMIENTO ELEVADO DE PUEBLA": {"dias": 0, "ceco": "Casetas"},
        "CONCESIONARIA ASM": {"dias": 0, "ceco": "Casetas"},
        "DANIEL RAMIREZ HERRERA": {"dias": 0, "ceco": "Mtto"},
        "GRUPO NACIONAL PROVINCIAL": {"dias": 0, "ceco": "Administrativo"},
        "SEGUROS ATLAS": {"dias": 0, "ceco": "Seguros"},
        "RED STAR FUEL": {"dias": 0, "ceco": "Diesel"},
        "MORENO DIESEL": {"dias": 15, "ceco": "Mtto"},
        "VICTOR ALEJANDRO ZAVALA BRITO": {"dias": 15, "ceco": "Mtto"},
        "GABRIELA CASAS DEL SAUZ": {"dias": 0, "ceco": "Operaciones"},
        "RESTAURANTE SUNTORY": {"dias": 0, "ceco": "Personal"},
        "MARISCOS VILLA RICA MOCAMBO": {"dias": 0, "ceco": "Personal"},
        "JOSE CARLOS ALARCON RAMIREZ": {"dias": 0, "ceco": "Personal"},
        "A.N.A. COMPAÑIA DE SEGUROS": {"dias": 0, "ceco": "Seguros"},
        "COMINCAR": {"dias": 0, "ceco": "Operaciones"},
        "SERVICIO SANMO": {"dias": 0, "ceco": "Diesel"},
        "MUNDO DE LIMPIEZA DGO": {"dias": 0, "ceco": "Administrativo"},
        "MARIA EUGENIA HERMIDA GUZMAN": {"dias": 0, "ceco": "Administrativo"},
        "RIEGOS Y MAQUINARIA AGRICOLA PESCADOR": {"dias": 0, "ceco": "Administrativo"},
        "AUTO PARTES BICENTENARIO": {"dias": 0, "ceco": "Operaciones"},
        "LUIS DE JESUS RAMIREZ CADENA": {"dias": 0, "ceco": "Operaciones"},
        "LUIS MOISES GIL AGUILAR": {"dias": 0, "ceco": "Operaciones"},
        "GUSTAVO MARIN RODRIGUEZ": {"dias": 0, "ceco": "Operaciones"},
        "TPS OPERADOR LOGISTICO": {"dias": 0, "ceco": "Operaciones"},
        "REFACCIONES INDUSTRIALES OLAT": {"dias": 0, "ceco": "Mtto"},
        "CIRIA LOPEZ RAMOS": {"dias": 0, "ceco": "Mtto"},
        "AUTOS CON VALOR": {"dias": 0, "ceco": "Mtto"},
        "MATERIALES RUMA": {"dias": 0, "ceco": "Administrativo"},
        "SEPTIMO MADERO": {"dias": 0, "ceco": "Personal"},
        "SANBORN HERMANOS": {"dias": 0, "ceco": "Personal"},
        "ROGELIO VARGAS PEREZ": {"dias": 0, "ceco": "Mtto"},
        "UNION DE SERVICIOS CONHUAS": {"dias": 0, "ceco": "Diesel"},
        "HOGO GROUP": {"dias": 0, "ceco": "Personal"},
        "SERVICIO Y CALIDAD DE HUEYATZACOALCO": {"dias": 0, "ceco": "Personal"},
        "HECTOR MANUEL BOYLAN BALBUENA": {"dias": 0, "ceco": "Mtto"},
        "REMAR DIESEL": {"dias": 0, "ceco": "Mtto"},
        "QUATTRO TRADE SOLUTIONS": {"dias": 0, "ceco": "Administrativo"},
        "CENTRO DE DISTRIBUCION DE AUTOCONSUMOS": {"dias": 15, "ceco": "Diesel"},
        "PROMOTORA HOTELERA DE VERACRUZ": {"dias": 0, "ceco": "Personal"},
        "TECNOLLANTAS": {"dias": 0, "ceco": "Administrativo"},
        "PAPELERA SAN RAFAEL DE LEON": {"dias": 0, "ceco": "Administrativo"},
        "DATOS EN TECNOLOGIAS DE INFORMACION": {"dias": 0, "ceco": "Operaciones"},
        "TOTAL PLAY": {"dias": 0, "ceco": "Administrativo"},
        "TOTAL BOX": {"dias": 0, "ceco": "Administrativo"},
        "COMERCIOS INTEGRALES ZINGRUP": {"dias": 0, "ceco": "Mtto"},
        "GC MOTORS": {"dias": 0, "ceco": "Personal"},
        "B PARTES": {"dias": 0, "ceco": "Mtto"},
        "RAMOS SERVIPARTES": {"dias": 0, "ceco": "Personal"},
        "ESTANCIA HARBOR'S": {"dias": 0, "ceco": "Personal"},
        "INMOBILIARIA HOTELERA DE QUERETARO": {"dias": 0, "ceco": "Personal"},
        "FOFEL": {"dias": 0, "ceco": "Operaciones"},
        "A LO GOURMET Y EXCELENCIA": {"dias": 0, "ceco": "Personal"},
        "HOSPITALIDAD LATINA": {"dias": 0, "ceco": "Personal"},
        "ALCENTRO ALIMENTOS": {"dias": 0, "ceco": "Personal"},
        "INMOBILIARIA HNF": {"dias": 0, "ceco": "Personal"},
        "PROMOTORA VINCENT": {"dias": 0, "ceco": "Personal"},
        "ESTACION DE SERVICIO MAXIPISTA TAPATIA": {"dias": 0, "ceco": "Personal"},
        "SERVICIO COMERCIAL GARIS": {"dias": 0, "ceco": "Personal"},
        "CALUFER": {"dias": 0, "ceco": "Personal"},
        "JOSE REYMUNDO IBARRA GUTIERREZ": {"dias": 0, "ceco": "Personal"},
        "SIERRA SILLA MITRAS": {"dias": 0, "ceco": "Personal"},
        "TURBOCARGANDO A MEXICO": {"dias": 0, "ceco": "Mtto"},
        "CINTHYA GUERRERO SAGAHON": {"dias": 0, "ceco": "Mtto"},
        "JESUS MANUEL PEREZ PEREZ": {"dias": 0, "ceco": "Mtto"},
        "TUBELITE DE MEXICO": {"dias": 0, "ceco": "Mtto"},
        "JUAN CARLOS PELAEZ SANCHEZ": {"dias": 0, "ceco": "Mtto"},
        "ERNESTINA ESQUIVEL LOPEZ": {"dias": 0, "ceco": "Administrativo"},
        "LUZ MIREYA SERRANO GOMEZ": {"dias": 0, "ceco": "Mtto"},
        "MILANO OPERADORA": {"dias": 0, "ceco": "Personal"},
        "COMERCIAL CITY FRESKO": {"dias": 0, "ceco": "Personal"},
        "GRUPO PARISINA": {"dias": 0, "ceco": "Administrativo"},
        "CEVIZI": {"dias": 0, "ceco": "Personal"},
        "INFRA": {"dias": 0, "ceco": "Administrativo"},
        "PODER EJECUTIVO DEL ESTADO DE CAMPECHE": {"dias": 0, "ceco": "Administrativo"},
        "MISE EN PALACE": {"dias": 0, "ceco": "Personal"},
        "TELECONTROLES DE VERACRUZ": {"dias": 0, "ceco": "Mtto"},
        "MEXICANA DE LUBRICANTES": {"dias": 0, "ceco": "Mtto"},
        "ILDEFONSO SOLIS LUCERO": {"dias": 0, "ceco": "Mtto"},
        "CAMINOS Y PUENTES FEDERALES": {"dias": 0, "ceco": "Casetas"},
        "SERVICIO REGIO OCHO": {"dias": 0, "ceco": "Diesel"},
        "OFIX": {"dias": 0, "ceco": "Administrativo"},
        "SFERP": {"dias": 0, "ceco": "Administrativo"},
        "HIDROCARBUROS LA MARQUESILLA": {"dias": 0, "ceco": "Diesel"},
        "LA BARRA MASARYK": {"dias": 0, "ceco": "Personal"},
        "CINTYA LIZBETH DE THOMAS RAMOS": {"dias": 0, "ceco": "Personal"},
        "ACRO MAC": {"dias": 0, "ceco": "Personal"},
    }

    # =========================================================
    #  HELPER 2: BUSCADOR INTELIGENTE (Fuzzy Matcher)
    # =========================================================
    def buscar_coincidencia_proveedor(nombre_emisor: str):
        if not nombre_emisor:
            return {"dias": 0, "ceco": "Revisión Manual"}

        nombre_clean = nombre_emisor.upper().strip()

        # 1. Buscar Coincidencia Exacta
        if nombre_clean in BASE_PROVEEDORES:
            return BASE_PROVEEDORES[nombre_clean]

        # 2. Buscar Coincidencia Parcial
        for llave_base, datos in BASE_PROVEEDORES.items():
            if llave_base in nombre_clean:
                return datos

        return {"dias": 0, "ceco": "Revisión Manual"}

    # =========================================================
    #  HELPER 3: Convertidor a prueba de balas para fechas
    # =========================================================
    def parse_flexible_date(raw_val) -> date:
        if not raw_val or str(raw_val).strip() == "None":
            return date.today()

        val_str = str(raw_val).strip()
        try:
            if val_str.replace(".", "", 1).isdigit():
                serial = float(val_str)
                return (datetime(1899, 12, 30) + timedelta(days=serial)).date()
            else:
                clean_date = val_str.split("T")[0].split()[0]
                return datetime.strptime(clean_date, "%Y-%m-%d").date()
        except Exception as e:
            return date.today()

    # =========================================================
    # INICIO DEL PROCESAMIENTO BUCLE
    # =========================================================
    for row in payload_data:
        uuid_fiscal = str(row.get("UUID") or "").strip()
        if not uuid_fiscal or uuid_fiscal == "None":
            continue

        #  TICKET 2 (CANDADO): Evitar duplicados
        existing_invoice = (
            db.query(models.PayableInvoice)
            .filter(models.PayableInvoice.uuid == uuid_fiscal)
            .first()
        )
        if existing_invoice:
            facturas_ignoradas += 1
            continue

        rfc_emisor = str(row.get("Rfc Emisor") or "").strip()
        nombre_emisor_original = str(row.get("Nombre Emisor") or "").strip()

        #  Buscamos coincidencias con tu lista
        datos_sugeridos = buscar_coincidencia_proveedor(nombre_emisor_original)

        # Buscar proveedor en la Base de Datos
        supplier = (
            db.query(models.Supplier).filter(models.Supplier.rfc == rfc_emisor).first()
        )

        # Si el proveedor no existe, lo creamos con los datos del BuscarV
        if not supplier:
            supplier = models.Supplier(
                razon_social=nombre_emisor_original,
                rfc=rfc_emisor,
                estatus=models.SupplierStatus.ACTIVO,  # FIX: Enum estricto
                dias_credito=datos_sugeridos["dias"],
            )
            db.add(supplier)
            db.flush()

        # =========================================================
        #  LÓGICA INTELIGENTE DE CENTROS DE COSTO (CECOS)
        # =========================================================

        # 1. Buscamos primero en el MAPA_CECOS (ID exacto por nombre en minúsculas)
        ceco_name_excel = str(
            row.get("Centro de Costos ") or row.get("Centro de Costos") or ""
        ).strip()
        ceco_a_buscar = (
            ceco_name_excel
            if ceco_name_excel and ceco_name_excel.lower() not in ["none", "nan", ""]
            else None
        )

        # 2. Si el Excel no trajo nada y el proveedor no tiene CECO en BD, usamos el sugerido
        if not ceco_a_buscar and not supplier.cost_center_id:
            ceco_a_buscar = datos_sugeridos["ceco"]

        cost_center_id = supplier.cost_center_id

        if ceco_a_buscar:
            ceco_key = ceco_a_buscar.strip().lower()
            if ceco_key in mapa_cecos:
                cost_center_id = mapa_cecos[ceco_key]
            else:
                # Si no existe, lo creamos y actualizamos el mapa
                nuevo_ceco_codigo = ceco_a_buscar[:15].upper().replace(" ", "-")
                nuevo_ceco = models.CostCenter(
                    codigo=nuevo_ceco_codigo, nombre=ceco_a_buscar, activo=True
                )
                db.add(nuevo_ceco)
                db.flush()
                cecos_creados += 1
                cost_center_id = nuevo_ceco.id
                mapa_cecos[ceco_key] = cost_center_id

            # Si el proveedor era nuevo o no tenía CECO, le heredamos este para futuras facturas
            if not supplier.cost_center_id:
                supplier.cost_center_id = cost_center_id
                db.add(supplier)

        # =========================================================
        #  EXTRAER MONTOS, FECHAS Y CLASIFICAR EL TIPO DE COMPROBANTE
        # =========================================================
        try:
            monto_total_raw = float(row.get("Total", 0))
        except:
            monto_total_raw = 0.0

        # 1. Detectar el Tipo de Comprobante (I=Ingreso, E=Egreso, P=Pago)
        tipo_raw = (
            str(row.get("Tipo") or row.get("Tipo de Comprobante") or "I")
            .strip()
            .upper()
        )
        tipo_comprobante = tipo_raw[0] if tipo_raw else "I"

        # 2. Lógica Financiera Inteligente según el Tipo
        if tipo_comprobante == "E" or monto_total_raw < 0:
            tipo_comprobante = "E"
            # Asegurarnos de que el monto de la nota de crédito sea estrictamente negativo
            monto_total = -abs(monto_total_raw) if monto_total_raw != 0 else 0.0
            saldo_pendiente = monto_total
            estatus = models.InvoiceStatus.PENDIENTE

        elif tipo_comprobante == "P":
            # Es un complemento de pago del SAT
            monto_total = abs(monto_total_raw)
            saldo_pendiente = 0.0
            estatus = models.InvoiceStatus.PAGADO

        else:
            # Factura normal de CxP (Ingreso - 'I')
            tipo_comprobante = "I"
            monto_total = abs(monto_total_raw)
            saldo_pendiente = monto_total
            estatus = models.InvoiceStatus.PENDIENTE

        # Fechas
        fecha_cruda = row.get("Fecha") or row.get("Fecha emisión")
        fecha_emision_limpia = parse_flexible_date(fecha_cruda)

        # Los días de crédito: Prioridad -> Lo que tenga la BD, si no, el buscarV
        dias_credito = supplier.dias_credito
        if not dias_credito or dias_credito == 0:
            dias_credito = datos_sugeridos["dias"]
            if dias_credito > 0:
                supplier.dias_credito = dias_credito
                db.add(supplier)

        fecha_vencimiento_limpia = fecha_emision_limpia + timedelta(
            days=(dias_credito or 0)
        )

        metodo_pago = str(row.get("Método de Pago") or "").split("-")[0].strip()[:5]
        forma_pago = str(row.get("Forma de Pago") or "").split("-")[0].strip()[:5]

        # Concepto (se guarda completo)
        concepto_bruto = str(
            row.get("Conceptos") or "Factura importada del SAT"
        ).strip()

        moneda_raw = str(row.get("Moneda") or "MXN").strip()[:3].upper()
        moneda_limpia = moneda_raw if moneda_raw in ["MXN", "USD", "EUR"] else "MXN"

        # Creación de la factura
        nueva_factura = models.PayableInvoice(
            supplier_id=supplier.id,
            cost_center_id=cost_center_id,
            uuid=uuid_fiscal,
            folio=str(row.get("Folio") or ""),
            concepto=concepto_bruto,
            monto_total=monto_total,
            saldo_pendiente=saldo_pendiente,
            moneda=moneda_limpia,
            fecha_emision=fecha_emision_limpia,
            fecha_vencimiento=fecha_vencimiento_limpia,
            metodo_pago=metodo_pago,
            forma_pago=forma_pago,
            tipo_comprobante=tipo_comprobante,  # <- Aquí inyectamos I, E o P
            estatus=estatus,  # <- Aquí inyectamos el estatus corregido
        )
        db.add(nueva_factura)
        facturas_creadas += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Proceso SAT exitoso. Facturas Creadas: {facturas_creadas}. Ignoradas: {facturas_ignoradas}. Nuevos CECOs detectados: {cecos_creados}.",
    }


def conciliate_bank_movement(db: Session, movement_id: int):
    movement = (
        db.query(models.BankMovement)
        .filter(
            models.BankMovement.id == movement_id,
            models.BankMovement.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not movement:
        return None
    movement.conciliado = True
    movement.fecha_conciliacion = date.today()
    db.commit()
    db.refresh(movement)
    return movement


def delete_bank_movement(db: Session, movement_id: int):
    """
     FIX: Elimina un movimiento (Soft Delete) y revierte el impacto en el saldo de la cuenta.
    Si proviene de CxC o CxP, también revierte el pago en la factura y restaura su saldo.
    """
    try:
        movement = (
            db.query(models.BankMovement)
            .filter(
                models.BankMovement.id == movement_id,
                models.BankMovement.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )

        if not movement:
            return False

        # FIX: Especificar "of=models.BankAccount" para que Postgres no truene por el Outer Join
        account = (
            db.query(models.BankAccount)
            .filter(models.BankAccount.id == movement.bank_account_id)
            .with_for_update(of=models.BankAccount)
            .first()
        )

        if account:
            if movement.tipo == "ingreso":
                account.saldo -= movement.monto
            elif movement.tipo == "egreso":
                account.saldo += movement.monto

        # 1. ROLLBACK CxC Y CANCELACIÓN SAT
        if movement.origen_modulo == "CxC":
            pago_cxc = (
                db.query(models.ReceivableInvoicePayment)
                .filter(
                    models.ReceivableInvoicePayment.monto == movement.monto,
                    models.ReceivableInvoicePayment.cuenta_deposito
                    == str(movement.bank_account_id),
                    models.ReceivableInvoicePayment.estatus != "CANCELADO",
                )
                .order_by(models.ReceivableInvoicePayment.id.desc())
                .first()
            )

            if pago_cxc:
                # ====== NUEVO: CANCELAR EN EL SAT EL REP ======
                if pago_cxc.complemento_uuid and len(pago_cxc.complemento_uuid) >= 36:
                    from app.integrations.sat.payment_service import (
                        PaymentComplementService,
                    )

                    try:
                        sat_payment_service = PaymentComplementService(db)
                        # Mandar a cancelar el UUID del pago en el SAT con clave "02" (Comprobante emitido con errores sin relación)
                        sat_payment_service.cancelar_pago_sat(pago_cxc.id, motivo="02")
                    except Exception as e:
                        # Si el SAT falla, detenemos todo para que no se descuadre el banco
                        raise ValueError(
                            f"El SAT rechazó la cancelación del REP: {str(e)}"
                        )

                # ====== DEVOLVER SALDO A LA FACTURA ======
                invoice = (
                    db.query(models.ReceivableInvoice)
                    .filter(models.ReceivableInvoice.id == pago_cxc.invoice_id)
                    .with_for_update(of=models.ReceivableInvoice)
                    .first()
                )

                if invoice:
                    invoice.saldo_pendiente += pago_cxc.monto
                    if invoice.saldo_pendiente >= invoice.monto_total:
                        invoice.estatus = models.InvoiceStatus.PENDIENTE
                    else:
                        invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

                # ====== SOFT DELETE DEL PAGO ======
                # FIX CRÍTICO: No usamos db.delete(pago_cxc) para no perder la historia del UUID cancelado
                from datetime import datetime

                pago_cxc.estatus = "CANCELADO"
                pago_cxc.motivo_cancelacion = "02"
                pago_cxc.fecha_cancelacion = datetime.now()

        # 2. ROLLBACK CxP
        elif movement.origen_modulo == "CxP":
            pago_cxp = (
                db.query(models.InvoicePayment)
                .filter(
                    models.InvoicePayment.monto == movement.monto,
                    models.InvoicePayment.bank_account_id == movement.bank_account_id,
                )
                .order_by(models.InvoicePayment.id.desc())
                .first()
            )
            if pago_cxp:
                invoice = (
                    db.query(models.PayableInvoice)
                    .filter(models.PayableInvoice.id == pago_cxp.invoice_id)
                    .with_for_update(of=models.PayableInvoice)  #  FIX: ATOMICIDAD
                    .first()
                )
                if invoice:
                    invoice.saldo_pendiente += pago_cxp.monto
                    if invoice.saldo_pendiente >= invoice.monto_total:
                        invoice.estatus = models.InvoiceStatus.PENDIENTE
                    else:
                        invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL
                db.delete(pago_cxp)

        movement.record_status = RecordStatus.ELIMINADO
        db.commit()
        return True

    except Exception as e:
        db.rollback()
        print("\n" + "=" * 50)
        print("💥 ERROR EN DELETE_BANK_MOVEMENT 💥")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise e


def process_operator_settlement(
    db: Session, payload: schemas.OperatorSettlementPayload, user_id: int
):
    try:
        # 1. UPSERT ATÓMICO del SettlementBatch (Evita error 500 por concurrencia del Frontend)
        batch = (
            db.query(models.SettlementBatch)
            .filter(models.SettlementBatch.id == payload.batch_id)
            .first()
        )
        if not batch:
            batch = models.SettlementBatch(id=payload.batch_id, created_by_id=user_id)
            db.add(batch)
            try:
                db.flush()
            except Exception:
                db.rollback()  # Si otra petición lo insertó justo antes, recuperamos ese batch
                batch = (
                    db.query(models.SettlementBatch)
                    .filter(models.SettlementBatch.id == payload.batch_id)
                    .one()
                )

        timestamp = datetime.utcnow()
        viajes_a_facturar = set()

        # 2. Iterar fases con VALIDACIÓN DE ESTADO
        for leg_id in payload.legs:
            # Buscamos solo fases que NO estén liquidadas (Evita doble pago al operador)
            leg = (
                db.query(models.TripLeg)
                .filter(
                    models.TripLeg.id == leg_id,
                    models.TripLeg.record_status != RecordStatus.ELIMINADO,
                )
                .first()
            )

            if not leg or leg.status == models.TripStatus.LIQUIDADO:
                continue  # Saltamos si ya se liquidó en otra petición del mismo lote

            if not leg.diesel_audit_completed:
                raise ValueError(
                    f"Fase {leg.id} bloqueada: Falta dictamen de auditoría de diésel."
                )

            # Snapshot inmutable
            settlement_detail = models.OperatorSettlement(
                batch_id=batch.id,
                trip_leg_id=leg.id,
                operator_id=payload.operator_id,
                snapshot_km=float(
                    (leg.odometro_final or 0) - (leg.odometro_inicial or 0)
                ),
                snapshot_base_salary=leg.monto_sueldo,
                created_at=timestamp,
                created_by_id=user_id,
            )
            db.add(settlement_detail)
            db.flush()

            # Inyectar conceptos automáticos
            if leg.monto_sueldo > 0:
                db.add(
                    models.OperatorSettlementConcept(
                        operator_settlement_id=settlement_detail.id,
                        descripcion="Sueldo Base Operativo",
                        tipo=models.SettlementConceptType.INGRESO,
                        amount=leg.monto_sueldo,
                        is_automatic=True,  # CRÍTICO para filtro de PDF
                    )
                )

            leg.status = models.TripStatus.LIQUIDADO
            if leg.leg_type == models.TripLegType.RUTA:
                viajes_a_facturar.add(leg.trip_id)

        # 3. Conceptos Manuales (Bolsa del operador)
        if payload.manual_concepts and "settlement_detail" in locals():
            for concept in payload.manual_concepts:
                db.add(
                    models.OperatorSettlementConcept(
                        operator_settlement_id=settlement_detail.id,
                        descripcion=concept.descripcion,
                        tipo=concept.tipo,
                        amount=concept.amount,
                        is_automatic=False,  # Se mostrará en el PDF
                    )
                )

        # 4. DISPARADOR DE CxC con VALIDACIÓN CRUZADA (Mundo Cliente)
        for trip_id in viajes_a_facturar:
            # Buscamos si el viaje ya tiene facturas (manuales 'MNL' o auto 'CXC') que no estén eliminadas
            exists = (
                db.query(models.ReceivableInvoice)
                .filter(
                    models.ReceivableInvoice.viaje_id == trip_id,
                    models.ReceivableInvoice.record_status != RecordStatus.ELIMINADO,
                )
                .first()
            )

            if not exists:
                trip = db.query(models.Trip).get(trip_id)
                if trip and trip.tarifa_base > 0:
                    # Lógica financiera pura (Mundo Cliente)
                    subtotal = trip.tarifa_base
                    iva = subtotal * 0.16
                    ret = subtotal * 0.04
                    total = subtotal + iva - ret

                    db.add(
                        models.ReceivableInvoice(
                            client_id=trip.client_id,
                            sub_client_id=trip.sub_client_id,
                            viaje_id=trip.id,
                            folio_interno=f"CXC-AUTO-{trip.id}",
                            monto_total=total,
                            saldo_pendiente=total,
                            fecha_emision=date.today(),
                            estatus=models.InvoiceStatus.PENDIENTE,  # FIX: Enum
                            created_by_id=user_id,
                        )
                    )

        db.commit()
        return {"status": "success", "batch_id": batch.id}

    except Exception as e:
        db.rollback()
        print("\n" + "=" * 50)
        print("💥 ERROR EN PROCESS_OPERATOR_SETTLEMENT 💥")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise e


# =========================================================
# CATEGORÍAS INDIRECTAS (IndirectExpenseCategory)
# =========================================================


def get_indirect_categories(db: Session):
    return (
        db.query(models.IndirectExpenseCategory)
        .filter(models.IndirectExpenseCategory.record_status != RecordStatus.ELIMINADO)
        .order_by(models.IndirectExpenseCategory.nombre.asc())
        .all()
    )


def create_indirect_category(
    db: Session, cat_in: schemas.IndirectCategoryCreate, user_id: int = None
):
    db_cat = models.IndirectExpenseCategory(
        **cat_in.model_dump(), created_by_id=user_id, updated_by_id=user_id
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


def update_indirect_category(
    db: Session,
    cat_id: int,
    cat_in: schemas.IndirectCategoryUpdate,
    user_id: int = None,
):
    db_cat = (
        db.query(models.IndirectExpenseCategory)
        .filter(models.IndirectExpenseCategory.id == cat_id)
        .first()
    )
    if not db_cat:
        return None

    data = cat_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(db_cat, k, v)

    db_cat.updated_by_id = user_id
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


def delete_indirect_category(db: Session, cat_id: int, user_id: int = None):
    db_cat = (
        db.query(models.IndirectExpenseCategory)
        .filter(models.IndirectExpenseCategory.id == cat_id)
        .first()
    )
    if not db_cat:
        return False

    # Soft delete (Borrado lógico)
    db_cat.record_status = RecordStatus.ELIMINADO
    db_cat.updated_by_id = user_id
    db.add(db_cat)
    db.commit()
    return True


# =====================================================================
# BÓVEDA DIGITAL / HISTORIAL CFDI (CON FACTURAS PADRE EN PAGOS)
# =====================================================================
from sqlalchemy import or_, and_, desc
from typing import Optional
from datetime import date
from app.models import models
from app.models.models import AuditLog, User
from sqlalchemy.orm import Session


def get_cfdi_vault_records(
    db: Session,
    tipo_documento: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    records = []

    # ==========================================
    # 1. FACTURAS DE CLIENTES (Ingreso / Carta Porte)
    # ==========================================
    if tipo_documento == "FACTURA_CLIENTE":
        query = (
            db.query(models.ReceivableInvoice)
            .join(models.Client, models.ReceivableInvoice.client_id == models.Client.id)
            .outerjoin(models.Trip, models.ReceivableInvoice.viaje_id == models.Trip.id)
        )

        query = query.filter(
            models.ReceivableInvoice.record_status
            != RecordStatus.ELIMINADO,  # <-- BLINDAJE 1
            or_(
                and_(
                    models.ReceivableInvoice.status_sat != "ERROR",
                    models.ReceivableInvoice.status_sat != "ERROR_SAT",
                ),
                models.ReceivableInvoice.status_sat.is_(None),
            ),
            or_(
                models.ReceivableInvoice.tipo_comprobante != "P",
                ~models.ReceivableInvoice.tipo_comprobante.ilike("P"),
                models.ReceivableInvoice.tipo_comprobante.is_(None),
            ),
            or_(
                ~models.ReceivableInvoice.folio_interno.ilike("COM%"),
                models.ReceivableInvoice.folio_interno.is_(None),
            ),
            or_(
                models.ReceivableInvoice.viaje_id.is_(None),
                models.Trip.record_status != RecordStatus.ELIMINADO,
            ),
        )

        if start_date and end_date:
            query = query.filter(
                models.ReceivableInvoice.fecha_emision.between(start_date, end_date)
            )

        resultados = (
            query.order_by(desc(models.ReceivableInvoice.fecha_emision))
            .limit(500)
            .all()
        )

        for r in resultados:
            status_fiscal = r.status_sat.upper() if r.status_sat else "PROVISIONAL"
            records.append(
                {
                    "id": r.id,
                    "tipo_documento": "FACTURA_CLIENTE",
                    "folio": r.folio_interno,
                    "uuid": r.uuid,
                    "fecha_emision": r.fecha_emision,
                    "estatus": status_fiscal,
                    "cliente_proveedor_nombre": (
                        r.client.razon_social if r.client else "Desconocido"
                    ),
                    "monto_total": r.monto_total,
                    "fecha_cancelacion": r.fecha_cancelacion,
                    "motivo_cancelacion": r.motivo_cancelacion,
                    "versiones_archivos": getattr(
                        r, "document_history", []
                    ),  # <-- BLINDAJE 2
                    "viaje_id": r.viaje_id,
                    "pdf_url": getattr(r, "pdf_url", None),
                }
            )

    # ==========================================
    # 2. FACTURAS DE PROVEEDORES (Gastos CxP)
    # ==========================================
    elif tipo_documento == "FACTURA_PROVEEDOR":
        query = (
            db.query(models.PayableInvoice)
            .join(
                models.Supplier, models.PayableInvoice.supplier_id == models.Supplier.id
            )
            .outerjoin(models.Trip, models.PayableInvoice.viaje_id == models.Trip.id)
        )

        query = query.filter(
            models.PayableInvoice.record_status
            != RecordStatus.ELIMINADO,  # <-- BLINDAJE 1
            or_(
                models.PayableInvoice.viaje_id.is_(None),
                models.Trip.record_status != RecordStatus.ELIMINADO,
            ),
        )

        if start_date and end_date:
            query = query.filter(
                models.PayableInvoice.fecha_emision.between(start_date, end_date)
            )

        resultados = (
            query.order_by(desc(models.PayableInvoice.fecha_emision)).limit(500).all()
        )

        for r in resultados:
            val_estatus = getattr(r.estatus, "value", str(r.estatus)).upper()
            status_fiscal = "CANCELADO" if val_estatus == "CANCELADO" else "TIMBRADO"

            records.append(
                {
                    "id": r.id,
                    "tipo_documento": "FACTURA_PROVEEDOR",
                    "folio": r.folio or r.folio_interno,
                    "uuid": r.uuid,
                    "fecha_emision": r.fecha_emision,
                    "estatus": status_fiscal,
                    "cliente_proveedor_nombre": (
                        r.supplier.razon_social if r.supplier else "Desconocido"
                    ),
                    "monto_total": r.monto_total,
                    "fecha_cancelacion": r.fecha_cancelacion,
                    "motivo_cancelacion": r.motivo_cancelacion,
                    "versiones_archivos": getattr(r, "document_history", []),
                    "viaje_id": r.viaje_id,
                    "pdf_url": getattr(r, "pdf_url", None),
                }
            )

    # ==========================================
    # 3. COMPLEMENTOS DE PAGO CLIENTES (REP / COM)
    # ==========================================
    elif tipo_documento == "PAGO_CLIENTE":
        # SUB-PARTE A: Complementos CFDI Oficiales (Tipo P)
        query_cfdi = (
            db.query(models.ReceivableInvoice)
            .join(models.Client, models.ReceivableInvoice.client_id == models.Client.id)
            .outerjoin(models.Trip, models.ReceivableInvoice.viaje_id == models.Trip.id)
        )

        query_cfdi = query_cfdi.filter(
            models.ReceivableInvoice.record_status
            != RecordStatus.ELIMINADO,  # <-- BLINDAJE 1
            or_(
                models.ReceivableInvoice.status_sat != "ERROR",
                models.ReceivableInvoice.status_sat.is_(None),
            ),
            or_(
                models.ReceivableInvoice.tipo_comprobante.ilike(
                    "P"
                ),  # <-- BLINDAJE 3 (Flexible a BD)
                models.ReceivableInvoice.folio_interno.ilike("COM%"),
            ),
            or_(
                models.ReceivableInvoice.viaje_id.is_(None),
                models.Trip.record_status != RecordStatus.ELIMINADO,
            ),
        )

        if start_date and end_date:
            query_cfdi = query_cfdi.filter(
                models.ReceivableInvoice.fecha_emision.between(start_date, end_date)
            )

        resultados_cfdi = (
            query_cfdi.order_by(desc(models.ReceivableInvoice.fecha_emision))
            .limit(250)
            .all()
        )

        for r in resultados_cfdi:
            status_fiscal = r.status_sat.upper() if r.status_sat else "PROVISIONAL"
            records.append(
                {
                    "id": f"cfdi-{r.id}",
                    "tipo_documento": "PAGO_CLIENTE",
                    "folio": r.folio_interno,
                    "uuid": r.uuid,
                    "fecha_emision": r.fecha_emision,
                    "estatus": status_fiscal,
                    "cliente_proveedor_nombre": (
                        r.client.razon_social if r.client else "Desconocido"
                    ),
                    "monto_total": r.monto_total,
                    "fecha_cancelacion": r.fecha_cancelacion,
                    "motivo_cancelacion": r.motivo_cancelacion,
                    "versiones_archivos": getattr(r, "document_history", []),
                    "viaje_id": r.viaje_id,
                    "pdf_url": getattr(r, "pdf_url", None),
                }
            )

        # SUB-PARTE B: Recibos Internos de Tesorería vinculados
        query_pagos = (
            db.query(models.ReceivableInvoicePayment)
            .join(
                models.ReceivableInvoice,
                models.ReceivableInvoicePayment.invoice_id
                == models.ReceivableInvoice.id,
            )
            .join(models.Client, models.ReceivableInvoice.client_id == models.Client.id)
        )

        # Filtramos explícitamente los que NO están cancelados para evitar errores visuales
        query_pagos = query_pagos.filter(
            models.ReceivableInvoicePayment.estatus != "CANCELADO"
        )

        if start_date and end_date:
            query_pagos = query_pagos.filter(
                models.ReceivableInvoicePayment.fecha_pago.between(start_date, end_date)
            )

        resultados_pagos = (
            query_pagos.order_by(desc(models.ReceivableInvoicePayment.fecha_pago))
            .limit(250)
            .all()
        )

        for r in resultados_pagos:
            val_estatus = getattr(r.estatus, "value", str(r.estatus)).upper()

            if val_estatus == "CANCELADO":
                status_fiscal = "CANCELADO"
            elif getattr(r, "complemento_uuid", None):
                status_fiscal = "TIMBRADO"
            else:
                status_fiscal = "RECIBO INTERNO"

            folio_padre = r.invoice.folio_interno if r.invoice else "S/F"
            comp_uuid = getattr(r, "complemento_uuid", None)

            if comp_uuid:
                if r.referencia and "COM" in r.referencia.upper():
                    folio_mostrar = f"{r.referencia} (Fra: {folio_padre})"
                else:
                    folio_mostrar = f"COM-{r.id} (Fra: {folio_padre})"
            else:
                folio_mostrar = (
                    f"{r.referencia or f'Recibo-{r.id}'} (Fra: {folio_padre})"
                )

            records.append(
                {
                    "id": f"rec-{r.id}",
                    "tipo_documento": "PAGO_CLIENTE",
                    "folio": folio_mostrar,
                    "uuid": comp_uuid,
                    "fecha_emision": getattr(r, "fecha_pago", None),
                    "estatus": status_fiscal,
                    "cliente_proveedor_nombre": (
                        r.invoice.client.razon_social
                        if r.invoice and r.invoice.client
                        else "Desconocido"
                    ),
                    "monto_total": getattr(r, "monto", 0),
                    "fecha_cancelacion": getattr(r, "fecha_cancelacion", None),
                    "motivo_cancelacion": getattr(r, "motivo_cancelacion", None),
                    "versiones_archivos": getattr(
                        r, "document_history", []
                    ),  # <-- BLINDAJE 2: Evita el Crash 500
                    "viaje_id": r.invoice.viaje_id if r.invoice else None,
                    "pdf_url": getattr(r, "comprobante_url", None)
                    or getattr(r, "pdf_url", None),  # <-- BLINDAJE
                }
            )

    return records


def get_cfdi_timeline(db: Session, tipo_documento: str, document_id: int):
    # (El código del timeline se queda igual, no hay necesidad de alterarlo)
    timeline = []
    modulo_map = {
        "FACTURA_CLIENTE": "receivable_invoices",
        "FACTURA_PROVEEDOR": "payable_invoices",
        "PAGO_CLIENTE": "receivable_invoice_payments",
    }
    modulo_target = modulo_map.get(tipo_documento, "")

    audit_logs = (
        db.query(AuditLog)
        .join(User, AuditLog.user_id == User.id, isouter=True)
        .filter(
            AuditLog.modulo == modulo_target,
            AuditLog.detalles.ilike(f"%id': {document_id}%"),
        )
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    for log in audit_logs:
        timeline.append(
            {
                "fecha": log.created_at,
                "accion": log.accion,
                "tipo_accion": log.tipo_accion,
                "usuario": (
                    f"{log.user.nombre} {log.user.apellido}" if log.user else "Sistema"
                ),
                "detalles": log.detalles,
            }
        )

    return timeline
