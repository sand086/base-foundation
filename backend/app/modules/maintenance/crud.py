# --- Fuente: crud_maintenance.py ---

import os
import shutil
import time
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload, lazyload

from app.models import models

from . import schemas

# -----------------------------
# Helpers
# -----------------------------


def generate_work_order_folio(db: Session) -> str:
    year = datetime.now().year
    count = (
        db.query(models.WorkOrder)
        .filter(models.WorkOrder.folio.like(f"OT-{year}-%"))
        .count()
    )
    return f"OT-{year}-{(count + 1):03d}"


def _not_found(entity: str = "Registro"):
    raise HTTPException(status_code=404, detail=f"{entity} no encontrado")


# -----------------------------
# INVENTORY
# -----------------------------


def list_inventory(
    db: Session, skip: int = 0, limit: int = 100, q: Optional[str] = None
):
    query = (
        db.query(models.InventoryItem)
        .options(joinedload(models.InventoryItem.proveedor))  # CARGAMOS EL PROVEEDOR
        .filter(models.InventoryItem.record_status != models.RecordStatus.ELIMINADO)
    )

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (models.InventoryItem.sku.ilike(like))
            | (models.InventoryItem.descripcion.ilike(like))
        )

    items = (
        query.order_by(models.InventoryItem.id.desc()).offset(skip).limit(limit).all()
    )

    # INYECTAR EL NOMBRE PARA EL FRONTEND
    for item in items:
        if item.proveedor:
            item.proveedor_nombre = item.proveedor.razon_social
        else:
            item.proveedor_nombre = None

    return items


