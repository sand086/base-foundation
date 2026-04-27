/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__modules__finance__schemas__SettlementConceptCreate } from './app__modules__finance__schemas__SettlementConceptCreate';
export type OperatorSettlementPayload = {
    /**
     * UUID generado en el Frontend para agrupar el lote
     */
    batch_id: string;
    operator_id: number;
    /**
     * Lista de IDs de TripLegs seleccionados para este operador
     */
    legs: Array<number>;
    manual_concepts?: Array<app__modules__finance__schemas__SettlementConceptCreate>;
};

