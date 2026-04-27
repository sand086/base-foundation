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
        origen_modulo=getattr(
            movement_data, "origen_modulo", None
        ),  # 🚀 FIX: Aseguramos el módulo (CxC o CxP)
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
    4. (NUEVO) Hereda automáticamente el Centro de Costos (CECO) asignado al proveedor.
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
        # Usamos getattr por seguridad, por si en alguna migración antigua
        # el modelo Provider aún no tiene reflejada la columna.
        ceco_heredado = getattr(provider, "cost_center_id", None)

        # 5. CREACIÓN DE FACTURA (CXP)
        concepto = str(item.get("concepto") or "Factura importada del SAT")

        invoice = models.PayableInvoice(
            supplier_id=provider.id,
            cost_center_id=ceco_heredado,  # <--- INYECCIÓN DEL CECO AQUÍ
            uuid=uuid_fiscal,
            folio=str(item.get("folio") or ""),
            concepto=concepto[:200],  # Truncar por si viene muy largo
            monto_total=total,
            saldo_pendiente=total,  # Al importarse, se debe todo
            fecha_emision=fecha_obj.date(),
            fecha_vencimiento=vencimiento.date(),
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
        # 🚀 FIX: AÑADIMOS origen_modulo="CxP" PARA TESORERÍA
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


def process_sat_master_report(
    db: Session,
    payload_data: list[dict],
    my_rfc: str = "RTX110624KP5",
    original_file_name: str = "",
):
    """
    Motor de Conciliación Universal (CxP y CxC).
    Lee el Excel del SAT convertido a dicts y cruza la operación con lo fiscal.
    """
    resultados = {
        "cxp_creadas": 0,
        "cxc_creadas": 0,
        "pagos_pue_procesados": 0,
        "complementos_procesados": 0,
        "notas_credito_aplicadas": 0,
        "ignorados_duplicados": 0,
        "ignorados_cancelados": 0,
        "cecos_creados_al_vuelo": 0,
    }

    for item in payload_data:
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

        tipo_raw = str(item.get("Tipo", "")).strip().lower()
        if "nota de crédito" in tipo_raw:
            tipo_comprobante = "egreso"
        elif "pago" in tipo_raw:
            tipo_comprobante = "pago"
        else:
            tipo_comprobante = "ingreso"

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
        # FLUJO A: COMPROBANTES TIPO "INGRESO"
        # ==========================================
        if tipo_comprobante == "ingreso":
            # 🚀 FIX: Forzamos a que TODAS entren con deuda completa y como PENDIENTES
            saldo_pendiente = total
            estatus_factura = models.InvoiceStatus.PENDIENTE

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
                db.flush()  # CRÍTICO: Necesario para obtener invoice.id
                resultados["cxc_creadas"] += 1
            else:
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
                        nuevo_ceco_codigo = ceco_name[:15].upper().replace(" ", "-")
                        ceco = models.CostCenter(
                            codigo=nuevo_ceco_codigo, nombre=ceco_name
                        )
                        db.add(ceco)
                        db.flush()
                        resultados["cecos_creados_al_vuelo"] += 1
                    cost_center_id = ceco.id

                invoice = models.PayableInvoice(
                    supplier_id=provider.id,
                    cost_center_id=cost_center_id,
                    uuid=uuid_fiscal,
                    serie=serie_raw,
                    folio=folio,
                    folio_interno=folio,
                    subtotal=subtotal,
                    descuento=descuento,
                    iva=iva,
                    retenciones=retenciones,
                    desglose_impuestos=desglose_impuestos,
                    monto_total=total,
                    saldo_pendiente=saldo_pendiente,
                    moneda=moneda,
                    tipo_cambio=tipo_cambio,
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
                    uso_cfdi=uso_cfdi_raw,
                    validacion_efos=False,
                )
                db.add(invoice)
                db.flush()  # CRÍTICO: Necesario para obtener invoice.id
                resultados["cxp_creadas"] += 1

            # 🚀 FIX CRÍTICO: SI ES PUE, AFECTAR TESORERÍA EN LA CUENTA COMODÍN
            """             if metodo_pago == "PUE":
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
                        created_by_id=1,
                    )
                    db.add(cuenta_comodin)
                    db.flush()

                tipo_mov = "ingreso" if is_cxc else "egreso"
                mov_schema = schemas.BankMovementCreate(
                    bank_account_id=cuenta_comodin.id,
                    tipo=tipo_mov,
                    monto=total,
                    concepto=f"Factura PUE SAT - {folio or uuid_fiscal[:8]}",
                    referencia="Carga SAT PUE",
                    origen_modulo="CxC" if is_cxc else "CxP",
                )
                create_bank_movement(db, mov_schema, current_user_id=1)
                resultados["pagos_pue_procesados"] += 1 """

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
                        created_by_id=1,
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
                    origen_modulo="CxC" if is_cxc else "CxP",
                )

                create_bank_movement(db, mov_schema, current_user_id=1)
            resultados["complementos_procesados"] += 1

    db.commit()
    return {"message": "Sincronización SAT Completada", "detalles": resultados}


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
    🚀 FIX: Elimina un movimiento (Soft Delete) y revierte el impacto en el saldo de la cuenta.
    Si proviene de CxC o CxP, también revierte el pago en la factura y restaura su saldo.
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

    account = (
        db.query(models.BankAccount)
        .filter(models.BankAccount.id == movement.bank_account_id)
        .with_for_update()
        .first()
    )

    if account:
        if movement.tipo == "ingreso":
            account.saldo -= movement.monto
        elif movement.tipo == "egreso":
            account.saldo += movement.monto

    # 1. ROLLBACK CxC
    if movement.origen_modulo == "CxC":
        pago_cxc = (
            db.query(models.ReceivableInvoicePayment)
            .filter(
                models.ReceivableInvoicePayment.monto == movement.monto,
                models.ReceivableInvoicePayment.cuenta_deposito
                == str(movement.bank_account_id),
            )
            .order_by(models.ReceivableInvoicePayment.id.desc())
            .first()
        )
        if pago_cxc:
            invoice = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.id == pago_cxc.invoice_id)
                .first()
            )
            if invoice:
                invoice.saldo_pendiente += pago_cxc.monto
                if invoice.saldo_pendiente >= invoice.monto_total:
                    invoice.estatus = "pendiente"
                else:
                    invoice.estatus = "pago_parcial"
            db.delete(pago_cxc)

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
                .first()
            )
            if invoice:
                invoice.saldo_pendiente += pago_cxp.monto
                if invoice.saldo_pendiente >= invoice.monto_total:
                    invoice.estatus = "pendiente"
                else:
                    invoice.estatus = "pago_parcial"
            db.delete(pago_cxp)

    movement.record_status = RecordStatus.ELIMINADO
    db.commit()
    return True


def process_operator_settlement(
    db: Session, payload: schemas.OperatorSettlementPayload, user_id: int
):
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

        if not leg or leg.status == "liquidado":
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
            snapshot_km=float((leg.odometro_final or 0) - (leg.odometro_inicial or 0)),
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
                    tipo=SettlementConceptType.INGRESO,
                    amount=leg.monto_sueldo,
                    is_automatic=True,  # CRÍTICO para filtro de PDF
                )
            )

        leg.status = TripStatus.LIQUIDADO
        if leg.leg_type == TripLegType.RUTA:
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
                models.ReceivableInvoice.record_status
                != RecordStatus.ACTIVO,  # Filtro estricto
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
                        estatus=InvoiceStatus.PENDIENTE,
                        created_by_id=user_id,
                    )
                )

    db.commit()
    return {"status": "success", "batch_id": batch.id}
