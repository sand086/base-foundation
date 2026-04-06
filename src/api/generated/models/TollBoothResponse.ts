/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentMethod } from './PaymentMethod';
import type { RecordStatus } from './RecordStatus';
export type TollBoothResponse = {
    nombre: string;
    tramo: string;
    carretera?: (string | null);
    estado?: (string | null);
    costo_5_ejes_sencillo?: number;
    costo_5_ejes_full?: number;
    costo_9_ejes_sencillo?: number;
    costo_9_ejes_full?: number;
    forma_pago?: PaymentMethod;
    id: number;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

