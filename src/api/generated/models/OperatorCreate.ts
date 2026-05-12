/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OperatorStatus } from './OperatorStatus';
export type OperatorCreate = {
    public_id?: (string | null);
    name: string;
    license_number: string;
    license_type_id?: (number | null);
    license_expiry: string;
    medical_check_expiry: string;
    phone?: (string | null);
    status?: OperatorStatus;
    assigned_unit_id?: (number | null);
    hire_date?: (string | null);
    rfc?: (string | null);
    emergency_contact?: (string | null);
    emergency_phone?: (string | null);
    foto_url?: (string | null);
    licencia_url?: (string | null);
    ine_url?: (string | null);
    apto_medico_url?: (string | null);
    comprobante_domicilio_url?: (string | null);
};

