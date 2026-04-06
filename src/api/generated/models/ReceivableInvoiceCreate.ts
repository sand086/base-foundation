/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Schema para solicitar la creación de una Factura / Carta Porte
 */
export type ReceivableInvoiceCreate = {
    viaje_id: number;
    /**
     * Si es True, genera factura por $1 Peso para Bypass Aduanal
     */
    is_nominal?: boolean;
    /**
     * Ej: 04 - Sustitución de CFDI previos
     */
    tipo_relacion?: (string | null);
    /**
     * UUID de la factura nominal a cancelar
     */
    uuid_relacionado?: (string | null);
    metodo_pago?: string;
    forma_pago?: string;
    uso_cfdi?: string;
    motivo_cancelacion?: (string | null);
    acuse_cancelacion_url?: (string | null);
    fecha_cancelacion?: (string | null);
};

