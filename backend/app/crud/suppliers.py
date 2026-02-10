from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import suppliers as schemas
from datetime import datetime

# --- PROVEEDORES ---
def get_suppliers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Supplier).offset(skip).limit(limit).all()

def create_supplier(db: Session, supplier: schemas.SupplierCreate):
    db_supplier = models.Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

# --- FACTURAS ---
def get_invoices(db: Session, skip: int = 0, limit: int = 100):
    invoices = db.query(models.PayableInvoice)\
        .options(joinedload(models.PayableInvoice.supplier), joinedload(models.PayableInvoice.payments))\
        .order_by(models.PayableInvoice.fecha_vencimiento.asc())\
        .offset(skip).limit(limit).all()
    
    # Flatten manual si es necesario, o Pydantic lo hace si el modelo tiene properties
    for inv in invoices:
        inv.supplier_razon_social = inv.supplier.razon_social if inv.supplier else "N/A"
        
    return invoices

def create_invoice(db: Session, invoice: schemas.InvoiceCreate):
    db_invoice = models.PayableInvoice(
        **invoice.model_dump(),
        saldo_pendiente=invoice.monto_total, # Saldo inicial = total
        estatus="pendiente"
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

# --- PAGOS ---
def register_payment(db: Session, invoice_id: int, payment: schemas.PaymentCreate):
    invoice = db.query(models.PayableInvoice).filter(models.PayableInvoice.id == invoice_id).first()
    if not invoice:
        return None
    
    # Crear pago
    db_payment = models.InvoicePayment(
        invoice_id=invoice_id,
        **payment.model_dump()
    )
    db.add(db_payment)
    
    # Actualizar saldo factura
    invoice.saldo_pendiente -= payment.monto
    
    # Actualizar estatus
    if invoice.saldo_pendiente <= 0:
        invoice.saldo_pendiente = 0
        invoice.estatus = "pagado"
    else:
        invoice.estatus = "pago_parcial"
        
    db.commit()
    db.refresh(invoice)
    return invoice # Retornamos la factura actualizada