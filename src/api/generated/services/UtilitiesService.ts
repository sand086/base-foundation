/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_generic_receipt_api_utils_upload_receipt__entity_type___entity_id__post } from '../models/Body_upload_generic_receipt_api_utils_upload_receipt__entity_type___entity_id__post';
import type { ValidationResponse } from '../models/ValidationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UtilitiesService {
    /**
     * Validate Dynamic Field
     * @param table Nombre de la tabla permitida
     * @param field Nombre de la columna
     * @param value Valor a validar
     * @param excludeId ID a ignorar (útil al editar)
     * @returns ValidationResponse Successful Response
     * @throws ApiError
     */
    public static validateDynamicFieldApiUtilsValidateFieldGet(
        table: string,
        field: string,
        value: string,
        excludeId?: (number | null),
    ): CancelablePromise<ValidationResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/utils/validate-field',
            query: {
                'table': table,
                'field': field,
                'value': value,
                'exclude_id': excludeId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Generic Receipt
     * @param entityType
     * @param entityId
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadGenericReceiptApiUtilsUploadReceiptEntityTypeEntityIdPost(
        entityType: string,
        entityId: number,
        formData: Body_upload_generic_receipt_api_utils_upload_receipt__entity_type___entity_id__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/utils/upload-receipt/{entity_type}/{entity_id}',
            path: {
                'entity_type': entityType,
                'entity_id': entityId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Receipt History
     * Simula el formato de historial para que el Frontend Component funcione nativo
     * @param entityType
     * @param entityId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getReceiptHistoryApiUtilsReceiptEntityTypeEntityIdHistoryGet(
        entityType: string,
        entityId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/utils/receipt/{entity_type}/{entity_id}/history',
            path: {
                'entity_type': entityType,
                'entity_id': entityId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Generic Receipt
     * @param entityType
     * @param entityId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteGenericReceiptApiUtilsReceiptEntityTypeEntityIdDelete(
        entityType: string,
        entityId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/utils/receipt/{entity_type}/{entity_id}',
            path: {
                'entity_type': entityType,
                'entity_id': entityId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
