/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TireCondition } from './TireCondition';
import type { TireStatus } from './TireStatus';
export type TireUpdate = {
    codigo_interno?: (string | null);
    marca?: (string | null);
    modelo?: (string | null);
    medida?: (string | null);
    dot?: (string | null);
    unit_id?: (number | null);
    posicion?: (string | null);
    estado?: (TireStatus | null);
    estado_fisico?: (TireCondition | null);
    profundidad_actual?: (number | null);
    profundidad_original?: (number | null);
    km_recorridos?: (number | null);
    fecha_compra?: (string | null);
    precio_compra?: (number | null);
    costo_acumulado?: (number | null);
    proveedor?: (string | null);
};

