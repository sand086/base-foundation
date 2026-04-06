/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Comentario raro/importante:
 * - En el modelo NO existe campo `password`, existe `password_hash`.
 * Este schema está bien para recibir password "plano" en API,
 * pero asegúrate de hashearlo en tu service y guardarlo en password_hash.
 * - two_factor_secret NO lo pidas aquí (lo genera/activa tu flujo 2FA).
 */
export type UserCreate = {
    email: string;
    password: string;
    nombre: string;
    apellido?: (string | null);
    telefono?: (string | null);
    puesto?: (string | null);
    avatar_url?: (string | null);
    role_id?: (number | null);
    activo?: boolean;
    preferencias?: (Record<string, any> | null);
};

