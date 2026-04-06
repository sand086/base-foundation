/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_operator_document_api_fleet_operators__operator_id__documents__doc_type__post } from '../models/Body_upload_operator_document_api_fleet_operators__operator_id__documents__doc_type__post';
import type { OperatorCreate } from '../models/OperatorCreate';
import type { OperatorResponse } from '../models/OperatorResponse';
import type { OperatorUpdate } from '../models/OperatorUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FleetOperatorsService {
    /**
     * Read Operators
     * @param skip
     * @param limit
     * @returns OperatorResponse Successful Response
     * @throws ApiError
     */
    public static readOperatorsApiFleetOperatorsGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<OperatorResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/operators',
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
     * Create Operator
     * @param requestBody
     * @returns OperatorResponse Successful Response
     * @throws ApiError
     */
    public static createOperatorApiFleetOperatorsPost(
        requestBody: OperatorCreate,
    ): CancelablePromise<OperatorResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/operators',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Operator
     * @param operatorId
     * @param requestBody
     * @returns OperatorResponse Successful Response
     * @throws ApiError
     */
    public static updateOperatorApiFleetOperatorsOperatorIdPut(
        operatorId: number,
        requestBody: OperatorUpdate,
    ): CancelablePromise<OperatorResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/fleet/operators/{operator_id}',
            path: {
                'operator_id': operatorId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Operator
     * @param operatorId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteOperatorApiFleetOperatorsOperatorIdDelete(
        operatorId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/fleet/operators/{operator_id}',
            path: {
                'operator_id': operatorId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Operator Document
     * @param operatorId
     * @param docType
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadOperatorDocumentApiFleetOperatorsOperatorIdDocumentsDocTypePost(
        operatorId: number,
        docType: string,
        formData: Body_upload_operator_document_api_fleet_operators__operator_id__documents__doc_type__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/operators/{operator_id}/documents/{doc_type}',
            path: {
                'operator_id': operatorId,
                'doc_type': docType,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Operator Document History
     * @param operatorId
     * @param docType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getOperatorDocumentHistoryApiFleetOperatorsOperatorIdDocumentsDocTypeHistoryGet(
        operatorId: number,
        docType: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/operators/{operator_id}/documents/{doc_type}/history',
            path: {
                'operator_id': operatorId,
                'doc_type': docType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
