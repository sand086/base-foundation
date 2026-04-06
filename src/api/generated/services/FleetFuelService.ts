/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_create_fuel_log_api_fleet_fuel_logs_post } from '../models/Body_create_fuel_log_api_fleet_fuel_logs_post';
import type { Body_upload_fuel_document_api_fleet_fuel_logs__log_id__documents__doc_type__post } from '../models/Body_upload_fuel_document_api_fleet_fuel_logs__log_id__documents__doc_type__post';
import type { FuelLogCreate } from '../models/FuelLogCreate';
import type { FuelLogResponse } from '../models/FuelLogResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FleetFuelService {
    /**
     * Get Fuel Logs
     * @param unitId
     * @returns FuelLogResponse Successful Response
     * @throws ApiError
     */
    public static getFuelLogsApiFleetFuelLogsGet(
        unitId?: (number | null),
    ): CancelablePromise<Array<FuelLogResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/fuel-logs',
            query: {
                'unit_id': unitId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Fuel Log
     * @param formData
     * @returns FuelLogResponse Successful Response
     * @throws ApiError
     */
    public static createFuelLogApiFleetFuelLogsPost(
        formData: Body_create_fuel_log_api_fleet_fuel_logs_post,
    ): CancelablePromise<Array<FuelLogResponse>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/fuel-logs',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Fuel Log
     * @param logId
     * @param requestBody
     * @returns FuelLogResponse Successful Response
     * @throws ApiError
     */
    public static updateFuelLogApiFleetFuelLogsLogIdPut(
        logId: number,
        requestBody: FuelLogCreate,
    ): CancelablePromise<FuelLogResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/fleet/fuel-logs/{log_id}',
            path: {
                'log_id': logId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Fuel Log
     * @param logId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteFuelLogApiFleetFuelLogsLogIdDelete(
        logId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/fleet/fuel-logs/{log_id}',
            path: {
                'log_id': logId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Fuel History
     * @param logId
     * @param docType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getFuelHistoryApiFleetFuelLogsLogIdDocumentsDocTypeHistoryGet(
        logId: number,
        docType: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/fuel-logs/{log_id}/documents/{doc_type}/history',
            path: {
                'log_id': logId,
                'doc_type': docType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Fuel Document
     * @param logId
     * @param docType
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadFuelDocumentApiFleetFuelLogsLogIdDocumentsDocTypePost(
        logId: number,
        docType: string,
        formData: Body_upload_fuel_document_api_fleet_fuel_logs__log_id__documents__doc_type__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/fuel-logs/{log_id}/documents/{doc_type}',
            path: {
                'log_id': logId,
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
     * Delete Fuel Document
     * @param logId
     * @param docType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteFuelDocumentApiFleetFuelLogsLogIdDocumentsDocTypeDelete(
        logId: number,
        docType: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/fleet/fuel-logs/{log_id}/documents/{doc_type}',
            path: {
                'log_id': logId,
                'doc_type': docType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
