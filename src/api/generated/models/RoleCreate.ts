/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Nota: AuditMixin lo llena BD (record_status, created_at, updated_at, etc.)
 */
export type RoleCreate = {
    name_key: string;
    nombre: string;
    descripcion?: (string | null);
    permisos?: Record<string, any>;
};

