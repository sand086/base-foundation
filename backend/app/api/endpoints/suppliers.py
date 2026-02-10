from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas import suppliers as schemas
from app.crud import suppliers as crud

router = APIRouter()

# --- PROVEEDORES ---
@router.get("/suppliers", response_model=List[schemas.SupplierResponse])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_suppliers(db, skip, limit)

@router.post("/suppliers", response_model=schemas.SupplierResponse)
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db)):
    return crud.create_supplier(db, supplier)

# --- CXP (FACTURAS) ---
@router.get("/invoices", response_model=List[schemas.InvoiceResponse])
def read_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_invoices(db, skip, limit)

@router.post("/invoices", response_model=schemas.InvoiceResponse)
def create_invoice(invoice: schemas.InvoiceCreate, db: Session = Depends(get_db)):
    return crud.create_invoice(db, invoice)

# --- PAGOS ---
@router.post("/invoices/{invoice_id}/payments")
def register_payment(invoice_id: int, payment: schemas.PaymentCreate, db: Session = Depends(get_db)):
    invoice = crud.register_payment(db, invoice_id, payment)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {"message": "Pago registrado", "nuevo_saldo": invoice.saldo_pendiente}