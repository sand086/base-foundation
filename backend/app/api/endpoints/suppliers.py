from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import suppliers as schemas
from app.crud import suppliers as crud

router = APIRouter()


# =========================================================
# SUPPLIERS
# =========================================================


@router.get("/suppliers", response_model=List[schemas.SupplierResponse])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_suppliers(db, skip, limit)


@router.get("/suppliers/{supplier_id}", response_model=schemas.SupplierResponse)
def read_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = crud.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return supplier


@router.post("/suppliers", response_model=schemas.SupplierResponse)
def create_supplier(payload: schemas.SupplierCreate, db: Session = Depends(get_db)):
    return crud.create_supplier(db, payload)


@router.put("/suppliers/{supplier_id}", response_model=schemas.SupplierResponse)
def update_supplier(
    supplier_id: int, payload: schemas.SupplierUpdate, db: Session = Depends(get_db)
):
    supplier = crud.update_supplier(db, supplier_id, payload)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return supplier


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    if not crud.delete_supplier(db, supplier_id):
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado"}


# =========================================================
# INVOICES (CXP)
# =========================================================


@router.get("/invoices", response_model=List[schemas.PayableInvoiceResponse])
def read_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_invoices(db, skip, limit)


@router.get("/invoices/{invoice_id}", response_model=schemas.PayableInvoiceResponse)
def read_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.post("/invoices", response_model=schemas.PayableInvoiceResponse)
def create_invoice(
    payload: schemas.PayableInvoiceCreate, db: Session = Depends(get_db)
):
    return crud.create_invoice(db, payload)


@router.put("/invoices/{invoice_id}", response_model=schemas.PayableInvoiceResponse)
def update_invoice(
    invoice_id: int,
    payload: schemas.PayableInvoiceUpdate,
    db: Session = Depends(get_db),
):
    invoice = crud.update_invoice(db, invoice_id, payload)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    if not crud.delete_invoice(db, invoice_id):
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {"message": "Factura eliminada"}


# =========================================================
# PAYMENTS
# =========================================================


@router.post(
    "/invoices/{invoice_id}/payments", response_model=schemas.PayableInvoiceResponse
)
def register_payment(
    invoice_id: int,
    payment: schemas.InvoicePaymentCreate,
    db: Session = Depends(get_db),
):
    invoice = crud.register_payment(db, invoice_id, payment)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice
