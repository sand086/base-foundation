/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TireCondition } from './TireCondition';
import type { TireStatus } from './TireStatus';
export type TireCreate = {
    codigo_interno: string;
    marca: string;
    modelo?: (string | null);
    medida?: (string | null);
    dot?: (string | null);
    unit_id?: (number | null);
    posicion?: (string | null);
    estado?: TireStatus;
    estado_fisico?: TireCondition;
    profundidad_actual?: number;
    profundidad_original?: number;
    km_recorridos?: number;
    fecha_compra?: (string | null);
    precio_compra?: number;
    costo_acumulado?: number;
    proveedor?: (string | null);
};

