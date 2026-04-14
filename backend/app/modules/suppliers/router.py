from typing import List, Optional  #  Correcto: Optional viene de typing

# SOLUCIÓN: Agregamos Body aquí
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models
from app.modules.auth.router import get_current_active_user
from . import schemas, crud

router = APIRouter(tags=["Suppliers"])

# =========================================================
# 1. RUTAS ESTÁTICAS / ESPECÍFICAS (DEBEN IR PRIMERO)
# =========================================================


# CXP - Cuentas por Pagar (Facturas de Proveedores)
@router.get("/invoices", response_model=List[schemas.PayableInvoiceResponse])
def read_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_invoices(db, skip, limit)


@router.post("/invoices", response_model=schemas.PayableInvoiceResponse)
def create_invoice(
    payload: schemas.PayableInvoiceCreate, db: Session = Depends(get_db)
):
    return crud.create_invoice(db, payload)


# =========================================================
# 2. RUTAS DE GENERALES DE PROVEEDORES
# =========================================================


@router.get("", response_model=List[schemas.SupplierResponse])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_suppliers(db, skip, limit)


@router.post("", response_model=schemas.SupplierResponse)
def create_supplier(payload: schemas.SupplierCreate, db: Session = Depends(get_db)):
    return crud.create_supplier(db, payload)


# =========================================================
# 3. RUTAS CON PARÁMETROS DINÁMICOS {id} (DEBEN IR AL FINAL)
# =========================================================


@router.get("/invoices/{invoice_id}", response_model=schemas.PayableInvoiceResponse)
def read_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


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


@router.post(
    "/invoices/{invoice_id}/payments", response_model=schemas.PayableInvoiceResponse
)
def register_payment(
    invoice_id: int,
    payment: dict = Body(...),  # Ahora FastAPI sí sabe qué es Body
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        invoice = crud.register_payment(db, invoice_id, payment, current_user.id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return invoice
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.delete("/invoices/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_active_user
    ),  # Inyectamos el usuario
):
    """
    Elimina (Soft Delete) un pago, recalcula la factura y devuelve el dinero a Tesorería.
    """
    try:
        success = crud.delete_payment(db, payment_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=404, detail="Pago no encontrado o ya eliminado"
            )
        return {
            "message": "Pago cancelado. El saldo de la factura y la Tesorería han sido recalculados."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# --- Rutas de Proveedor Individual ---


@router.get("/{supplier_id}", response_model=schemas.SupplierResponse)
def read_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = crud.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return supplier


@router.put("/{supplier_id}", response_model=schemas.SupplierResponse)
def update_supplier(
    supplier_id: int, payload: schemas.SupplierUpdate, db: Session = Depends(get_db)
):
    supplier = crud.update_supplier(db, supplier_id, payload)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    if not crud.delete_supplier(db, supplier_id):
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado"}
