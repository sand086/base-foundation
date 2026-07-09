/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ReceivableInvoiceCreate = {
    viaje_id: number;
    is_nominal?: boolean;
    folio_forzado?: (number | null);
    use_dummy?: (boolean | null);
    ocultar_montos?: (boolean | null);
    tipo_relacion?: (string | null);
    uuid_relacionado?: (string | null);
    metodo_pago?: string;
    forma_pago?: string;
    uso_cfdi?: string;
    motivo_cancelacion?: (string | null);
    acuse_cancelacion_url?: (string | null);
    fecha_cancelacion?: (string | null);
};

