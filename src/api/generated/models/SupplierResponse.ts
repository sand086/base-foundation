/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PayableInvoiceResponse } from './PayableInvoiceResponse';
import type { RecordStatus } from './RecordStatus';
import type { SupplierStatus } from './SupplierStatus';
import type { SupplierTariffResponse } from './SupplierTariffResponse';
export type SupplierResponse = {
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
    cost_center_id?: (number | null);
    id: number;
    invoices?: Array<PayableInvoiceResponse>;
    tariffs?: Array<SupplierTariffResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

