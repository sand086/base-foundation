/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SupplierStatus } from './SupplierStatus';
import type { SupplierTariffCreate } from './SupplierTariffCreate';
export type SupplierCreate = {
    razon_social: string;
    rfc: string;
    email?: (string | null);
    telefono?: (string | null);
    direccion?: (string | null);
    codigo_postal?: (string | null);
    dias_credito?: number;
    limite_credito?: number;
    contacto_principal?: (string | null);
    categoria?: (string | null);
    tipo_proveedor?: (string | null);
    zonas_cobertura?: (string | null);
    banco?: (string | null);
    cuenta_bancaria?: (string | null);
    clabe?: (string | null);
    estatus?: SupplierStatus;
    tariffs?: Array<SupplierTariffCreate>;
};

