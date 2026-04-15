import time
from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import models
from app.models.models import RecordStatus  # <-- Importante para el filtro


def create_purchase_order(db: Session, order_data: dict, user_id: int):
    """Crea la orden de compra desde el Wizard del Frontend"""
    folio = f"OC-{int(time.time())}"  # Puedes hacer un generador más bonito luego

    db_order = models.PurchaseOrder(
        folio=folio,
        tipo=order_data.get("tipo", "compra"),
        supplier_id=order_data["supplier_id"],
        cost_center=order_data.get("cost_center"),
        indirect_category_id=order_data.get("indirect_category_id"),
        requester=order_data.get("requester"),
        required_date=order_data.get("required_date"),
        service_description=order_data.get("service_description"),
        subtotal=order_data["subtotal"],
        iva=order_data["iva"],
        total=order_data["total"],
        moneda=order_data.get("moneda", "MXN"),
        status=models.PurchaseOrderStatus.PENDIENTE,
        created_by_id=user_id,
    )
    db.add(db_order)
    db.flush()

    # Si es de catálogo, le metemos los items
    if order_data.get("tipo") == "compra" and "items" in order_data:
        for item in order_data["items"]:
            db_item = models.PurchaseOrderItem(
                order_id=db_order.id,
                inventory_item_id=item.get(
                    "inventory_item_id"
                ),  # Ajusta según tu esquema
                descripcion=item.get("descripcion"),
                cantidad=item.get("cantidad"),
                unidad=item.get("unidad"),
                precio_unitario=item.get("precioUnitario"),
                subtotal=item.get("subtotal"),
            )
            db.add(db_item)

    db.commit()
    db.refresh(db_order)
    return db_order


def receive_purchase_order(
    db: Session, order_id: int, invoice_folio_externo: str = None
):
    """
    EL NÚCLEO DE LA AUTOMATIZACIÓN:
    Se llama cuando en el Frontend le dan "Recibir Mercancía" o "Dar por bueno el Servicio".
    """
    order = (
        db.query(models.PurchaseOrder)
        .filter(
            models.PurchaseOrder.id == order_id,
            models.PurchaseOrder.record_status
            != RecordStatus.ELIMINADO,  # <-- PROTECCIÓN AGREGADA
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if order.status == models.PurchaseOrderStatus.RECIBIDA:
        raise HTTPException(status_code=400, detail="Esta orden ya fue recibida")

    # 1. ACTUALIZAR INVENTARIO (Solo si es Catálogo/Bienes)
    if order.tipo == "compra":
        for item in order.items:
            if item.inventory_item_id:
                inv_item = (
                    db.query(models.InventoryItem)
                    .filter(
                        models.InventoryItem.id == item.inventory_item_id,
                        models.InventoryItem.record_status
                        != RecordStatus.ELIMINADO,  # <-- PROTECCIÓN AGREGADA
                    )
                    .first()
                )
                if inv_item:
                    # Sumamos el stock automáticamente
                    inv_item.stock_actual += int(item.cantidad)
                    # Aquí podrías recalcular el precio promedio ponderado (Costo Promedio)
                    db.add(inv_item)

    # 2. CREAR LA PROVISIÓN EN CXP (Automático)
    # Buscamos los días de crédito del proveedor para la fecha de vencimiento
    dias_credito = (
        order.supplier.dias_credito
        if (order.supplier and order.supplier.dias_credito)
        else 15
    )

    concepto_cxp = (
        order.service_description
        if order.tipo != "compra"
        else f"Compra de Inventario s/OC {order.folio}"
    )

    new_invoice = models.PayableInvoice(
        supplier_id=order.supplier_id,
        categoria_indirecto_id=order.indirect_category_id,
        folio_interno=invoice_folio_externo or f"OC-{order.folio}",
        concepto=concepto_cxp[:200],
        subtotal=order.subtotal,
        iva=order.iva,
        retenciones=0.0,
        monto_total=order.total,
        saldo_pendiente=order.total,
        moneda=order.moneda,
        fecha_emision=date.today(),
        fecha_vencimiento=date.today() + timedelta(days=dias_credito),
        # 🚀 CAMPOS CLAVE PARA EL EXCEL DEL SAT 🚀
        estatus=models.InvoiceStatus.PENDIENTE,
        metodo_pago="PPD",  # Nace como PPD para que sea CxP Real
        tipo_comprobante="I",  # Ingreso
        clasificacion=order.tipo,  # compra, servicio, gasto_indirecto
    )
    db.add(new_invoice)

    # 3. CERRAMOS LA ORDEN
    order.status = models.PurchaseOrderStatus.RECIBIDA

    db.commit()
    db.refresh(order)
    return order
