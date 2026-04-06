/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BatchSettlementPreviewResponse = {
    total_kms: number;
    consumo_esperado: number;
    consumo_real: number;
    diferencia_litros: number;
    precio_promedio: number;
    deduccion_combustible: number;
    alertas: Array<string>;
    legs_sin_ticket?: Array<number>;
};

