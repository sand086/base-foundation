/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
}
