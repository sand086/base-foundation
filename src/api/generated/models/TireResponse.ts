/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
import type { TireCondition } from './TireCondition';
import type { TireHistoryResponse } from './TireHistoryResponse';
import type { TireStatus } from './TireStatus';
export type TireResponse = {
    codigo_interno: string;
    marca: string;
    modelo?: (string | null);
    medida?: (string | null);
    dot?: (string | null);
    unit_id?: (number | null);
    posicion?: (number | null);
    estado?: (TireStatus | null);
    estado_fisico?: (TireCondition | null);
    profundidad_actual?: (number | null);
    profundidad_original?: (number | null);
    km_recorridos?: (number | null);
    fecha_compra?: (string | null);
    precio_compra?: (number | null);
    costo_acumulado?: (number | null);
    proveedor?: (string | null);
    id: number;
    history?: Array<TireHistoryResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
    unidad_actual_economico?: (string | null);
    unidad_actual_id?: (number | null);
};

