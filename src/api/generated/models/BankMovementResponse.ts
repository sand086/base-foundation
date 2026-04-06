/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BankMovementResponse = {
    id: number;
    tipo: string;
    monto: number;
    moneda: string;
    concepto: string;
    fecha: string;
    banco: (string | null);
    cuenta_bancaria: (string | null);
    referencia_bancaria: (string | null);
    origen_modulo: (string | null);
    conciliado: boolean;
    fecha_conciliacion: (string | null);
};

