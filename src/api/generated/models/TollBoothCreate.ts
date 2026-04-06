/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentMethod } from './PaymentMethod';
export type TollBoothCreate = {
    nombre: string;
    tramo: string;
    carretera?: (string | null);
    estado?: (string | null);
    costo_5_ejes_sencillo?: number;
    costo_5_ejes_full?: number;
    costo_9_ejes_sencillo?: number;
    costo_9_ejes_full?: number;
    forma_pago?: PaymentMethod;
};

