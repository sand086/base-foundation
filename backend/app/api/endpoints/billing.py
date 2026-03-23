from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.trips import ReceivableInvoiceCreate
from app.services.billing_service import BillingService

from fastapi.responses import FileResponse

router = APIRouter()


@router.post("/stamp/nominal", response_model=dict)
def generar_carta_porte_nominal(
    invoice_data: ReceivableInvoiceCreate, db: Session = Depends(get_db)
):
    """
    Endpoint Fase 1 (Bypass Aduanal):
    Genera y timbra la Carta Porte 3.1 por un valor de $1.00 MXN.
    """
    service = BillingService(db)
    try:
        factura = service.generar_carta_porte_nominal(invoice_data)
        return {
            "status": "success",
            "message": "Carta Porte de Bypass generada exitosamente",
            "data": {
                "factura_id": factura.id,
                "uuid": factura.uuid,
                "xml_url": factura.xml_url,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stamp/final", response_model=dict)
def generar_factura_final(
    invoice_data: ReceivableInvoiceCreate, db: Session = Depends(get_db)
):
    """
    Endpoint Fase 3 (Cierre Administrativo):
    1. Genera la factura real con los costos completos.
    2. Aplica la Relación 04 al UUID de la Carta Porte nominal.
    3. Manda a cancelar la Carta Porte nominal de $1.
    """
    service = BillingService(db)
    try:
        # 1. Generar la Final (Inyecta Relación 04)
        factura_final = service.generar_factura_final_relacionada(invoice_data)

        # 2. Cancelar la previa (Bypass) con Motivo 01 (Opcional: puedes hacerlo asíncrono)
        if invoice_data.uuid_relacionado:
            # Buscamos el ID de la factura vieja por su UUID para cancelarla
            from app.models.models import ReceivableInvoice

            factura_vieja = (
                db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.uuid == invoice_data.uuid_relacionado)
                .first()
            )
            if factura_vieja:
                service.cancelar_factura_nominal(
                    invoice_id=factura_vieja.id,
                    motivo="01",
                    uuid_sustituto=factura_final.uuid,
                )

        return {
            "status": "success",
            "message": "Factura Real generada y Carta Porte previa cancelada",
            "data": {
                "factura_id": factura_final.id,
                "uuid": factura_final.uuid,
                "xml_url": factura_final.xml_url,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoice/{uuid}/pdf")
def download_invoice_pdf(uuid: str, db: Session = Depends(get_db)):
    """
    Busca el archivo PDF generado en el disco y lo descarga.
    """
    service = BillingService(db)
    pdf_path = service.storage_dir / f"{uuid}.pdf"

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail="El PDF timbrado aún no existe o no se pudo generar.",
        )

    return FileResponse(
        path=pdf_path, filename=f"Carta_Porte_{uuid}.pdf", media_type="application/pdf"
    )
