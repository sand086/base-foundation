from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from fastapi import HTTPException
from datetime import datetime, timedelta, date

from app.models import models
from app.models.models import RecordStatus  # <-- Importante para el filtro
from . import schemas

# =====================================================================
# PROVIDERS & CATEGORIES
# =====================================================================


def get_providers(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Provider)
        .filter(models.Provider.record_status != RecordStatus.ELIMINADO)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_provider(db: Session, provider: schemas.ProviderCreate):
    db_provider = models.Provider(**provider.model_dump())
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider


def delete_provider(db: Session, provider_id: str):
    provider = (
        db.query(models.Provider)
        .filter(
            models.Provider.id == provider_id,
            models.Provider.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if provider:
        # Reemplazamos db.delete por Soft Delete
        provider.record_status = RecordStatus.ELIMINADO
        db.commit()
        return True
    return False


def get_indirect_categories(db: Session):
    return (
        db.query(models.IndirectExpenseCategory)
        .filter(models.IndirectExpenseCategory.record_status != RecordStatus.ELIMINADO)
        .all()
    )


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

    #  MAGIA: SOFT DELETE
    account.estatus = "inactivo"
    account.record_status = RecordStatus.ELIMINADO

    db.commit()
    return True


def get_bank_movements(db: Session):
    try:
        return (
            db.query(models.BankMovement)
            .options(joinedload(models.BankMovement.bank_account))
            .filter(models.BankMovement.record_status != RecordStatus.ELIMINADO)
            .order_by(models.BankMovement.fecha.desc())
            .all()
        )
    except Exception as e:
        print(f"Error en get_bank_movements: {e}")
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
        fecha=fecha_mov,  # <--- ¡AQUÍ ESTÁ EL FIX! Ahora sí mandamos la fecha a la BD
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

        # 2. GESTIÓN DEL PROVEEDOR
        provider = (
            db.query(models.Provider)
            .filter(
                models.Provider.rfc == rfc,
                models.Provider.record_status != RecordStatus.ELIMINADO,
            )
            .first()
        )

        # Obtener días de crédito (del Excel o 0 por defecto)
        try:
            dias_credito_excel = int(item.get("dias_credito") or 0)
        except (ValueError, TypeError):
            dias_credito_excel = 0

        if not provider:
            # Crear proveedor al vuelo
            provider = models.Provider(
                razon_social=nombre,
                rfc=rfc,
                dias_credito=dias_credito_excel,
                estatus="activo",
            )
            db.add(provider)
            db.flush()  # Guardar temporalmente para obtener el ID
            proveedores_creados += 1

        # Los días de crédito finales son los del proveedor o los del Excel
        dias_finales = (
            dias_credito_excel
            if dias_credito_excel > 0
            else (provider.dias_credito or 0)
        )

        # 3. GESTIÓN DE FECHAS
        fecha_str = str(item.get("fecha_emision") or "")
        try:
            # El SAT a veces manda '2023-08-01 06:00:00' o '2023-08-01'
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

        # 5. CREACIÓN DE FACTURA (CXP)
        concepto = str(item.get("concepto") or "Factura importada del SAT")

        invoice = models.PayableInvoice(
            supplier_id=provider.id,
            uuid=uuid_fiscal,
            folio=str(item.get("folio") or ""),
            concepto=concepto[:200],  # Truncar por si viene muy largo
            monto_total=total,
            saldo_pendiente=total,  # Al importarse, se debe todo
            fecha_emision=fecha_obj.date(),
            fecha_vencimiento=vencimiento.date(),
            # NOTA: quitamos dias_credito porque PayableInvoice no lo tiene en tu modelo Base
            moneda=str(item.get("moneda") or "MXN").strip()[:3],
            estatus="pendiente",
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
            .with_for_update()
            .first()
        )
        if not invoice:
            raise ValueError("Factura no encontrada.")

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
                # El AuditMixin manejará el created_at y record_status
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
        #   1. Crear el registro del abono (CON NUEVOS CAMPOS)
        # ======================================================
        nuevo_pago = models.InvoicePayment(
            invoice_id=invoice.id,
            bank_account_id=bank_account_id,
            fecha_pago=payment_data.get("fecha_pago", date.today()),
            monto=monto_pago,
            # CAMPOS DEL SAT/REP AÑADIDOS AQUI:
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
        mov_schema = schemas.BankMovementCreate(
            bank_account_id=bank_account_id,
            tipo="egreso",
            monto=monto_pago,
            concepto=f"Pago CxP - Fra. {invoice.folio_interno or invoice.uuid[:8]}",
            referencia=payment_data.get("referencia", ""),
        )
        # Delegamos a la función que ya ajusta los saldos bancarios de forma segura
        create_bank_movement(db, mov_schema, user_id)

        # Confirmamos la transacción (Se aplican todos los db.add y db.flush)
        db.commit()
        db.refresh(invoice)
        return invoice

    except Exception as e:
        # ATOMICIDAD: Si algo falla (ej. error en create_bank_movement), echamos todo para atrás
        db.rollback()
        raise e


def register_petty_cash_expense(db: Session, expense_data: dict, user_id: int):
    """
    Registra un gasto directo (Caja Chica) sin factura de por medio.
    Extrae el dinero directamente de la cuenta bancaria.
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

    # El frontend manda 'conceptos' como un array. Tomamos la primera descripción
    conceptos = data.get("conceptos", [])
    concepto_general = (
        conceptos[0].get("descripcion", "Factura Manual")
        if conceptos
        else "Servicio de Transporte"
    )

    # Procesar fechas de texto ("YYYY-MM-DD") a objetos Date
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
        # NO usamos dias_credito directamente aqui si tu modelo no lo tiene declarado
        metodo_pago=data.get("metodo_pago", "PPD"),
        forma_pago=data.get("forma_pago", "99"),
        tipo_comprobante="I",
        estatus=models.InvoiceStatus.PENDIENTE,
    )

    db.add(nueva_factura)
    db.commit()
    db.refresh(nueva_factura)

    return nueva_factura


def process_sat_master_report(
    db: Session,
    payload_data: list[dict],
    my_rfc: str = "RTX110624KP5",
    original_file_name: str = "",
):
    """
    Motor de Conciliación Universal (CxP y CxC).
    Lee el Excel del SAT convertido a dicts y cruza la operación con lo fiscal.
    Valida duplicados, ignora cancelados y entiende ambas pestañas del SAT.
    """
    resultados = {
        "cxp_creadas": 0,
        "cxc_creadas": 0,
        "pagos_pue_procesados": 0,
        "complementos_procesados": 0,
        "notas_credito_aplicadas": 0,
        "ignorados_duplicados": 0,
        "ignorados_cancelados": 0,
        "cecos_creados_al_vuelo": 0,  # <-- NUEVA METRICA
    }

    for item in payload_data:
        # 1. IGNORAR FACTURAS CANCELADAS (Para no generar deudas fantasma)
        estado_sat = str(item.get("Estado", "")).strip().upper()
        if estado_sat == "CANCELADO":
            resultados["ignorados_cancelados"] += 1
            continue

        rfc_emisor = str(item.get("Rfc Emisor", "")).strip()
        nombre_emisor = str(item.get("Nombre Emisor", "")).strip()
        rfc_receptor = str(item.get("Rfc Receptor", "")).strip()
        nombre_receptor = str(item.get("Nombre Receptor", "")).strip()
        uuid_fiscal = str(item.get("UUID", "")).strip()

        if not uuid_fiscal:
            continue

        # 2. UNIFICACIÓN DE COLUMNAS (Facturas vs Complementos de Pago)
        tipo_raw = str(item.get("Tipo", "")).strip().lower()
        if "nota de crédito" in tipo_raw:
            tipo_comprobante = "egreso"
        elif "pago" in tipo_raw:
            tipo_comprobante = "pago"
        else:
            tipo_comprobante = "ingreso"

        #   FIX APLICADO: Truncamiento de métodos y formas de pago para evitar error en BD
        metodo_pago_raw = (
            str(item.get("Método de Pago") or item.get("MetodoDePagoDR") or "")
            .strip()
            .upper()
        )
        metodo_pago = (
            metodo_pago_raw.split("-")[0].strip()[:5] if metodo_pago_raw else None
        )

        forma_pago_raw = str(
            item.get("Forma de Pago") or item.get("FormaDePago") or ""
        ).strip()
        forma_pago = (
            forma_pago_raw.split("-")[0].strip()[:5] if forma_pago_raw else None
        )

        uuid_relacionado = str(
            item.get("Relacionados") or item.get("idDocumento") or ""
        ).strip()
        folio = str(item.get("Folio", "")).strip()
        moneda = str(item.get("Moneda") or item.get("MonedaDR") or "MXN").strip()[:3]

        raw_fecha = str(
            item.get("Fecha")
            or item.get("FechaPago")
            or item.get("Fecha emisión")
            or ""
        )
        try:
            fecha_obj = datetime.strptime(
                raw_fecha.split("T")[0].split()[0], "%Y-%m-%d"
            )
        except:
            fecha_obj = datetime.utcnow()

        raw_subtotal = item.get("Sub Total", 0)
        raw_total = item.get("Total") or item.get("ImpPagado") or 0
        raw_iva = item.get("Traslado IVA 16 %", 0)
        raw_ret_isr = item.get("Retención ISR", 0)
        raw_ret_iva = item.get("Retención IVA", 0)

        try:
            subtotal = float(str(raw_subtotal).replace("$", "").replace(",", ""))
            total = float(str(raw_total).replace("$", "").replace(",", ""))
            iva = float(str(raw_iva).replace("$", "").replace(",", ""))
            retenciones = float(
                str(raw_ret_isr).replace("$", "").replace(",", "")
            ) + float(str(raw_ret_iva).replace("$", "").replace(",", ""))
        except (ValueError, TypeError):
            subtotal, total, iva, retenciones = 0.0, 0.0, 0.0, 0.0

        # ==========================================
        #   EXTRACCIÓN DE NUEVOS CAMPOS DEL SAT
        # ==========================================
        descuento_raw = item.get("Descuento", 0)
        tc_raw = item.get("Tipo de Cambio", 1.0)
        uso_cfdi_raw = str(item.get("Uso CFDI", "")).split("-")[0].strip()[:5]
        serie_raw = str(item.get("Serie", "")).strip()[:20]

        try:
            descuento = (
                float(str(descuento_raw).replace("$", "").replace(",", ""))
                if descuento_raw
                else 0.0
            )
            tipo_cambio = (
                float(str(tc_raw).replace("$", "").replace(",", "")) if tc_raw else 1.0
            )
        except:
            descuento, tipo_cambio = 0.0, 1.0

        # Desglose de impuestos en JSON
        ish_raw = item.get("ISH:0.03%") or item.get("ISH:0.30%") or 0
        try:
            val_isr = (
                float(str(raw_ret_isr).replace("$", "").replace(",", ""))
                if raw_ret_isr
                else 0.0
            )
            val_iva_ret = (
                float(str(raw_ret_iva).replace("$", "").replace(",", ""))
                if raw_ret_iva
                else 0.0
            )
            val_ish = (
                float(str(ish_raw).replace("$", "").replace(",", ""))
                if ish_raw
                else 0.0
            )
        except:
            val_isr, val_iva_ret, val_ish = 0.0, 0.0, 0.0

        desglose_impuestos = {
            "retencion_isr": val_isr,
            "retencion_iva": val_iva_ret,
            "ish": val_ish,
        }

        is_cxc = rfc_emisor.upper() == my_rfc.upper()

        # --- REGLA ANTI-DUPLICADOS ---
        if tipo_comprobante == "ingreso":
            if is_cxc:
                existing = (
                    db.query(models.ReceivableInvoice)
                    .filter(
                        models.ReceivableInvoice.uuid == uuid_fiscal,
                        models.ReceivableInvoice.record_status
                        != models.RecordStatus.ELIMINADO,
                    )
                    .first()
                )
            else:
                existing = (
                    db.query(models.PayableInvoice)
                    .filter(
                        models.PayableInvoice.uuid == uuid_fiscal,
                        models.PayableInvoice.record_status
                        != models.RecordStatus.ELIMINADO,
                    )
                    .first()
                )

            if existing:
                resultados["ignorados_duplicados"] += 1
                continue

        # ==========================================
        # FLUJO A: COMPROBANTES TIPO "INGRESO" (FACTURAS NORMALES)
        # ==========================================
        if tipo_comprobante == "ingreso":
            saldo_pendiente = 0.0 if metodo_pago == "PUE" else total
            estatus_factura = (
                models.InvoiceStatus.PAGADO
                if metodo_pago == "PUE"
                else models.InvoiceStatus.PENDIENTE
            )

            if is_cxc:
                client = (
                    db.query(models.Client)
                    .filter(
                        models.Client.rfc == rfc_receptor,
                        models.Client.record_status != models.RecordStatus.ELIMINADO,
                    )
                    .first()
                )
                if not client:
                    client = models.Client(
                        razon_social=nombre_receptor, rfc=rfc_receptor, estatus="activo"
                    )
                    db.add(client)
                    db.flush()

                invoice = models.ReceivableInvoice(
                    client_id=client.id,
                    uuid=uuid_fiscal,
                    folio_interno=folio,
                    subtotal=subtotal,
                    iva=iva,
                    retenciones=retenciones,
                    monto_total=total,
                    saldo_pendiente=saldo_pendiente,
                    moneda=moneda,
                    fecha_emision=fecha_obj.date(),
                    fecha_vencimiento=(
                        fecha_obj + timedelta(days=client.dias_credito or 15)
                    ).date(),
                    estatus=estatus_factura,
                    metodo_pago=metodo_pago,
                    forma_pago=forma_pago,
                    tipo_comprobante="I",
                )
                db.add(invoice)
                resultados["cxc_creadas"] += 1
            else:
                #   FIX APLICADO: Uso de models.Supplier en lugar de models.Provider
                provider = (
                    db.query(models.Supplier)
                    .filter(
                        models.Supplier.rfc == rfc_emisor,
                        models.Supplier.record_status != models.RecordStatus.ELIMINADO,
                    )
                    .first()
                )
                if not provider:
                    provider = models.Supplier(
                        razon_social=nombre_emisor, rfc=rfc_emisor, estatus="activo"
                    )
                    db.add(provider)
                    db.flush()

                # ==============================================================
                #   LÓGICA DE CENTROS DE COSTOS AUTOMÁTICA (SOLO APLICA A CXP)
                # ==============================================================
                cost_center_id = None
                ceco_name = str(
                    item.get("Centro de Costos ") or item.get("Centro de Costos") or ""
                ).strip()
                if ceco_name:
                    ceco = (
                        db.query(models.CostCenter)
                        .filter(models.CostCenter.nombre.ilike(f"%{ceco_name}%"))
                        .first()
                    )
                    if not ceco:
                        # Si no existe, lo creamos al vuelo para que no se pierda la agrupación en reportes
                        nuevo_ceco_codigo = ceco_name[:15].upper().replace(" ", "-")
                        ceco = models.CostCenter(
                            codigo=nuevo_ceco_codigo, nombre=ceco_name
                        )
                        db.add(ceco)
                        db.flush()
                        resultados["cecos_creados_al_vuelo"] += 1
                    cost_center_id = ceco.id

                # ==============================================================
                # INYECCIÓN DE NUEVOS CAMPOS EN PAYABLE INVOICE
                # ==============================================================
                invoice = models.PayableInvoice(
                    supplier_id=provider.id,
                    cost_center_id=cost_center_id,  # <- Asignación del CECO
                    uuid=uuid_fiscal,
                    serie=serie_raw,  # <- Dato del SAT
                    folio=folio,
                    folio_interno=folio,
                    subtotal=subtotal,
                    descuento=descuento,  # <- Dato del SAT
                    iva=iva,
                    retenciones=retenciones,
                    desglose_impuestos=desglose_impuestos,  # <- JSON con desglose granular
                    monto_total=total,
                    saldo_pendiente=saldo_pendiente,
                    moneda=moneda,
                    tipo_cambio=tipo_cambio,  # <- Dato del SAT
                    fecha_emision=fecha_obj.date(),
                    fecha_vencimiento=(
                        fecha_obj
                        + timedelta(
                            days=provider.dias_credito if provider.dias_credito else 15
                        )
                    ).date(),
                    estatus=estatus_factura,
                    metodo_pago=metodo_pago,
                    forma_pago=forma_pago,
                    tipo_comprobante="I",
                    uso_cfdi=uso_cfdi_raw,  # <- Dato del SAT
                    validacion_efos=False,  # Defecto seguro
                )
                db.add(invoice)
                resultados["cxp_creadas"] += 1

            if metodo_pago == "PUE":
                resultados["pagos_pue_procesados"] += 1

        # ==========================================
        # FLUJO B: COMPROBANTES TIPO "EGRESO" (NOTAS DE CRÉDITO)
        # ==========================================
        elif tipo_comprobante == "egreso" and uuid_relacionado:
            model_class = models.ReceivableInvoice if is_cxc else models.PayableInvoice
            orig_inv = (
                db.query(model_class)
                .filter(
                    model_class.uuid == uuid_relacionado,
                    model_class.record_status != models.RecordStatus.ELIMINADO,
                )
                .first()
            )

            if orig_inv and orig_inv.saldo_pendiente > 0:
                orig_inv.saldo_pendiente = max(0.0, orig_inv.saldo_pendiente - total)
                if orig_inv.saldo_pendiente == 0:
                    orig_inv.estatus = models.InvoiceStatus.PAGADO
            resultados["notas_credito_aplicadas"] += 1

        # ==========================================
        # FLUJO C: COMPROBANTES TIPO "PAGO" (COMPLEMENTOS REP)
        # ==========================================
        elif tipo_comprobante == "pago" and uuid_relacionado:
            payment_model = (
                models.ReceivableInvoicePayment if is_cxc else models.InvoicePayment
            )
            invoice_model = (
                models.ReceivableInvoice if is_cxc else models.PayableInvoice
            )

            pago_existente = (
                db.query(payment_model)
                .filter(payment_model.complemento_uuid == uuid_fiscal)
                .first()
            )
            if pago_existente:
                resultados["ignorados_duplicados"] += 1
                continue

            orig_inv = (
                db.query(invoice_model)
                .filter(
                    invoice_model.uuid == uuid_relacionado,
                    invoice_model.record_status != models.RecordStatus.ELIMINADO,
                )
                .first()
            )

            if orig_inv:
                nuevo_pago = payment_model(
                    invoice_id=orig_inv.id,
                    monto=total,
                    fecha_pago=fecha_obj.date(),
                    metodo_pago=forma_pago,
                    complemento_uuid=uuid_fiscal,
                    referencia="Carga SAT",
                )

                # Si es un InvoicePayment (CXP), inyectamos los campos de parcialidad del REP
                if hasattr(nuevo_pago, "parcialidad"):
                    nuevo_pago.parcialidad = int(item.get("Parcialidad", 1) or 1)
                    nuevo_pago.saldo_anterior = float(
                        item.get("ImpSaldoAnt") or orig_inv.saldo_pendiente
                    )
                    nuevo_pago.saldo_insoluto = float(
                        item.get("SaldoInsoluto")
                        or max(0, orig_inv.saldo_pendiente - total)
                    )

                db.add(nuevo_pago)

                orig_inv.saldo_pendiente = max(0.0, orig_inv.saldo_pendiente - total)
                orig_inv.estatus = (
                    models.InvoiceStatus.PAGADO
                    if orig_inv.saldo_pendiente == 0
                    else models.InvoiceStatus.PAGO_PARCIAL
                )

                # ---   NUEVO: AFECTAR BANCOS EN CARGA MASIVA ---
                # Busca una cuenta comodín para ingresos/egresos del SAT
                cuenta_comodin = (
                    db.query(models.BankAccount)
                    .filter_by(alias="Por Conciliar (SAT)")
                    .first()
                )
                if not cuenta_comodin:
                    cuenta_comodin = models.BankAccount(
                        banco="SAT Virtual",
                        numero_cuenta="000",
                        alias="Por Conciliar (SAT)",
                        tipo_cuenta="virtual",
                    )
                    db.add(cuenta_comodin)
                    db.flush()

                tipo_movimiento = "ingreso" if is_cxc else "egreso"
                mov_schema = schemas.BankMovementCreate(
                    bank_account_id=cuenta_comodin.id,
                    tipo=tipo_movimiento,
                    monto=total,
                    concepto=f"Carga SAT REP - {uuid_fiscal[:8]}",
                    referencia="Carga SAT",
                )

                # Usamos el motor atómico para afectar el saldo bancario de forma segura
                create_bank_movement(db, mov_schema, current_user_id=1)

            resultados["complementos_procesados"] += 1

    db.commit()
    return {"message": "Sincronización SAT Completada", "detalles": resultados}


def conciliate_bank_movement(db: Session, movement_id: int):
    """Marca un movimiento como conciliado con la fecha de hoy"""
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

    # Cambiamos el estatus a conciliado y le ponemos la fecha actual
    movement.conciliado = True
    movement.fecha_conciliacion = date.today()

    db.commit()
    db.refresh(movement)
    return movement


def delete_bank_movement(db: Session, movement_id: int):
    """
    Elimina un movimiento (Soft Delete) y revierte el impacto en el saldo de la cuenta.
    """
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

    # Buscamos la cuenta y la bloqueamos (for update) para evitar errores de concurrencia
    account = (
        db.query(models.BankAccount)
        .filter(models.BankAccount.id == movement.bank_account_id)
        .with_for_update()
        .first()
    )

    if account:
        # Si era un ingreso que sumó dinero, se lo restamos.
        if movement.tipo == "ingreso":
            account.saldo -= movement.monto
        # Si era un egreso que restó dinero, se lo devolvemos.
        elif movement.tipo == "egreso":
            account.saldo += movement.monto

    # Hacemos Soft Delete del movimiento
    movement.record_status = RecordStatus.ELIMINADO

    db.commit()
    return True
