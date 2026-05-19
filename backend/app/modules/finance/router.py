import logging
import os
import shutil
import json
import traceback
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

from pydantic import BaseModel
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Body,
    status,
    Form,
)
from sqlalchemy.orm import Session, joinedload
from lxml import etree

from app.db.database import get_db
from app.models import models
from app.modules.auth.router import get_current_active_user

# IMPORTACIONES LOCALES (FSD)
from . import schemas, crud

logger = logging.getLogger(__name__)

# ÚNICA INSTANCIA DEL ROUTER
router = APIRouter(tags=["Finance"])


# Definimos un esquema rápido para recibir el array dinámico
class BulkUploadPayload(BaseModel):
    data: List[dict]


# =====================================================================
# CATEGORIES & COST CENTERS
# =====================================================================


@router.get("/cost-centers", response_model=List[schemas.CostCenterResponse])
def read_cost_centers(db: Session = Depends(get_db)):
    """Obtiene los Centros de Costos activos."""
    try:
        return (
            db.query(models.CostCenter).filter(models.CostCenter.activo == True).all()
        )
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN read_cost_centers 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# TREASURY & BANKS
# =====================================================================


@router.get("/bank-accounts", response_model=List[schemas.BankAccountResponse])
def read_bank_accounts(db: Session = Depends(get_db)):
    try:
        return crud.get_bank_accounts(db)
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN read_bank_accounts 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/bank-accounts", response_model=schemas.BankAccountResponse)
def create_bank_account(
    account: schemas.BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        return crud.create_bank_account(db, account, current_user.id)
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN create_bank_account 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.patch("/bank-accounts/{account_id}", response_model=schemas.BankAccountResponse)
def update_bank_account(
    account_id: int,
    account_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        updated_account = crud.update_bank_account(
            db, account_id, account_data, current_user.id
        )
        if not updated_account:
            raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
        return updated_account
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN update_bank_account 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.delete("/bank-accounts/{account_id}")
def delete_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        success = crud.delete_bank_account(db, account_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
        return {"message": "Cuenta archivada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN delete_bank_account 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.get("/movements", response_model=List[schemas.BankMovementResponse])
def read_movements(db: Session = Depends(get_db)):
    try:
        return crud.get_bank_movements(db)
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN read_movements 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.patch(
    "/movements/{movement_id}/conciliation", response_model=schemas.BankMovementResponse
)
def conciliate_movement(movement_id: int, db: Session = Depends(get_db)):
    try:
        movement = crud.conciliate_bank_movement(db, movement_id)
        if not movement:
            raise HTTPException(status_code=404, detail="Movimiento no encontrado")
        return movement
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN conciliate_movement 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.delete("/movements/{movement_id}")
def delete_bank_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        success = crud.delete_bank_movement(db, movement_id)
        if not success:
            raise HTTPException(status_code=404, detail="Movimiento no encontrado")
        return {"message": "Movimiento eliminado y saldo restaurado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN delete_bank_movement 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/movements", response_model=schemas.BankMovementResponse)
def create_manual_movement(
    movement: schemas.BankMovementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        return crud.create_bank_movement(db, movement, current_user.id)
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN create_manual_movement 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# INVOICES (Carga Masiva CxP y Conciliación SAT)
# =====================================================================


@router.post("/invoices/bulk-upload")
async def bulk_upload_invoices(
    file: UploadFile = File(...),
    json_data: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        upload_dir = "app/storage/bulk_uploads"
        os.makedirs(upload_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = os.path.join(upload_dir, f"{timestamp}_{file.filename}")

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        data = json.loads(json_data)
        resultado = crud.process_sat_master_report(
            db=db, payload_data=data, original_file_name=file.filename
        )
        return {**resultado, "file_stored": file_path}
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN bulk_upload_invoices 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# RECEIVABLES (Cuentas por Cobrar & Puente a Tesorería)
# =====================================================================


@router.get("/receivables")
def get_receivable_invoices(
    skip: int = 0, limit: int = 5000, db: Session = Depends(get_db)
):
    try:
        invoices = (
            db.query(models.ReceivableInvoice)
            .options(
                joinedload(models.ReceivableInvoice.client),
                joinedload(models.ReceivableInvoice.payments),
                joinedload(models.ReceivableInvoice.trip),
            )
            .filter(
                models.ReceivableInvoice.record_status != models.RecordStatus.ELIMINADO
            )
            .order_by(models.ReceivableInvoice.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        response = []
        for inv in invoices:
            if getattr(inv, "is_nominal", False) == True:
                continue

            pagos_list = [
                {
                    "id": p.id,
                    "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None,
                    "monto": p.monto,
                    "metodo_pago": p.metodo_pago,
                    "referencia": p.referencia or "S/R",
                    "cuenta_deposito": p.cuenta_deposito,
                    "complemento_uuid": p.complemento_uuid,
                }
                for p in inv.payments
            ]

            folio_display = inv.folio_interno or (
                f"CXC-TRP-{inv.viaje_id}"
                if inv.viaje_id
                else (
                    f"SAT-{str(inv.uuid)[:8]}" if inv.uuid else f"PROVISIONAL-{inv.id}"
                )
            )

            trip_data = None
            if inv.trip:
                conts = []
                if inv.trip.contenedor_1 and inv.trip.contenedor_1 not in ["N/A", ""]:
                    conts.append(inv.trip.contenedor_1)
                if inv.trip.contenedor_2 and inv.trip.contenedor_2 not in ["N/A", ""]:
                    conts.append(inv.trip.contenedor_2)
                contenedores_str = " / ".join(conts) if conts else "Sin contenedor"

                trip_data = {
                    "origen": inv.trip.origin,
                    "destino": inv.trip.destination,
                    "peso_toneladas": inv.trip.peso_toneladas,
                    "contenedores": contenedores_str,
                    "producto_sat": f"[{inv.trip.sat_clave_producto or '01010101'}] {inv.trip.descripcion_mercancia or 'Carga General'}",
                }

            # Prevenir error 500 al serializar los Enums a JSON puro:
            estatus_val = (
                inv.estatus.value if hasattr(inv.estatus, "value") else str(inv.estatus)
            )
            moneda_val = (
                inv.moneda.value
                if hasattr(inv.moneda, "value")
                else str(inv.moneda or "MXN")
            )

            response.append(
                {
                    "id": inv.id,
                    "uuid": inv.uuid,
                    "uuid_relacionado": inv.uuid_relacionado,
                    "folio_interno": folio_display,
                    "concepto": inv.concepto or "Servicio de Flete",
                    "subtotal": inv.subtotal,
                    "iva": inv.iva,
                    "retenciones": inv.retenciones,
                    "monto_total": inv.monto_total,
                    "saldo_pendiente": inv.saldo_pendiente,
                    "fecha_emision": (
                        inv.fecha_emision.isoformat() if inv.fecha_emision else None
                    ),
                    "fecha_vencimiento": (
                        inv.fecha_vencimiento.isoformat()
                        if inv.fecha_vencimiento
                        else None
                    ),
                    "estatus": estatus_val,
                    "moneda": moneda_val,
                    "referencia": (
                        getattr(inv.trip, "referencia", "") if inv.trip else ""
                    ),
                    "trip_info": trip_data,
                    "pdf_url": inv.pdf_url,
                    "xml_url": inv.xml_url,
                    "payments": pagos_list,
                    "client": (
                        {
                            "id": inv.client.id,
                            "razon_social": inv.client.razon_social,
                            "rfc": inv.client.rfc,
                        }
                        if inv.client
                        else None
                    ),
                }
            )

        return response
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN get_receivable_invoices 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.delete("/receivables/{invoice_id}")
def delete_receivable_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """🚀 FIX: ELIMINACIÓN SEGURA CON CANDADO DE AUDITORÍA"""
    try:
        invoice = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == invoice_id)
            .first()
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        if invoice.saldo_pendiente < invoice.monto_total:
            raise HTTPException(
                status_code=400,
                detail="Bloqueo de Tesorería: No se puede eliminar una factura que ya tiene cobros registrados. Anula los cobros primero.",
            )

        invoice.record_status = models.RecordStatus.ELIMINADO
        invoice.estatus = models.InvoiceStatus.CANCELADO
        db.commit()
        return {"message": "Factura eliminada definitivamente (Soft Delete)"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN delete_receivable_invoice 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.patch("/receivables/{invoice_id}/cancel")
def cancel_receivable_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """🚀 NUEVO ENDPOINT: CANCELACIÓN LÓGICA"""
    try:
        invoice = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == invoice_id)
            .first()
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        if invoice.saldo_pendiente < invoice.monto_total:
            raise HTTPException(
                status_code=400,
                detail="Bloqueo de Tesorería: No se puede cancelar una factura que ya tiene cobros. Anula los cobros primero.",
            )

        invoice.estatus = models.InvoiceStatus.CANCELADO
        db.commit()
        return {"message": "Factura cancelada lógicamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN cancel_receivable_invoice 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/receivables/{invoice_id}/payments")
def register_receivable_payment(
    invoice_id: int,
    payment: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        invoice = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == invoice_id)
            .first()
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        monto_pago = float(payment.get("monto", 0))
        if monto_pago <= 0:
            raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
        if monto_pago > invoice.saldo_pendiente:
            raise HTTPException(
                status_code=400, detail="El monto supera el saldo pendiente"
            )

        cuenta_id = payment.get("cuenta_deposito") or payment.get("bank_account_id")
        if not cuenta_id:
            raise HTTPException(
                status_code=400,
                detail="Debes especificar la cuenta bancaria de destino.",
            )

        nuevo_pago = models.ReceivableInvoicePayment(
            invoice_id=invoice.id,
            monto=monto_pago,
            metodo_pago=payment.get("metodo_pago", "TRANSFERENCIA"),
            referencia=payment.get("referencia", ""),
            cuenta_deposito=str(cuenta_id),
            created_by_id=current_user.id,
        )
        db.add(nuevo_pago)

        invoice.saldo_pendiente -= monto_pago
        if invoice.saldo_pendiente <= 0:
            invoice.estatus = models.InvoiceStatus.PAGADO
        else:
            invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

        movimiento_schema = schemas.BankMovementCreate(
            bank_account_id=int(cuenta_id),
            tipo="ingreso",
            monto=monto_pago,
            concepto=f"Cobro Fra. {invoice.folio_interno or invoice.uuid[:8]}",
            referencia=payment.get("referencia", ""),
            origen_modulo="CxC",
        )
        crud.create_bank_movement(db, movimiento_schema, current_user.id)

        db.commit()
        db.refresh(invoice)

        return {
            "message": "Pago y movimiento bancario registrados exitosamente",
            "nuevo_saldo_factura": invoice.saldo_pendiente,
            "estatus": (
                invoice.estatus.value
                if hasattr(invoice.estatus, "value")
                else str(invoice.estatus)
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN register_receivable_payment 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/receivables")
def create_manual_receivable(
    invoice_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        nueva_factura = crud.create_manual_receivable(db, invoice_data, current_user.id)
        return nueva_factura
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN create_manual_receivable 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/payments/upload-xml")
async def upload_payment_xml(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        content = await file.read()
        root = etree.fromstring(content)

        ns = {"pago20": "http://www.sat.gob.mx/Pagos20"}
        pagos = root.xpath("//pago20:Pago", namespaces=ns)
        if not pagos:
            raise HTTPException(
                status_code=400, detail="El XML no contiene complementos de pago."
            )

        pago = pagos[0]
        fecha_pago_str = pago.get("FechaPago")
        forma_pago = pago.get("FormaDePagoP", "03")

        doctos = root.xpath("//pago20:DoctoRelacionado", namespaces=ns)

        banco_xml = (
            db.query(models.BankAccount)
            .filter(models.BankAccount.alias == "Banco Automático XML")
            .first()
        )
        if not banco_xml:
            banco_xml = models.BankAccount(
                banco="Cobro Automático",
                numero_cuenta="00000000",
                alias="Banco Automático XML",
                tipo_cuenta="cobranza",
                saldo=0.0,
                created_by_id=current_user.id,
                estatus="activo",
            )
            db.add(banco_xml)
            db.flush()

        pagos_procesados = 0
        for doc in doctos:
            uuid_factura = doc.get("IdDocumento").upper()
            monto_pagado = float(doc.get("ImpPagado", "0.00"))

            factura = (
                db.query(models.ReceivableInvoice)
                .filter(models.ReceivableInvoice.uuid == uuid_factura)
                .first()
            )

            if factura and factura.saldo_pendiente > 0:
                nuevo_pago = models.ReceivableInvoicePayment(
                    invoice_id=factura.id,
                    fecha_pago=fecha_pago_str[:10],
                    monto=monto_pagado,
                    metodo_pago=forma_pago,
                    referencia="Carga XML REP",
                    cuenta_deposito=str(banco_xml.id),
                    created_by_id=current_user.id,
                )
                db.add(nuevo_pago)

                factura.saldo_pendiente -= monto_pagado
                if factura.saldo_pendiente <= 0:
                    factura.saldo_pendiente = 0
                    factura.estatus = models.InvoiceStatus.PAGADO
                else:
                    factura.estatus = models.InvoiceStatus.PAGO_PARCIAL

                mov_schema = schemas.BankMovementCreate(
                    bank_account_id=banco_xml.id,
                    tipo="ingreso",
                    monto=monto_pagado,
                    concepto=f"Cobro XML Fra. {factura.folio_interno}",
                    referencia="Carga XML REP",
                    origen_modulo="CxC",
                )
                crud.create_bank_movement(db, mov_schema, current_user.id)

                pagos_procesados += 1

        db.commit()
        return {
            "status": "success",
            "message": f"Se procesaron {pagos_procesados} pagos automáticamente y se enviaron a Tesorería.",
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN upload_payment_xml 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# SCRIPT SALVAVIDAS: ARREGLAR PAGOS HUÉRFANOS DE TESORERÍA
# =====================================================================


@router.post("/fix-orphan-payments")
def fix_orphan_payments(
    cuenta_destino_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        pagos_huerfanos = (
            db.query(models.ReceivableInvoicePayment)
            .filter(
                (models.ReceivableInvoicePayment.cuenta_deposito == "")
                | (models.ReceivableInvoicePayment.cuenta_deposito.is_(None))
            )
            .all()
        )

        if not pagos_huerfanos:
            return {
                "message": "Excelente, no tienes pagos huérfanos. Todo está cuadrado."
            }

        for pago in pagos_huerfanos:
            fecha_historica = pago.fecha_pago if pago.fecha_pago else datetime.now()

            mov_schema = schemas.BankMovementCreate(
                bank_account_id=cuenta_destino_id,
                tipo="ingreso",
                monto=pago.monto,
                fecha=fecha_historica,
                concepto=f"Sincronización Fra. ID {pago.invoice_id}",
                referencia=(
                    pago.referencia if pago.referencia else "Sincronización Histórica"
                ),
                origen_modulo="CxC",
            )

            crud.create_bank_movement(db, mov_schema, current_user.id)

            pago.cuenta_deposito = str(cuenta_destino_id)

        db.commit()
        return {
            "message": f"¡Éxito! Se inyectaron {len(pagos_huerfanos)} cobros al banco. Tu Tesorería ahora refleja los ingresos reales."
        }

    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN fix_orphan_payments 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# PAGOS A PROVEEDORES Y CAJA CHICA
# =====================================================================


@router.post("/petty-cash")
def register_petty_cash(
    expense: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        movimiento = crud.register_petty_cash_expense(db, expense, current_user.id)
        return {
            "message": "Gasto de Caja Chica registrado exitosamente.",
            "movimiento_id": movimiento.id,
        }
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN register_petty_cash 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/receivables/{invoice_id}/reopen")
def reopen_receivable_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """🚀 FIX CRÍTICO TESORERÍA: Revertir cobros antes de reabrir factura"""
    try:
        invoice = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == invoice_id)
            .first()
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        if invoice.status_sat == "CANCELADO":
            raise HTTPException(
                status_code=400,
                detail="Operación denegada: Esta factura está oficialmente CANCELADA ante el SAT. No puedes reabrirla para cobro, debes emitir una nueva.",
            )

        # 1. Buscamos todos los pagos hechos a esta factura
        pagos = (
            db.query(models.ReceivableInvoicePayment)
            .filter(models.ReceivableInvoicePayment.invoice_id == invoice.id)
            .all()
        )

        for pago in pagos:
            # 2. Revertimos el dinero del banco
            if pago.cuenta_deposito:
                cuenta = (
                    db.query(models.BankAccount)
                    .filter(models.BankAccount.id == int(pago.cuenta_deposito))
                    .with_for_update(of=models.BankAccount)
                    .first()
                )
                if cuenta:
                    cuenta.saldo -= pago.monto

                    # Dejamos huella de auditoría en la cuenta
                    reverso = models.BankMovement(
                        bank_account_id=cuenta.id,
                        tipo="egreso",
                        monto=pago.monto,
                        concepto=f"Reverso de Cobro Anulado - Fra {invoice.folio_interno or invoice.id}",
                        referencia=f"CANC-COBRO-{pago.id}",
                        origen_modulo="CxC",
                        created_by_id=current_user.id,
                        fecha=datetime.now(),
                    )
                    db.add(reverso)

            # 3. Borramos el recibo de pago
            db.delete(pago)

        # 4. Restauramos el saldo de la factura
        invoice.saldo_pendiente = invoice.monto_total
        invoice.estatus = models.InvoiceStatus.PENDIENTE

        if invoice.status_sat == "ERROR":
            invoice.status_sat = "PROVISIONAL"

        db.commit()
        db.refresh(invoice)

        return {
            "message": "Factura reabierta financieramente. El cobro fue anulado y el dinero se descontó del banco exitosamente."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN reopen_receivable_invoice 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# OPERATOR SETTLEMENTS (Liquidaciones Operativas)
# =====================================================================


@router.post("/settlements/operator")
def process_settlement_for_operator(
    payload: schemas.OperatorSettlementPayload = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        resultado = crud.process_operator_settlement(db, payload, current_user.id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN process_settlement_for_operator 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =========================================================
# RUTAS DE CATEGORÍAS INDIRECTAS
# =========================================================


@router.get(
    "/indirect-categories", response_model=List[schemas.IndirectCategoryResponse]
)
def read_indirect_categories(db: Session = Depends(get_db)):
    try:
        return crud.get_indirect_categories(db)
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN read_indirect_categories 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.post("/indirect-categories", response_model=schemas.IndirectCategoryResponse)
def create_indirect_category(
    payload: schemas.IndirectCategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        return crud.create_indirect_category(db, payload, current_user.id)
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN create_indirect_category 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.put(
    "/indirect-categories/{cat_id}", response_model=schemas.IndirectCategoryResponse
)
def update_indirect_category(
    cat_id: int,
    payload: schemas.IndirectCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        cat = crud.update_indirect_category(db, cat_id, payload, current_user.id)
        if not cat:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return cat
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN update_indirect_category 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.delete("/indirect-categories/{cat_id}")
def delete_indirect_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        success = crud.delete_indirect_category(db, cat_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return {"message": "Categoría eliminada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN delete_indirect_category 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )
