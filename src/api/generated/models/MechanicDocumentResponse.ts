/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
export type MechanicDocumentResponse = {
    tipo_documento: string;
    nombre_archivo: string;
    url_archivo: string;
    fecha_vencimiento?: (string | null);
    file_size?: (number | null);
    subido_en?: (string | null);
    id: number;
    mechanic_id: number;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

