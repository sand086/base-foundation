/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MechanicDocumentResponse } from './MechanicDocumentResponse';
import type { RecordStatus } from './RecordStatus';
export type MechanicResponse = {
    nombre: string;
    apellido?: (string | null);
    especialidad?: (string | null);
    telefono?: (string | null);
    email?: (string | null);
    direccion?: (string | null);
    fecha_nacimiento?: (string | null);
    fecha_contratacion?: (string | null);
    nss?: (string | null);
    rfc?: (string | null);
    salario_base?: number;
    contacto_emergencia_nombre?: (string | null);
    contacto_emergencia_telefono?: (string | null);
    activo?: boolean;
    foto_url?: (string | null);
    id: number;
    documents?: Array<MechanicDocumentResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

