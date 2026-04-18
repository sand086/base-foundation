/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_user_avatar_api_auth__user_id__avatar_post } from '../models/Body_upload_user_avatar_api_auth__user_id__avatar_post';
import type { EmergencyRequest } from '../models/EmergencyRequest';
import type { LoginRequest } from '../models/LoginRequest';
import type { LoginResponse } from '../models/LoginResponse';
import type { PasswordReset } from '../models/PasswordReset';
import type { RefreshRequest } from '../models/RefreshRequest';
import type { RoleCreate } from '../models/RoleCreate';
import type { RoleResponse } from '../models/RoleResponse';
import type { RoleUpdate } from '../models/RoleUpdate';
import type { TwoFactorEnableRequest } from '../models/TwoFactorEnableRequest';
import type { TwoFactorSetupResponse } from '../models/TwoFactorSetupResponse';
import type { TwoFactorVerifyRequest } from '../models/TwoFactorVerifyRequest';
import type { UserCreate } from '../models/UserCreate';
import type { UserResponse } from '../models/UserResponse';
import type { UserUpdate } from '../models/UserUpdate';
import type { VerifyPasswordRequest } from '../models/VerifyPasswordRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Login
     * @param requestBody
     * @returns LoginResponse Successful Response
     * @throws ApiError
     */
    public static loginApiAuthLoginPost(
        requestBody: LoginRequest,
    ): CancelablePromise<LoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Refresh Token
     * Usa el Refresh Token (7 días) para obtener un nuevo Access Token (12 horas).
     * @param requestBody
     * @returns LoginResponse Successful Response
     * @throws ApiError
     */
    public static refreshTokenApiAuthRefreshPost(
        requestBody: RefreshRequest,
    ): CancelablePromise<LoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Verify 2Fa
     * @param requestBody
     * @returns LoginResponse Successful Response
     * @throws ApiError
     */
    public static verify2FaApiAuthVerify2FaPost(
        requestBody: TwoFactorVerifyRequest,
    ): CancelablePromise<LoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/verify-2fa',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Logout
     * Invalida el Refresh Token del usuario en la base de datos.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static logoutApiAuthLogoutPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/logout',
        });
    }
    /**
     * Setup 2Fa
     * @returns TwoFactorSetupResponse Successful Response
     * @throws ApiError
     */
    public static setup2FaApiAuth2FaSetupGet(): CancelablePromise<TwoFactorSetupResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/2fa/setup',
        });
    }
    /**
     * Enable 2Fa
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static enable2FaApiAuth2FaEnablePost(
        requestBody: TwoFactorEnableRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/2fa/enable',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Roles
     * Lista todos los roles disponibles
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static readRolesApiAuthRolesGet(): CancelablePromise<Array<RoleResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/roles',
        });
    }
    /**
     * Create Role
     * @param requestBody
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static createRoleApiAuthRolesPost(
        requestBody: RoleCreate,
    ): CancelablePromise<RoleResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/roles',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Role
     * @param roleId
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static readRoleApiAuthRolesRoleIdGet(
        roleId: number,
    ): CancelablePromise<RoleResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/roles/{role_id}',
            path: {
                'role_id': roleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Role
     * @param roleId
     * @param requestBody
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static updateRoleApiAuthRolesRoleIdPut(
        roleId: number,
        requestBody: RoleUpdate,
    ): CancelablePromise<RoleResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/auth/roles/{role_id}',
            path: {
                'role_id': roleId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Role
     * @param roleId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteRoleApiAuthRolesRoleIdDelete(
        roleId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/auth/roles/{role_id}',
            path: {
                'role_id': roleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Role Permissions
     * @param roleId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readRolePermissionsApiAuthRolesRoleIdPermisosGet(
        roleId: number,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/roles/{role_id}/permisos',
            path: {
                'role_id': roleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Audit Logs
     * @param skip
     * @param limit
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAuditLogsApiAuthAuditLogsGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/audit-logs',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User Me
     * Devuelve la información del usuario logueado
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static readUserMeApiAuthMeGet(): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/me',
        });
    }
    /**
     * Read Users
     * @param skip
     * @param limit
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static readUsersApiAuthGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<UserResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create User
     * @param requestBody
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static createUserApiAuthPost(
        requestBody: UserCreate,
    ): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User
     * @param userId
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static readUserApiAuthUserIdGet(
        userId: number,
    ): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update User
     * @param userId
     * @param requestBody
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static updateUserApiAuthUserIdPut(
        userId: number,
        requestBody: UserUpdate,
    ): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/auth/{user_id}',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete User
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteUserApiAuthUserIdDelete(
        userId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/auth/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Toggle Status
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static toggleStatusApiAuthUserIdStatusPatch(
        userId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/auth/{user_id}/status',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reset Password
     * @param userId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static resetPasswordApiAuthUserIdResetPasswordPost(
        userId: number,
        requestBody: PasswordReset,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/{user_id}/reset-password',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload User Avatar
     * @param userId
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadUserAvatarApiAuthUserIdAvatarPost(
        userId: number,
        formData: Body_upload_user_avatar_api_auth__user_id__avatar_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/{user_id}/avatar',
            path: {
                'user_id': userId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Emergency Code
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static requestEmergencyCodeApiAuthRequestEmergencyCodePost(
        requestBody: EmergencyRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/request-emergency-code',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Verify User Password
     * Verifica la contraseña del usuario en sesión para operaciones críticas.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static verifyUserPasswordApiAuthVerifyPasswordPost(
        requestBody: VerifyPasswordRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/verify-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
