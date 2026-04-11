/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleAuthSchema } from './RoleAuthSchema';
export type UserAuthSchema = {
    id: number;
    nombre: string;
    email: string;
    role_id?: (number | null);
    avatar_url?: (string | null);
    role?: (RoleAuthSchema | null);
};

