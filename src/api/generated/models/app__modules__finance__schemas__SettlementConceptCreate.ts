/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type app__modules__finance__schemas__SettlementConceptCreate = {
    /**
     * Ej: Bono por viaje excelente
     */
    descripcion: string;
    /**
     * 'ingreso' o 'deduccion'
     */
    tipo: string;
    amount: number;
    concept_id?: (number | null);
    is_automatic?: boolean;
};

