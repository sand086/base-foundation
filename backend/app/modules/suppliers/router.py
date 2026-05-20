# src/app/modules/finance/suppliers/router.py (o la ruta de tu módulo)
import logging
import traceback
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models
from app.modules.auth.router import get_current_active_user
from . import schemas, crud

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Suppliers"])

# =========================================================
# 1. RUTAS ESTÁTICAS / ESPECÍFICAS (CXP - Facturas)
# =========================================================


@router.get("/invoices", response_model=List[schemas.PayableInvoiceResponse])
def read_invoices(skip: int = 0, limit: int = 5000, db: Session = Depends(get_db)):
    """
    Obtiene el listado de Cuentas por Pagar (Facturas de Proveedores).
    """
    return crud.get_invoices(db, skip, limit)


@router.post("/invoices", response_model=schemas.PayableInvoiceResponse)
def create_invoice(
    payload: schemas.PayableInvoiceCreate, db: Session = Depends(get_db)
):
    """
    Crea una nueva factura de proveedor.
    Heredará automáticamente el CECO del proveedor si existe.
    """
    return crud.create_invoice(db, payload)


# =========================================================
# 2. RUTAS DE GENERALES DE PROVEEDORES (SUPPLIERS)
# =========================================================


@router.get("", response_model=List[schemas.SupplierResponse])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Catálogo de proveedores activos.
    """
    try:
        return crud.get_suppliers(db, skip, limit)
    except Exception as e:
        # Esto captura todo el rastro del error
        error_trace = traceback.format_exc()

        # OJO: Solo usamos esto temporalmente para depurar
        raise HTTPException(
            status_code=500, detail=f"ERROR EXACTO: {str(e)} | DETALLE: {error_trace}"
        )


@router.post("", response_model=schemas.SupplierResponse)
def create_supplier(payload: schemas.SupplierCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo proveedor en el sistema.
    """
    # Verificación de duplicados por RFC
    if db.query(models.Supplier).filter(models.Supplier.rfc == payload.rfc).first():
        raise HTTPException(
            status_code=400, detail="El RFC ya está registrado en el catálogo."
        )
    return crud.create_supplier(db, payload)


# =========================================================
# 3. RUTAS CON PARÁMETROS DINÁMICOS {id}
# =========================================================

# --- Operaciones con Facturas Individuales ---


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
    try:
        invoice = crud.update_invoice(db, invoice_id, payload)
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return invoice
    except ValueError as ve:
        #  FIX: Atrapamos el error de validación de auditoría (Ej. Al cancelar con pagos)
        raise HTTPException(status_code=400, detail=str(ve))


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    try:
        if not crud.delete_invoice(db, invoice_id):
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return {"message": "Factura eliminada correctamente (Soft Delete)"}
    except ValueError as ve:
        #  FIX: Atrapamos el error de validación de auditoría (Ej. Al eliminar con pagos)
        raise HTTPException(status_code=400, detail=str(ve))


@router.post(
    "/invoices/{invoice_id}/payments", response_model=schemas.PayableInvoiceResponse
)
def register_payment(
    invoice_id: int,
    payment: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Registra un pago a una factura y genera el movimiento de egreso en Tesorería.
    """
    try:
        print(
            f"💰 [CXP] Registrando pago para factura {invoice_id}. Usuario: {current_user.email}"
        )

        invoice = crud.register_payment(db, invoice_id, payment)

        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return invoice

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print("💥 [ROUTER ERROR 500 CXP] Fallo crítico al registrar el pago:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error interno del servidor: {str(e)}"
        )


@router.delete("/invoices/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Cancela un pago, restaura el saldo de la factura y devuelve el dinero a Tesorería.
    """
    try:
        success = crud.delete_payment(db, payment_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=404, detail="El pago no existe o ya ha sido eliminado"
            )
        return {
            "message": "Pago cancelado exitosamente. Se ha restaurado el saldo y ajustado Tesorería."
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error al intentar eliminar el pago: {str(e)}"
        )


# --- Operaciones con Proveedores Individuales ---


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
    """
    Aplica borrado lógico al proveedor para no romper historial de facturas.
    """
    if not crud.delete_supplier(db, supplier_id):
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado del catálogo"}
