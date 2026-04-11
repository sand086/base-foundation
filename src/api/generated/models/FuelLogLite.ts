/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FuelLogLite = {
    id: number;
    fecha_hora: string;
    estacion: string;
    tipo_combustible: string;
    litros: number;
    precio_por_litro: number;
    total: number;
    odometro: number;
    is_conciliated?: boolean;
    diferencia_litros?: (number | null);
    rendimiento_real?: (number | null);
    evidencia_url?: (string | null);
    record_status: string;
};

