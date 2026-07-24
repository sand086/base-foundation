/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BankMovementCreate = {
    bank_account_id: number;
    /**
     * Debe ser 'ingreso' o 'egreso'
     */
    tipo: string;
    /**
     * El monto debe ser mayor o igual a 0
     */
    monto: number;
    concepto: string;
    referencia?: (string | null);
    origen_modulo?: (string | null);
};

