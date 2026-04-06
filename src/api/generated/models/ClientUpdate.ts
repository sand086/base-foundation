/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientStatus } from './ClientStatus';
import type { SubClientUpdate } from './SubClientUpdate';
export type ClientUpdate = {
    razon_social?: (string | null);
    public_id?: (string | null);
    rfc?: (string | null);
    regimen_fiscal?: (string | null);
    uso_cfdi?: (string | null);
    contacto_principal?: (string | null);
    telefono?: (string | null);
    email?: (string | null);
    direccion_fiscal?: (string | null);
    codigo_postal_fiscal?: (string | null);
    estatus?: (ClientStatus | null);
    dias_credito?: (number | null);
    contrato_url?: (string | null);
    sub_clients?: (Array<SubClientUpdate> | null);
};

