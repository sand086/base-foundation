/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Currency } from './Currency';
import type { InvoicePaymentResponse } from './InvoicePaymentResponse';
import type { InvoiceStatus } from './InvoiceStatus';
import type { RecordStatus } from './RecordStatus';
export type PayableInvoiceResponse = {
    id: number;
    supplier_id: number;
    uuid: string;
    folio_interno?: (string | null);
    supplier_razon_social?: (string | null);
    monto_total: number;
    saldo_pendiente: number;
    moneda: Currency;
    fecha_emision: string;
    fecha_vencimiento: string;
    concepto?: (string | null);
    clasificacion?: (string | null);
    estatus: InvoiceStatus;
    pdf_url?: (string | null);
    xml_url?: (string | null);
    orden_compra_id?: (string | null);
    payments?: Array<InvoicePaymentResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

