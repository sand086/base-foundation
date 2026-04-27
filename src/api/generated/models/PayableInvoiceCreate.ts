/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Currency } from './Currency';
import type { InvoicePaymentCreate } from './InvoicePaymentCreate';
export type PayableInvoiceCreate = {
    supplier_id?: (number | null);
    cost_center_id?: (number | null);
    uuid?: (string | null);
    folio_interno?: (string | null);
    monto_total: number;
    moneda?: Currency;
    fecha_emision: string;
    fecha_vencimiento: string;
    concepto?: (string | null);
    clasificacion?: (string | null);
    pdf_url?: (string | null);
    xml_url?: (string | null);
    orden_compra_id?: (string | null);
    payments?: Array<InvoicePaymentCreate>;
};

