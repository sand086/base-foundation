/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientStatus } from './ClientStatus';
import type { RateTemplateResponse } from './RateTemplateResponse';
import type { SubClientResponse } from './SubClientResponse';
export type ClientResponse = {
    razon_social: string;
    public_id?: (string | null);
    rfc: string;
    regimen_fiscal?: (string | null);
    uso_cfdi?: (string | null);
    contacto_principal?: (string | null);
    telefono?: (string | null);
    email?: (string | null);
    direccion_fiscal?: (string | null);
    codigo_postal_fiscal?: (string | null);
    estatus?: ClientStatus;
    dias_credito?: (number | null);
    contrato_url?: (string | null);
    forma_pago?: (string | null);
    metodo_pago?: (string | null);
    moneda?: (string | null);
    id: number;
    created_at?: (string | null);
    updated_at?: (string | null);
    sub_clients?: Array<SubClientResponse>;
    tarifas_autorizadas?: Array<RateTemplateResponse>;
};

