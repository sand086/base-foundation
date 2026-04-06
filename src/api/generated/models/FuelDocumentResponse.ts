/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
export type FuelDocumentResponse = {
    document_type?: string;
    filename: string;
    file_url: string;
    file_size?: (number | null);
    mime_type?: (string | null);
    version?: number;
    is_active?: boolean;
    id: number;
    fuel_log_id: number;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

