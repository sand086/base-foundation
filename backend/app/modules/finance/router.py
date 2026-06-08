import logging
import os
import shutil
import json
import traceback
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from io import BytesIO

import pandas as pd
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
    Query,
)
from fastapi.responses import StreamingResponse
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
                models.ReceivableInvoice.record_status != models.RecordStatus.ELIMINADO,
                models.ReceivableInvoice.is_nominal == False,
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
def delete_receivable_invoice(
    invoice_id: int, cascade: bool = False, db: Session = Depends(get_db)
):
    """FIX: ELIMINACIÓN TOTAL EN CASCADA (VIAJE, DIÉSEL, LIQUIDACIÓN, TRAZABILIDAD)"""
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
                detail="Bloqueo de Tesorería: No se puede eliminar ni cancelar una factura que ya tiene cobros registrados. Anula los cobros primero.",
            )

        # 1. ACCIÓN PRINCIPAL: Cancelar Factura
        invoice.estatus = models.InvoiceStatus.CANCELADO
        invoice.record_status = models.RecordStatus.ELIMINADO

        # RESPALDO DEL VIAJE Y LIBERACIÓN
        trip_id_respaldo = invoice.viaje_id
        invoice.viaje_id = None  # Liberamos el viaje para poder refacturarlo

        # Si NO es cascada, terminamos aquí.
        if not cascade:
            db.commit()
            return {
                "message": "Factura eliminada. El viaje ha sido liberado para volver a liquidarse."
            }

        # 2. 🔴 DESTRUCCIÓN EN CASCADA ABSOLUTA (Si cascade == True)
        if trip_id_respaldo:
            trip = (
                db.query(models.Trip).filter(models.Trip.id == trip_id_respaldo).first()
            )
            if trip:
                # A. Eliminar el Viaje principal
                trip.record_status = models.RecordStatus.ELIMINADO
                trip.status = models.TripStatus.CERRADO

                # B. Recorrer tramos (legs) del viaje
                legs = (
                    db.query(models.TripLeg)
                    .filter(models.TripLeg.trip_id == trip.id)
                    .all()
                )
                for leg in legs:
                    leg.record_status = models.RecordStatus.ELIMINADO

                    # --- Liberar Unidad (Si estaba en ruta) ---
                    if leg.unit_id:
                        unit = (
                            db.query(models.Unit)
                            .filter(models.Unit.id == leg.unit_id)
                            .first()
                        )
                        if unit and unit.status == models.UnitStatus.EN_RUTA:
                            unit.status = models.UnitStatus.DISPONIBLE

                    # --- Liberar Operador (Si estaba en ruta) ---
                    if leg.operator_id:
                        operator = (
                            db.query(models.Operator)
                            .filter(models.Operator.id == leg.operator_id)
                            .first()
                        )
                        if (
                            operator
                            and operator.status == models.OperatorStatus.EN_RUTA
                        ):
                            operator.status = models.OperatorStatus.ACTIVO

                    # --- 💥 TRAZABILIDAD (TIMELINE) ---
                    # Apagamos los eventos de rastreo para que no queden flotando
                    timeline_events = (
                        db.query(models.TripTimelineEvent)
                        .filter(models.TripTimelineEvent.trip_leg_id == leg.id)
                        .all()
                    )
                    for event in timeline_events:
                        event.record_status = models.RecordStatus.ELIMINADO

                    # --- 💥 VALES DE DIÉSEL Y CONCILIACIÓN ---
                    fuel_logs = (
                        db.query(models.FuelLog)
                        .filter(models.FuelLog.trip_leg_id == leg.id)
                        .all()
                    )
                    for fuel in fuel_logs:
                        # Borrado lógico: desaparece del módulo
                        fuel.record_status = models.RecordStatus.ELIMINADO
                        fuel.trip_leg_id = None
                        # Limpiamos todo rastro de la conciliación
                        fuel.is_conciliated = False
                        fuel.km_sm = None
                        fuel.litros_sm = None
                        fuel.rendimiento_sm = None
                        fuel.diferencia_litros = None
                        fuel.rendimiento_real = None

                    # --- 💥 LIQUIDACIÓN DEL OPERADOR Y SUS DESGLOSES ---
                    settlements = (
                        db.query(models.OperatorSettlement)
                        .filter(models.OperatorSettlement.trip_leg_id == leg.id)
                        .all()
                    )
                    for st in settlements:
                        st.record_status = models.RecordStatus.ELIMINADO

                        # También apagamos los conceptos internos (sueldo base, maniobras, etc)
                        concepts = (
                            db.query(models.OperatorSettlementConcept)
                            .filter(
                                models.OperatorSettlementConcept.operator_settlement_id
                                == st.id
                            )
                            .all()
                        )
                        for concept in concepts:
                            concept.record_status = models.RecordStatus.ELIMINADO

        db.commit()
        return {
            "message": "Factura, viaje, diésel, liquidación y trazabilidad eliminados. Todo ha vuelto a su estado original."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback

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
    """FIX CRÍTICO TESORERÍA: Revertir cobros antes de reabrir factura"""
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


# =====================================================================
# BÓVEDA DIGITAL (HISTORIAL CFDI)
# =====================================================================


@router.get("/cfdi-vault", response_model=schemas.CFDIHistoryResponse)
def get_cfdi_vault(
    tipo_documento: str,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Obtiene los registros de la bóveda (Facturas, Complementos, etc)
    tipo_documento: 'FACTURA_CLIENTE', 'FACTURA_PROVEEDOR', 'PAGO_CLIENTE'
    """
    try:
        records = crud.get_cfdi_vault_records(db, tipo_documento, start_date, end_date)
        return {"data": records, "total_records": len(records)}
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN get_cfdi_vault 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


@router.get(
    "/cfdi-vault/{tipo_documento}/{document_id}/timeline",
    response_model=List[schemas.CFDIActivityTimeline],
)
def get_cfdi_document_timeline(
    tipo_documento: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Obtiene la línea de tiempo de auditoría (quién canceló, quién emitió) de un CFDI específico.
    """
    try:
        timeline = crud.get_cfdi_timeline(db, tipo_documento, document_id)
        return timeline
    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN get_cfdi_document_timeline 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )


# =====================================================================
# REPORTES Y ESTADOS DE CUENTA (ANTIGÜEDAD DE SALDOS)
# =====================================================================


@router.get("/export/aging")
def export_aging_report(
    module_type: str = Query(..., description="cxc o cxp"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Exporta un reporte de Antigüedad de Saldos en Excel con 2 pestañas:
    1. Consolidado por Cliente/Proveedor
    2. Detalle de Facturas
    """
    # Importamos and_ y or_ localmente para la lógica de folios (F y CP)
    from sqlalchemy import and_, or_

    try:
        today = date.today()

        # 1. Armar la consulta base (Solo deuda real > 0)
        if module_type == "cxc":
            query = db.query(models.ReceivableInvoice).filter(
                models.ReceivableInvoice.saldo_pendiente > 0,
                models.ReceivableInvoice.record_status == "A",
                # FILTRO 1: Ignorar Canceladas y las que marcaron ERROR en el SAT
                models.ReceivableInvoice.status_sat.notin_(["CANCELADO", "ERROR"]),
                # FILTRO 2: No nominales (excluye las que se timbran por 1 peso)
                models.ReceivableInvoice.is_nominal == False,
                # FILTRO 3: Lógica de negocio para Folios F y CP
                or_(
                    # Si es libre y empieza con F, es válida
                    models.ReceivableInvoice.folio_interno.ilike("F%"),
                    # Si es Carta Porte (empieza con CP), OBLIGATORIAMENTE debe estar atada a un viaje
                    and_(
                        models.ReceivableInvoice.folio_interno.ilike("CP%"),
                        models.ReceivableInvoice.viaje_id.isnot(None),
                    ),
                    # (Fallback de seguridad): Facturas provisionales sin folio asignado aún
                    models.ReceivableInvoice.folio_interno.is_(None),
                    models.ReceivableInvoice.folio_interno == "",
                ),
            )
            if start_date:
                query = query.filter(
                    models.ReceivableInvoice.fecha_emision >= start_date
                )
            if end_date:
                query = query.filter(models.ReceivableInvoice.fecha_emision <= end_date)

        elif module_type == "cxp":
            query = db.query(models.PayableInvoice).filter(
                models.PayableInvoice.saldo_pendiente > 0,
                models.PayableInvoice.record_status == "A",
                # Filtro equivalente en Cuentas por Pagar (CXP)
                models.PayableInvoice.estatus.notin_(["cancelado", "error"]),
            )
            if start_date:
                query = query.filter(models.PayableInvoice.fecha_emision >= start_date)
            if end_date:
                query = query.filter(models.PayableInvoice.fecha_emision <= end_date)
        else:
            raise HTTPException(
                status_code=400, detail="Tipo de módulo inválido. Usa 'cxc' o 'cxp'"
            )

        invoices = query.all()

        details_data = []
        summary_data = {}

        # 2. Procesar datos y calcular rangos de antigüedad
        for inv in invoices:
            if module_type == "cxc":
                entidad_nombre = (
                    inv.client.razon_social if inv.client else "Cliente Desconocido"
                )
                estatus_str = inv.status_sat
            else:
                entidad_nombre = (
                    inv.supplier.razon_social
                    if inv.supplier
                    else getattr(inv, "supplier_razon_social", "Proveedor Desconocido")
                )
                estatus_str = getattr(inv, "estatus", "pendiente")

            days_late = 0
            if inv.fecha_vencimiento:
                if isinstance(inv.fecha_vencimiento, str):
                    # Manejo defensivo en caso de que fecha_vencimiento sea string
                    try:
                        v_date = datetime.strptime(
                            inv.fecha_vencimiento[:10], "%Y-%m-%d"
                        ).date()
                        days_late = (today - v_date).days
                    except:
                        days_late = 0
                else:
                    days_late = (today - inv.fecha_vencimiento).days

            monto_total = float(inv.monto_total or 0.0)
            saldo_pendiente = float(inv.saldo_pendiente or 0.0)

            # Formateo defensivo de fechas
            fecha_emi_str = ""
            if inv.fecha_emision:
                fecha_emi_str = (
                    inv.fecha_emision
                    if isinstance(inv.fecha_emision, str)
                    else inv.fecha_emision.strftime("%Y-%m-%d")
                )

            fecha_ven_str = ""
            if inv.fecha_vencimiento:
                fecha_ven_str = (
                    inv.fecha_vencimiento
                    if isinstance(inv.fecha_vencimiento, str)
                    else inv.fecha_vencimiento.strftime("%Y-%m-%d")
                )

            # Guardar para la Pestaña 2 (Detalle Completo)
            details_data.append(
                {
                    "Folio": getattr(inv, "folio_interno", "")
                    or getattr(inv, "uuid", "")
                    or str(inv.id),
                    "Entidad": entidad_nombre,
                    "Concepto": inv.concepto or "S/D",
                    "Fecha Emisión": fecha_emi_str,
                    "Fecha Vencimiento": fecha_ven_str,
                    "Estatus": estatus_str,
                    "Monto Original (MXN)": monto_total,
                    "Saldo Pendiente (MXN)": saldo_pendiente,
                    "Días de Atraso": days_late if days_late > 0 else 0,
                }
            )

            # Acumular para la Pestaña 1 (Tabla Consolidada)
            if entidad_nombre not in summary_data:
                summary_data[entidad_nombre] = {
                    "Entidad": entidad_nombre,
                    "Deuda Total": 0.0,
                    "Al Corriente": 0.0,
                    "1 a 30 días": 0.0,
                    "31 a 60 días": 0.0,
                    "61 a 90 días": 0.0,
                    "Más de 90 días": 0.0,
                }

            summary_data[entidad_nombre]["Deuda Total"] += saldo_pendiente

            if days_late <= 0:
                summary_data[entidad_nombre]["Al Corriente"] += saldo_pendiente
            elif 1 <= days_late <= 30:
                summary_data[entidad_nombre]["1 a 30 días"] += saldo_pendiente
            elif 31 <= days_late <= 60:
                summary_data[entidad_nombre]["31 a 60 días"] += saldo_pendiente
            elif 61 <= days_late <= 90:
                summary_data[entidad_nombre]["61 a 90 días"] += saldo_pendiente
            else:
                summary_data[entidad_nombre]["Más de 90 días"] += saldo_pendiente

        # 3. Construir los DataFrames y formatear el Excel
        df_summary = pd.DataFrame(list(summary_data.values()))
        df_details = pd.DataFrame(details_data)

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            if not df_summary.empty:
                df_summary.to_excel(
                    writer, sheet_name="Consolidado por Entidad", index=False
                )
            else:
                pd.DataFrame([{"Mensaje": "No hay deuda en este periodo"}]).to_excel(
                    writer, sheet_name="Consolidado por Entidad", index=False
                )

            if not df_details.empty:
                df_details.to_excel(
                    writer, sheet_name="Detalle de Facturas", index=False
                )
            else:
                pd.DataFrame([{"Mensaje": "No hay deuda en este periodo"}]).to_excel(
                    writer, sheet_name="Detalle de Facturas", index=False
                )

            # Ajuste automático del ancho de las columnas
            for sheet_name in writer.sheets:
                worksheet = writer.sheets[sheet_name]
                for column_cells in worksheet.columns:
                    max_length = 0
                    column = column_cells[0].column_letter
                    for cell in column_cells:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = max_length + 2
                    worksheet.column_dimensions[column].width = adjusted_width

        output.seek(0)

        # 4. Enviar el archivo
        filename = f"Antiguedad_Saldos_{module_type.upper()}_{today}.xlsx"
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        return StreamingResponse(
            output,
            headers=headers,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    except Exception as e:
        db.rollback()
        import traceback

        error_details = traceback.format_exc()
        print(
            "\n"
            + "=" * 50
            + "\n💥 ERROR CRÍTICO EN export_aging_report 💥\n"
            + error_details
            + "\n"
            + "=" * 50
            + "\n"
        )
        raise HTTPException(
            status_code=500, detail=f"Cazador de bugs activado. Error real: {str(e)}"
        )
