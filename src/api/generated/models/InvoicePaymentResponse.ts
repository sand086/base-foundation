/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
export type InvoicePaymentResponse = {
    id: number;
    invoice_id: number;
    fecha_pago: string;
    monto: number;
    metodo_pago?: (string | null);
    referencia?: (string | null);
    cuenta_retiro?: (string | null);
    complemento_uuid?: (string | null);
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

