/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserAuthSchema } from './UserAuthSchema';
export type LoginResponse = {
    access_token?: (string | null);
    refresh_token?: (string | null);
    token_type?: string;
    user?: (UserAuthSchema | null);
    require_2fa?: boolean;
    must_setup_2fa?: boolean;
    temp_token?: (string | null);
};

