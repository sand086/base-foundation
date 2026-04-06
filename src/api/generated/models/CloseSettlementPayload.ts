/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConceptoPago } from './ConceptoPago';
export type CloseSettlementPayload = {
    conceptos: Array<ConceptoPago>;
    total_ingresos: number;
    total_deducciones: number;
    neto_a_pagar: number;
    odometro_final?: (number | null);
};

