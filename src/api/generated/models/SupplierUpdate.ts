/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SupplierStatus } from './SupplierStatus';
import type { SupplierTariffUpdate } from './SupplierTariffUpdate';
export type SupplierUpdate = {
    razon_social?: (string | null);
    rfc?: (string | null);
    email?: (string | null);
    telefono?: (string | null);
    direccion?: (string | null);
    codigo_postal?: (string | null);
    dias_credito?: (number | null);
    limite_credito?: (number | null);
    contacto_principal?: (string | null);
    categoria?: (string | null);
    tipo_proveedor?: (string | null);
    zonas_cobertura?: (string | null);
    banco?: (string | null);
    cuenta_bancaria?: (string | null);
    clabe?: (string | null);
    estatus?: (SupplierStatus | null);
    tariffs?: (Array<SupplierTariffUpdate> | null);
};

