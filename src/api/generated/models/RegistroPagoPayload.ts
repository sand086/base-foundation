/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PagoDetalle } from './PagoDetalle';
export type RegistroPagoPayload = {
    client_id: number;
    pagos: Array<PagoDetalle>;
    forma_pago: string;
    fecha_pago: string;
    referencia?: (string | null);
    cuenta_deposito?: (string | null);
};

