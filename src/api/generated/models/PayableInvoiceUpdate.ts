/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Currency } from './Currency';
import type { InvoiceStatus } from './InvoiceStatus';
export type PayableInvoiceUpdate = {
    uuid?: (string | null);
    folio_interno?: (string | null);
    cost_center_id?: (number | null);
    monto_total?: (number | null);
    saldo_pendiente?: (number | null);
    moneda?: (Currency | null);
    fecha_emision?: (string | null);
    fecha_vencimiento?: (string | null);
    concepto?: (string | null);
    clasificacion?: (string | null);
    estatus?: (InvoiceStatus | null);
    pdf_url?: (string | null);
    xml_url?: (string | null);
    orden_compra_id?: (string | null);
};

