/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConceptoPago } from './ConceptoPago';
export type BatchSettlementPayload = {
    leg_ids: Array<number>;
    monto_sueldo?: number;
    monto_bonos?: number;
    monto_maniobras?: number;
    monto_penalizaciones?: number;
    neto_a_pagar: number;
    conceptos_extra?: Array<ConceptoPago>;
};

