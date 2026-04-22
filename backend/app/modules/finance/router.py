import logging
import os
import shutil
import json
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
# PAYABLES (Cuentas por Pagar) & PROVIDERS
# =====================================================================


@router.get("/providers", response_model=List[schemas.ProviderResponse])
def read_providers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_providers(db, skip, limit)


@router.post("/providers", response_model=schemas.ProviderResponse)
def create_provider(provider: schemas.ProviderCreate, db: Session = Depends(get_db)):
    if db.query(models.Supplier).filter(models.Supplier.rfc == provider.rfc).first():
        raise HTTPException(status_code=400, detail="RFC ya registrado")
    return crud.create_provider(db, provider)


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: str, db: Session = Depends(get_db)):
    if not crud.delete_provider(db, provider_id):
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado"}


@router.get("/indirect-categories")
def read_indirect_categories(db: Session = Depends(get_db)):
    """Obtiene las categorías de gastos indirectos (Fijos/Variables)"""
    return crud.get_indirect_categories(db)


# =====================================================================
# TREASURY & BANKS
# =====================================================================


@router.get("/bank-accounts", response_model=List[schemas.BankAccountResponse])
def read_bank_accounts(db: Session = Depends(get_db)):
    return crud.get_bank_accounts(db)


@router.post("/bank-accounts", response_model=schemas.BankAccountResponse)
def create_bank_account(
    account: schemas.BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Crea una nueva cuenta bancaria en Tesorería"""
    return crud.create_bank_account(db, account, current_user.id)


@router.patch("/bank-accounts/{account_id}", response_model=schemas.BankAccountResponse)
def update_bank_account(
    account_id: int,
    account_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Edita la cuenta bancaria. Permite ajuste de saldo si se autorizó en el front."""
    updated_account = crud.update_bank_account(
        db, account_id, account_data, current_user.id
    )
    if not updated_account:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return updated_account


@router.delete("/bank-accounts/{account_id}")
def delete_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Aplica un Soft Delete a la cuenta para proteger la integridad contable."""
    success = crud.delete_bank_account(db, account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return {"message": "Cuenta archivada exitosamente"}


@router.get("/movements", response_model=List[schemas.BankMovementResponse])
def read_movements(db: Session = Depends(get_db)):
    return crud.get_bank_movements(db)


@router.patch(
    "/movements/{movement_id}/conciliation", response_model=schemas.BankMovementResponse
)
def conciliate_movement(movement_id: int, db: Session = Depends(get_db)):
    """Marca un movimiento bancario como conciliado (Verificado contra el banco)."""
    movement = crud.conciliate_bank_movement(db, movement_id)
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    return movement


@router.delete("/movements/{movement_id}")
def delete_bank_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Elimina un movimiento bancario y restaura el saldo de la cuenta."""
    success = crud.delete_bank_movement(db, movement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    return {"message": "Movimiento eliminado y saldo restaurado correctamente"}


@router.post("/movements", response_model=schemas.BankMovementResponse)
def create_manual_movement(
    movement: schemas.BankMovementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Crea un movimiento manual (Ingreso o Egreso) afectando el saldo directamente."""
    try:
        return crud.create_bank_movement(db, movement, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================================
# INVOICES (Carga Masiva CxP y Conciliación SAT)
# =====================================================================


@router.post("/invoices/bulk-upload")
async def bulk_upload_invoices(
    file: UploadFile = File(...),
    json_data: str = Form(...),  # Recibimos los datos parseados como string
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Endpoint robusto para procesar el reporte SAT.
    1. Guarda el archivo original en el servidor para auditoría.
    2. Procesa los registros evitando duplicados por UUID.
    """
    try:
        # A. GUARDAR ARCHIVO ORIGINAL
        upload_dir = "app/storage/bulk_uploads"
        os.makedirs(upload_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = os.path.join(upload_dir, f"{timestamp}_{file.filename}")

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # B. PROCESAR DATOS
        data = json.loads(json_data)
        resultado = crud.process_sat_master_report(
            db=db, payload_data=data, original_file_name=file.filename
        )

        return {**resultado, "file_stored": file_path}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en la carga masiva: {str(e)}"
        )


# =====================================================================
# RECEIVABLES (Cuentas por Cobrar & Puente a Tesorería)
# =====================================================================


@router.get("/receivables")
def get_receivable_invoices(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    invoices = (
        db.query(models.ReceivableInvoice)
        .options(
            joinedload(models.ReceivableInvoice.client),
            joinedload(models.ReceivableInvoice.payments),
            joinedload(models.ReceivableInvoice.trip),
        )
        .filter(
            models.ReceivableInvoice.record_status
            != models.RecordStatus.ELIMINADO.value
        )
        .order_by(models.ReceivableInvoice.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    response = []
    for inv in invoices:
        if inv.monto_total and float(inv.monto_total) == 1.12:
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
            f"CXC-VIAJE-{inv.viaje_id}"
            if inv.viaje_id
            else (f"SAT-{str(inv.uuid)[:8]}" if inv.uuid else f"PROVISIONAL-{inv.id}")
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
                    inv.fecha_vencimiento.isoformat() if inv.fecha_vencimiento else None
                ),
                "estatus": inv.estatus,
                "moneda": inv.moneda or "MXN",
                "referencia": getattr(inv.trip, "referencia", "") if inv.trip else "",
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


@router.delete("/receivables/{invoice_id}")
def delete_receivable_invoice(invoice_id: int, db: Session = Depends(get_db)):
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
            detail="No se puede eliminar una factura con pagos registrados",
        )

    db.delete(invoice)
    db.commit()
    return {"message": "Factura eliminada"}


@router.post("/receivables/{invoice_id}/payments")
def register_receivable_payment(
    invoice_id: int,
    payment: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    CAMBIO CLAVE: Cobra una factura de cliente e ingresa el dinero a Tesorería.
    """
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

    # Requerir cuenta bancaria para que sume a tesorería
    cuenta_id = payment.get("cuenta_deposito") or payment.get("bank_account_id")
    if not cuenta_id:
        raise HTTPException(
            status_code=400, detail="Debes especificar la cuenta bancaria de destino."
        )

    nuevo_pago = models.ReceivableInvoicePayment(
        invoice_id=invoice.id,
        monto=monto_pago,
        metodo_pago=payment.get("metodo_pago", "TRANSFERENCIA"),
        referencia=payment.get("referencia", ""),
        cuenta_deposito=str(cuenta_id),  # Guardamos el ID del banco
        created_by_id=current_user.id,
    )
    db.add(nuevo_pago)

    invoice.saldo_pendiente -= monto_pago
    if invoice.saldo_pendiente <= 0:
        invoice.estatus = models.InvoiceStatus.PAGADO
    else:
        invoice.estatus = models.InvoiceStatus.PAGO_PARCIAL

    # MAGIA TESORERÍA: Crear ingreso al banco
    movimiento_schema = schemas.BankMovementCreate(
        bank_account_id=int(cuenta_id),
        tipo="ingreso",
        monto=monto_pago,
        concepto=f"Cobro Fra. {invoice.folio_interno or invoice.uuid[:8]}",
        referencia=payment.get("referencia", ""),
        origen_modulo="CxC",  # 🚀 FIX FASE 1: Aseguramos el origen para la UI de Tesorería
    )
    crud.create_bank_movement(db, movimiento_schema, current_user.id)

    db.commit()
    db.refresh(invoice)

    return {
        "message": "Pago y movimiento bancario registrados exitosamente",
        "nuevo_saldo_factura": invoice.saldo_pendiente,
        "estatus": invoice.estatus,
    }


@router.post("/payments/upload-xml")
async def upload_payment_xml(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    CAMBIO CLAVE: Si subes el XML del REP, busca/crea una cuenta puente y hace el ingreso en tesorería.
    """
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

        # Buscamos o creamos una cuenta virtual para pagos cargados por XML
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
                    cuenta_deposito=str(banco_xml.id),  # Asignamos la cuenta
                    created_by_id=current_user.id,
                )
                db.add(nuevo_pago)

                factura.saldo_pendiente -= monto_pagado
                if factura.saldo_pendiente <= 0:
                    factura.saldo_pendiente = 0
                    factura.estatus = "pagado"
                else:
                    factura.estatus = "pago_parcial"

                # Generamos el ingreso en la tesorería (Banco Automático XML)
                mov_schema = schemas.BankMovementCreate(
                    bank_account_id=banco_xml.id,
                    tipo="ingreso",
                    monto=monto_pagado,
                    concepto=f"Cobro XML Fra. {factura.folio_interno}",
                    referencia="Carga XML REP",
                    origen_modulo="CxC",  # 🚀 FIX FASE 1: Aseguramos el origen para la UI
                )
                crud.create_bank_movement(db, mov_schema, current_user.id)

                pagos_procesados += 1

        db.commit()
        return {
            "status": "success",
            "message": f"Se procesaron {pagos_procesados} pagos automáticamente y se enviaron a Tesorería.",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al leer XML: {str(e)}")


# =====================================================================
# SCRIPT SALVAVIDAS: ARREGLAR PAGOS HUÉRFANOS DE TESORERÍA
# =====================================================================


@router.post("/fix-orphan-payments")
def fix_orphan_payments(
    cuenta_destino_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Busca los pagos antiguos que decían "cuenta_deposito: '' " (o null)
    y los inserta oficialmente en la cuenta bancaria de Tesorería que le mandes.
    """
    try:
        pagos_huerfanos = (
            db.query(models.ReceivableInvoicePayment)
            .filter(
                (models.ReceivableInvoicePayment.cuenta_deposito == "")
                | (
                    models.ReceivableInvoicePayment.cuenta_deposito.is_(None)
                )  # Mejor práctica SQLAlchemy
            )
            .all()
        )

        if not pagos_huerfanos:
            return {
                "message": "Excelente, no tienes pagos huérfanos. Todo está cuadrado."
            }

        for pago in pagos_huerfanos:
            # Extraemos la fecha del pago original para que el historial sea exacto
            fecha_historica = pago.fecha_pago if pago.fecha_pago else datetime.now()

            # Generar el ingreso a tesorería
            mov_schema = schemas.BankMovementCreate(
                bank_account_id=cuenta_destino_id,
                tipo="ingreso",
                monto=pago.monto,
                fecha=fecha_historica,  # <--- ¡LA SOLUCIÓN! Le pasamos la fecha explícitamente
                concepto=f"Sincronización Fra. ID {pago.invoice_id}",
                # Si referencia es null, forzamos un string
                referencia=(
                    pago.referencia if pago.referencia else "Sincronización Histórica"
                ),
                origen_modulo="CxC",  # 🚀 FIX FASE 1: Aseguramos el origen para la UI
            )

            crud.create_bank_movement(db, mov_schema, current_user.id)

            # Enlazar el pago a la cuenta para que no vuelva a procesarse
            pago.cuenta_deposito = str(cuenta_destino_id)

        db.commit()
        return {
            "message": f"¡Éxito! Se inyectaron {len(pagos_huerfanos)} cobros al banco. Tu Tesorería ahora refleja los ingresos reales."
        }

    except Exception as e:
        # ATRAMPAMOS EL ERROR Y LO DEVOLVEMOS AL NAVEGADOR
        db.rollback()
        import traceback

        error_details = traceback.format_exc()
        print(error_details)  # Esto lo imprimirá en la consola negra de tu servidor
        raise HTTPException(
            status_code=500, detail=f"Cazador de Bugs activado. Error exacto: {str(e)}"
        )


# =====================================================================
# PAGOS A PROVEEDORES Y CAJA CHICA
# =====================================================================


@router.post("/payables/{invoice_id}/payments")
def register_provider_payment(
    invoice_id: int,
    payment: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Aplica un pago a una factura de proveedor (CXP) y descuenta del banco."""
    try:
        invoice = crud.register_payable_payment(
            db, invoice_id, payment, current_user.id
        )
        if not invoice:
            raise HTTPException(
                status_code=404, detail="Factura de proveedor no encontrada"
            )

        return {
            "message": "Pago a proveedor registrado exitosamente. Se descontó del banco.",
            "nuevo_saldo_factura": invoice.saldo_pendiente,
            "estatus": invoice.estatus,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/petty-cash")
def register_petty_cash(
    expense: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Registra un gasto de Caja Chica (Sin XML) afectando directo la Tesorería."""
    try:
        movimiento = crud.register_petty_cash_expense(db, expense, current_user.id)
        return {
            "message": "Gasto de Caja Chica registrado exitosamente.",
            "movimiento_id": movimiento.id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/receivables/{invoice_id}/reopen")
def reopen_receivable_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    BOTÓN DE RESCATE: Restaura una cuenta por cobrar a su estado original (Pendiente).
    Elimina los pagos atascados y resetea el saldo al monto total para reintentar el REP.
    """
    invoice = (
        db.query(models.ReceivableInvoice)
        .filter(models.ReceivableInvoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    # 1. Borrar cualquier intento de pago atascado
    db.query(models.ReceivableInvoicePayment).filter(
        models.ReceivableInvoicePayment.invoice_id == invoice.id
    ).delete()

    # 2. Restaurar saldo y estatus general
    invoice.saldo_pendiente = invoice.monto_total
    invoice.estatus = "pendiente"

    # 3. 🚀 Si el SAT la había marcado como Cancelada/Error, la engañamos regresándola a TIMBRADA
    if invoice.status_sat in ["CANCELADO", "EN_PROCESO_CANCELACION", "ERROR"]:
        invoice.status_sat = "TIMBRADA"

    db.commit()
    db.refresh(invoice)

    return {
        "message": "Factura restaurada con éxito. Ya puedes intentar el REP nuevamente."
    }
