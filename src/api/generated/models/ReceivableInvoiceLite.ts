/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentHistoryResponse } from './DocumentHistoryResponse';
export type ReceivableInvoiceLite = {
    id: number;
    viaje_id?: (number | null);
    uuid?: (string | null);
    folio_interno?: (string | null);
    is_nominal?: (boolean | null);
    monto_total?: number;
    saldo_pendiente?: number;
    status_sat?: (string | null);
    estatus?: (string | null);
    fecha_emision?: (string | null);
    pdf_url?: (string | null);
    xml_url?: (string | null);
    motivo_cancelacion?: (string | null);
    acuse_cancelacion_url?: (string | null);
    fecha_cancelacion?: (string | null);
    document_history?: Array<DocumentHistoryResponse>;
};

