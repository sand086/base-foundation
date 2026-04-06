/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
import type { RoleResponse } from './RoleResponse';
export type UserResponse = {
    email: string;
    nombre: string;
    apellido?: (string | null);
    telefono?: (string | null);
    puesto?: (string | null);
    avatar_url?: (string | null);
    role_id?: (number | null);
    activo?: boolean;
    preferencias?: Record<string, any>;
    is_2fa_enabled?: boolean;
    last_login?: (string | null);
    id: number;
    role?: (RoleResponse | null);
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

