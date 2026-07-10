from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.models import ReceivableInvoice, ReceivableInvoicePayment, SatRetryQueue


def register_sat_retry(
    db: Session,
    *,
    invoice: ReceivableInvoice,
    operation_type: str,
    source_service: str,
    error: Exception | str,
    payload: dict[str, Any] | None = None,
    http_status: int | None = None,
    retry_delay_minutes: int = 5,
) -> SatRetryQueue:
    error_text = str(error)
    target_status = (
        "CONCILIACION_REQUERIDA"
        if operation_type in {"timbrado", "timbrado_pago"}
        else "PENDIENTE"
    )
    idempotency_key = (
        f"{operation_type}:invoice:{invoice.id}:"
        f"folio:{invoice.folio_interno or 'sin-folio'}:"
        f"uuid:{invoice.uuid or 'sin-uuid'}"
    )

    retry = (
        db.query(SatRetryQueue)
        .filter(SatRetryQueue.idempotency_key == idempotency_key)
        .first()
    )

    if not retry:
        retry = SatRetryQueue(
            invoice_id=invoice.id,
            viaje_id=invoice.viaje_id,
            operation_type=operation_type,
            document_type="cfdi",
            source_service=source_service,
            status=target_status,
            idempotency_key=idempotency_key,
            folio_interno=invoice.folio_interno,
            uuid=invoice.uuid,
            request_payload=payload or {},
        )
        db.add(retry)

    retry.status = target_status
    retry.source_service = source_service
    retry.folio_interno = invoice.folio_interno
    retry.uuid = invoice.uuid
    retry.request_payload = payload or retry.request_payload or {}
    retry.last_error = error_text[:4000]
    retry.last_http_status = http_status
    retry.attempts = (retry.attempts or 0) + 1
    retry.last_attempt_at = datetime.utcnow()
    retry.next_attempt_at = (
        None
        if target_status == "CONCILIACION_REQUERIDA"
        else datetime.utcnow() + timedelta(minutes=retry_delay_minutes)
    )
    retry.locked_at = None
    retry.resolved_at = None

    return retry


def register_sat_payment_retry(
    db: Session,
    *,
    payment: ReceivableInvoicePayment,
    operation_type: str,
    source_service: str,
    error: Exception | str,
    payload: dict[str, Any] | None = None,
    http_status: int | None = None,
    retry_delay_minutes: int = 5,
) -> SatRetryQueue:
    error_text = str(error)
    target_status = (
        "CONCILIACION_REQUERIDA"
        if operation_type in {"timbrado", "timbrado_pago"}
        else "PENDIENTE"
    )
    invoice = payment.invoice
    idempotency_key = (
        f"{operation_type}:payment:{payment.id}:"
        f"invoice:{payment.invoice_id}:"
        f"uuid:{payment.complemento_uuid or 'sin-uuid'}"
    )

    retry = (
        db.query(SatRetryQueue)
        .filter(SatRetryQueue.idempotency_key == idempotency_key)
        .first()
    )

    if not retry:
        retry = SatRetryQueue(
            invoice_id=payment.invoice_id,
            payment_id=payment.id,
            viaje_id=getattr(invoice, "viaje_id", None),
            operation_type=operation_type,
            document_type="rep",
            source_service=source_service,
            status=target_status,
            idempotency_key=idempotency_key,
            folio_interno=payment.folio_complemento
            or getattr(invoice, "folio_interno", None),
            uuid=payment.complemento_uuid,
            request_payload=payload or {},
        )
        db.add(retry)

    retry.status = target_status
    retry.source_service = source_service
    retry.payment_id = payment.id
    retry.invoice_id = payment.invoice_id
    retry.viaje_id = getattr(invoice, "viaje_id", None)
    retry.document_type = "rep"
    retry.folio_interno = payment.folio_complemento or getattr(
        invoice, "folio_interno", None
    )
    retry.uuid = payment.complemento_uuid
    retry.request_payload = payload or retry.request_payload or {}
    retry.last_error = error_text[:4000]
    retry.last_http_status = http_status
    retry.attempts = (retry.attempts or 0) + 1
    retry.last_attempt_at = datetime.utcnow()
    retry.next_attempt_at = (
        None
        if target_status == "CONCILIACION_REQUERIDA"
        else datetime.utcnow() + timedelta(minutes=retry_delay_minutes)
    )
    retry.locked_at = None
    retry.resolved_at = None

    return retry