def get_inventory_item(db: Session, item_id: int):
    item = (
        db.query(models.InventoryItem)
        .filter(
            models.InventoryItem.id == item_id,
            models.InventoryItem.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not item:
        _not_found("Item de inventario")
    return item


def create_inventory_item(db: Session, item_in: schemas.InventoryItemCreate):
    # 1. Evitar duplicados
    existe = (
        db.query(models.InventoryItem)
        .filter(
            models.InventoryItem.sku == item_in.sku,
            models.InventoryItem.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail="El SKU ya existe.")

    # 2. Crear el registro exclusivamente en inventario
    # Eliminamos la regla que creaba facturas y afectaba caja chica automáticamente
    # a petición operativa (El gasto entra vía carga de Excel SAT)
    db_item = models.InventoryItem(**item_in.model_dump(exclude={"bank_account_id"}))
    db.add(db_item)

    db.commit()
    db.refresh(db_item)
    return db_item


def update_inventory_item(
    db: Session, item_id: int, item_in: schemas.InventoryItemUpdate
):
    db_item = get_inventory_item(db, item_id)
    for k, v in item_in.model_dump(exclude_unset=True).items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_inventory_item(db: Session, item_id: int):
    # Soft delete: record_status = E
    item = get_inventory_item(db, item_id)
    item.record_status = models.RecordStatus.ELIMINADO
    item.sku = f"{item.sku}_DEL_{int(time.time())}"
    db.commit()
    return True


# -----------------------------
# MECHANICS
# -----------------------------


def list_mechanics(
    db: Session, skip: int = 0, limit: int = 100, only_active: bool = True
):
    query = (
        db.query(models.Mechanic)
        .options(joinedload(models.Mechanic.documents))
        .filter(models.Mechanic.record_status != models.RecordStatus.ELIMINADO)
    )

    if only_active:
        query = query.filter(models.Mechanic.activo.is_(True))

    return query.order_by(models.Mechanic.id.desc()).offset(skip).limit(limit).all()


def get_mechanic(db: Session, mechanic_id: int):
    mech = (
        db.query(models.Mechanic)
        .options(joinedload(models.Mechanic.documents))
        .filter(
            models.Mechanic.id == mechanic_id,
            models.Mechanic.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not mech:
        _not_found("Mecánico")
    return mech


def create_mechanic(db: Session, mechanic_in: schemas.MechanicCreate):
    db_mech = models.Mechanic(**mechanic_in.model_dump())
    db.add(db_mech)
    db.commit()
    db.refresh(db_mech)
    return db_mech


def update_mechanic(db: Session, mechanic_id: int, mechanic_in: schemas.MechanicUpdate):
    db_mech = get_mechanic(db, mechanic_id)
    for k, v in mechanic_in.model_dump(exclude_unset=True).items():
        setattr(db_mech, k, v)
    db.commit()
    db.refresh(db_mech)
    return db_mech


def delete_mechanic(db: Session, mechanic_id: int):
    db_mech = get_mechanic(db, mechanic_id)
    db_mech.activo = False
    db_mech.record_status = models.RecordStatus.ELIMINADO

    # Liberamos RFC, NSS y Email (los que tengan unique=True en tu modelo)
    timestamp = int(time.time())
    if db_mech.rfc:
        db_mech.rfc = f"{db_mech.rfc}_DEL_{timestamp}"
    if db_mech.email:
        db_mech.email = f"del_{timestamp}_{db_mech.email}"
    if db_mech.nss:
        db_mech.nss = f"{db_mech.nss}_DEL_{timestamp}"

    db.commit()
    return True


# ---- mechanic documents ----


def upload_mechanic_document(
    db: Session,
    mechanic_id: int,
    doc_type: str,
    file: UploadFile,
    upload_dir: str = "app/uploads/mechanics",
    static_prefix: str = "/static/mechanics",
):
    mechanic = get_mechanic(db, mechanic_id)

    os.makedirs(upload_dir, exist_ok=True)

    clean_filename = f"{mechanic_id}_{doc_type}_{file.filename}".replace(" ", "_")
    file_location = os.path.join(upload_dir, clean_filename)

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url_publica = f"{static_prefix}/{clean_filename}"

    db_doc = models.MechanicDocument(
        mechanic_id=mechanic.id,
        tipo_documento=doc_type,
        nombre_archivo=file.filename,
        url_archivo=url_publica,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc


def list_mechanic_documents(db: Session, mechanic_id: int):
    get_mechanic(db, mechanic_id)
    return (
        db.query(models.MechanicDocument)
        .filter(
            models.MechanicDocument.mechanic_id == mechanic_id,
            models.MechanicDocument.record_status != models.RecordStatus.ELIMINADO,
        )
        .order_by(models.MechanicDocument.id.desc())
        .all()
    )


def delete_mechanic_document(db: Session, document_id: int):
    doc = (
        db.query(models.MechanicDocument)
        .filter(
            models.MechanicDocument.id == document_id,
            models.MechanicDocument.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not doc:
        _not_found("Documento")

    # best effort borrar archivo físico
    try:
        relative_path = doc.url_archivo.replace("/static/", "app/uploads/")
        if os.path.exists(relative_path):
            os.remove(relative_path)
    except Exception:
        pass

    doc.record_status = models.RecordStatus.ELIMINADO
    db.commit()
    return True


# -----------------------------
# WORK ORDERS
# -----------------------------


def list_work_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[models.WorkOrderStatus] = None,
):
    query = (
        db.query(models.WorkOrder)
        .options(
            joinedload(models.WorkOrder.unit),
            joinedload(models.WorkOrder.mechanic),
            joinedload(models.WorkOrder.parts).joinedload(models.WorkOrderPart.item),
        )
        .filter(models.WorkOrder.record_status != models.RecordStatus.ELIMINADO)
    )

    if status:
        query = query.filter(models.WorkOrder.status == status)

    orders = query.order_by(models.WorkOrder.id.desc()).offset(skip).limit(limit).all()

    # campos planos para UI
    for o in orders:
        o.unit_numero = o.unit.numero_economico if o.unit else None
        o.mechanic_nombre = o.mechanic.nombre if o.mechanic else None
        for p in o.parts:
            if p.item:
                p.item_sku = p.item.sku
                p.item_descripcion = p.item.descripcion
            else:
                p.item_sku = "ELIMINADO"
                p.item_descripcion = None

    return orders


def get_work_order(db: Session, order_id: int):
    order = (
        db.query(models.WorkOrder)
        .options(
            joinedload(models.WorkOrder.unit),
            joinedload(models.WorkOrder.mechanic),
            joinedload(models.WorkOrder.parts).joinedload(models.WorkOrderPart.item),
        )
        .filter(
            models.WorkOrder.id == order_id,
            models.WorkOrder.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not order:
        _not_found("Orden de trabajo")

    order.unit_numero = order.unit.numero_economico if order.unit else None
    order.mechanic_nombre = order.mechanic.nombre if order.mechanic else None
    for p in order.parts:
        if p.item:
            p.item_sku = p.item.sku
            p.item_descripcion = p.item.descripcion
        else:
            p.item_sku = "ELIMINADO"
            p.item_descripcion = None

    return order


def create_work_order(db: Session, order_in: schemas.WorkOrderCreate):
    try:
        folio = generate_work_order_folio(db)
        now = datetime.now(timezone.utc)  # Generamos la hora en Python

        # 1. Asignamos los datos base y financieros (Mano de obra e IVA)
        db_order = models.WorkOrder(
            folio=folio,
            unit_id=order_in.unit_id,
            mechanic_id=order_in.mechanic_id,
            descripcion_problema=order_in.descripcion_problema,
            status=models.WorkOrderStatus.ABIERTA,
            fecha_apertura=now,
            tipo_mantenimiento=order_in.tipo_mantenimiento,
            trip_id=order_in.trip_id,
            costo_mano_obra=getattr(order_in, "costo_mano_obra", 0.0),
            porcentaje_iva=getattr(order_in, "porcentaje_iva", 16.0),
        )
        db.add(db_order)
        db.flush()  # obtiene id sin commit

        sum_parts_cost = 0.0

        # 2. Partes: bloquear inventario, validar stock, snapshot costo
        for part in order_in.parts:
            item = (
                db.query(models.InventoryItem)
                .filter(models.InventoryItem.id == part.inventory_item_id)
                .options(lazyload("*"))
                .with_for_update(
                    of=models.InventoryItem
                )  # Especificamos bloquear solo esta tabla
                .first()
            )
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Refacción con ID {part.inventory_item_id} no encontrada",
                )
            if item.record_status == models.RecordStatus.ELIMINADO:
                raise HTTPException(
                    status_code=400,
                    detail=f"Refacción {item.sku} está eliminada",
                )
            if item.stock_actual < part.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {item.sku}. Disponible: {item.stock_actual}",
                )

            db_part = models.WorkOrderPart(
                work_order_id=db_order.id,
                inventory_item_id=item.id,
                cantidad=part.cantidad,
                costo_unitario_snapshot=item.precio_unitario,
                created_at=now,
            )
            item.stock_actual -= part.cantidad
            db.add(db_part)

            # Acumulamos el costo de refacciones
            sum_parts_cost += part.cantidad * item.precio_unitario

        # 3. CÁLCULO FINANCIERO EXACTO
        # Como las refacciones ya incluyen IVA, el porcentaje solo aplica a la mano de obra
        db_order.subtotal = sum_parts_cost + db_order.costo_mano_obra
        iva_mano_obra = db_order.costo_mano_obra * (db_order.porcentaje_iva / 100)
        db_order.total = sum_parts_cost + db_order.costo_mano_obra + iva_mano_obra

        db.commit()
        return get_work_order(db, db_order.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear orden: {str(e)}")


def update_work_order(db: Session, order_id: int, order_in: schemas.WorkOrderCreate):
    # 1. Buscar la orden activa
    db_order = (
        db.query(models.WorkOrder)
        .filter(
            models.WorkOrder.id == order_id,
            models.WorkOrder.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not db_order:
        _not_found("Orden de trabajo")

    # 2. Actualizar campos generales y financieros
    db_order.unit_id = order_in.unit_id
    db_order.mechanic_id = order_in.mechanic_id
    db_order.descripcion_problema = order_in.descripcion_problema
    db_order.tipo_mantenimiento = order_in.tipo_mantenimiento
    db_order.trip_id = order_in.trip_id

    if hasattr(order_in, "costo_mano_obra"):
        db_order.costo_mano_obra = order_in.costo_mano_obra
    if hasattr(order_in, "porcentaje_iva"):
        db_order.porcentaje_iva = order_in.porcentaje_iva

    # 3. Manejo de Refacciones (CERO DELETES)
    for old_part in db_order.parts:
        if getattr(old_part, "record_status", "A") != models.RecordStatus.ELIMINADO:
            if old_part.item:
                old_part.item.stock_actual += old_part.cantidad
            if hasattr(old_part, "record_status"):
                old_part.record_status = models.RecordStatus.ELIMINADO

    now = datetime.now(timezone.utc)
    sum_parts_cost = 0.0

    for part in order_in.parts:
        item = (
            db.query(models.InventoryItem)
            .filter(models.InventoryItem.id == part.inventory_item_id)
            .first()
        )

        if not item or item.record_status == models.RecordStatus.ELIMINADO:
            raise HTTPException(
                status_code=404,
                detail=f"Refacción ID {part.inventory_item_id} no válida o eliminada",
            )

        if item.stock_actual < part.cantidad:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {item.sku}. Disponible: {item.stock_actual}",
            )

        item.stock_actual -= part.cantidad

        new_part = models.WorkOrderPart(
            work_order_id=db_order.id,
            inventory_item_id=item.id,
            cantidad=part.cantidad,
            costo_unitario_snapshot=item.precio_unitario,
            created_at=now,
        )
        db.add(new_part)

        # Acumulamos el costo de refacciones nuevas
        sum_parts_cost += part.cantidad * item.precio_unitario

    # 4. CÁLCULO FINANCIERO EXACTO (Actualizado)
    db_order.subtotal = sum_parts_cost + getattr(db_order, "costo_mano_obra", 0.0)
    db_order.total = db_order.subtotal * (
        1 + (getattr(db_order, "porcentaje_iva", 16.0) / 100)
    )

    db.commit()
    db.refresh(db_order)
    return get_work_order(db, db_order.id)


def delete_work_order(db: Session, order_id: int):
    # Bloqueamos la orden para evitar errores
    order = (
        db.query(models.WorkOrder)
        .filter(
            models.WorkOrder.id == order_id,
            models.WorkOrder.record_status != models.RecordStatus.ELIMINADO,
        )
        .with_for_update(of=models.WorkOrder)
        .first()
    )
    if not order:
        _not_found("Orden de trabajo")

    # 1. REVERSO DE TESORERÍA (Si la orden ya estaba cerrada y pagada)
    if order.status == models.WorkOrderStatus.CERRADA:
        # Ya no sumamos las piezas, usamos el TOTAL EXACTO (piezas + mano de obra + IVA)
        costo_total_pagado = getattr(order, "total", 0.0)

        if costo_total_pagado > 0:
            account = (
                db.query(models.BankAccount)
                .filter(models.BankAccount.id == 1)
                .with_for_update(of=models.BankAccount)
                .first()
            )
            if account:
                # Regresamos el dinero a la cuenta
                account.saldo += costo_total_pagado

                # Dejamos rastro en Tesorería de que el dinero regresó por eliminación
                mov_reverso = models.BankMovement(
                    bank_account_id=1,
                    tipo="ingreso",
                    monto=costo_total_pagado,
                    concepto=f"Reverso por Eliminación OT: {order.folio}",
                    referencia=f"CANC-OT-{order.folio}",
                    origen_modulo="Mantenimiento",
                    fecha=datetime.now(),
                )
                db.add(mov_reverso)

    # 2. DEVOLUCIÓN DE INVENTARIO (Si no estaba cancelada, devolvemos stock)
    if order.status != models.WorkOrderStatus.CANCELADA:
        for part in order.parts:
            # Bloqueamos el inventario para regresarle las piezas seguro
            item = (
                db.query(models.InventoryItem)
                .filter(models.InventoryItem.id == part.inventory_item_id)
                .with_for_update(of=models.InventoryItem)
                .first()
            )
            if item:
                item.stock_actual += part.cantidad

    # 3. Soft delete de la orden
    order.record_status = models.RecordStatus.ELIMINADO
    db.commit()
    return True


def update_work_order_status(
    db: Session, order_id: int, status: models.WorkOrderStatus
):
    # Aplicamos bloqueo de concurrencia (with_for_update) a la orden
    order = (
        db.query(models.WorkOrder)
        .filter(
            models.WorkOrder.id == order_id,
            models.WorkOrder.record_status != models.RecordStatus.ELIMINADO,
        )
        .with_for_update(of=models.WorkOrder)
        .first()
    )
    if not order:
        _not_found("Orden de trabajo")

    # Devolver el stock si se cancela (y no estaba ya cancelada)
    if (
        status == models.WorkOrderStatus.CANCELADA
        and order.status != models.WorkOrderStatus.CANCELADA
    ):
        for part in order.parts:
            # Bloqueamos el inventario para regresarle las piezas seguro
            item = (
                db.query(models.InventoryItem)
                .filter(models.InventoryItem.id == part.inventory_item_id)
                .with_for_update(of=models.InventoryItem)
                .first()
            )
            if item:
                item.stock_actual += part.cantidad

    # --- LÓGICA DE CIERRE Y TESORERÍA ---
    if (
        status == models.WorkOrderStatus.CERRADA
        and order.status != models.WorkOrderStatus.CERRADA
    ):
        order.fecha_cierre = datetime.now(timezone.utc)

        # 1. Liberar Mecánico
        if order.mechanic_id:
            mechanic = (
                db.query(models.Mechanic)
                .filter(models.Mechanic.id == order.mechanic_id)
                .first()
            )
            if mechanic and hasattr(mechanic, "estatus"):
                mechanic.estatus = "Disponible"

        # 2. Tomamos el TOTAL EXACTO YA CALCULADO EN LA BD (Piezas + Mano Obra + IVA)
        costo_total_a_pagar = getattr(order, "total", 0.0)

        # 3. Afectar Tesorería (Cuenta Banamex ID 1) si hubo un costo
        if costo_total_a_pagar > 0:
            account = (
                db.query(models.BankAccount)
                .filter(models.BankAccount.id == 1)
                .with_for_update(of=models.BankAccount)
                .first()
            )
            if not account:
                raise HTTPException(
                    status_code=404,
                    detail="Cuenta Bancaria principal (Banamex) no encontrada para el pago.",
                )

            # Descontamos el dinero
            account.saldo -= costo_total_a_pagar

            # Creamos el registro del movimiento para el libro mayor de Tesorería
            mov = models.BankMovement(
                bank_account_id=1,
                tipo="egreso",
                monto=costo_total_a_pagar,
                concepto=f"Pago Liquidación OT: {order.folio}",
                referencia=f"OT-{order.folio}",
                origen_modulo="CxP",  # Lo marcamos como CxP para que Tesorería sepa que fue un pago de Mantenimiento
                fecha=datetime.now(),
            )
            db.add(mov)

    # Actualizamos el estatus general
    order.status = status
    db.commit()
    return get_work_order(db, order_id)


def get_or_create_petty_cash_supplier(db: Session):
    rfc_generico = "XAXX010101000"
    supplier = (
        db.query(models.Supplier)
        .filter(
            models.Supplier.rfc == rfc_generico,
            models.Supplier.record_status != models.RecordStatus.ELIMINADO,
        )
        .first()
    )

    if not supplier:
        supplier = models.Supplier(
            razon_social="PROVEEDOR MOSTRADOR / CAJA CHICA",
            rfc=rfc_generico,
            tipo_proveedor="servicios_generales",
            dias_credito=0,
            limite_credito=0.0,
            estatus=models.SupplierStatus.ACTIVO,
        )
        db.add(supplier)
        db.flush()

    return supplier
