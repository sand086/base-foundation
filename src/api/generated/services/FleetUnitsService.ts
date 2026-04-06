/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_unit_document_api_fleet_units__unit_term__documents__doc_type__post } from '../models/Body_upload_unit_document_api_fleet_units__unit_term__documents__doc_type__post';
import type { Body_upload_units_bulk_api_fleet_units_bulk_upload_post } from '../models/Body_upload_units_bulk_api_fleet_units_bulk_upload_post';
import type { TireCreate } from '../models/TireCreate';
import type { TireResponse } from '../models/TireResponse';
import type { UnitCreate } from '../models/UnitCreate';
import type { UnitResponse } from '../models/UnitResponse';
import type { UnitUpdate } from '../models/UnitUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FleetUnitsService {
    /**
     * Read Units
     * @param skip
     * @param limit
     * @returns UnitResponse Successful Response
     * @throws ApiError
     */
    public static readUnitsApiFleetUnitsGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<UnitResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/units',
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
     * Create Unit
     * @param requestBody
     * @returns UnitResponse Successful Response
     * @throws ApiError
     */
    public static createUnitApiFleetUnitsPost(
        requestBody: UnitCreate,
    ): CancelablePromise<UnitResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/units',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Units Bulk
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadUnitsBulkApiFleetUnitsBulkUploadPost(
        formData: Body_upload_units_bulk_api_fleet_units_bulk_upload_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/units/bulk-upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Download Upload
     * @param uploadId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadUploadApiFleetUnitsDownloadUploadUploadIdGet(
        uploadId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/units/download-upload/{upload_id}',
            path: {
                'upload_id': uploadId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Unit
     * @param term
     * @returns UnitResponse Successful Response
     * @throws ApiError
     */
    public static readUnitApiFleetUnitsTermGet(
        term: string,
    ): CancelablePromise<UnitResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/units/{term}',
            path: {
                'term': term,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Unit
     * @param unitId
     * @param requestBody
     * @returns UnitResponse Successful Response
     * @throws ApiError
     */
    public static updateUnitApiFleetUnitsUnitIdPut(
        unitId: string,
        requestBody: UnitUpdate,
    ): CancelablePromise<UnitResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/fleet/units/{unit_id}',
            path: {
                'unit_id': unitId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Unit
     * @param unitId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteUnitApiFleetUnitsUnitIdDelete(
        unitId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/fleet/units/{unit_id}',
            path: {
                'unit_id': unitId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Document History
     * @param unitId
     * @param docType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getDocumentHistoryApiFleetUnitsUnitIdDocumentsDocTypeHistoryGet(
        unitId: number,
        docType: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/units/{unit_id}/documents/{doc_type}/history',
            path: {
                'unit_id': unitId,
                'doc_type': docType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Unit Tires
     * @param unitTerm
     * @param requestBody
     * @returns TireResponse Successful Response
     * @throws ApiError
     */
    public static updateUnitTiresApiFleetUnitsUnitTermTiresPut(
        unitTerm: string,
        requestBody: Array<TireCreate>,
    ): CancelablePromise<Array<TireResponse>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/fleet/units/{unit_term}/tires',
            path: {
                'unit_term': unitTerm,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Unit Document
     * @param unitTerm
     * @param docType
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadUnitDocumentApiFleetUnitsUnitTermDocumentsDocTypePost(
        unitTerm: string,
        docType: string,
        formData: Body_upload_unit_document_api_fleet_units__unit_term__documents__doc_type__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/units/{unit_term}/documents/{doc_type}',
            path: {
                'unit_term': unitTerm,
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
     * Update Unit Load Status
     * @param unitId
     * @param loadStatus
     * @returns UnitResponse Successful Response
     * @throws ApiError
     */
    public static updateUnitLoadStatusApiFleetUnitsUnitIdLoadStatusPatch(
        unitId: number,
        loadStatus: boolean,
    ): CancelablePromise<UnitResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/fleet/units/{unit_id}/load-status',
            path: {
                'unit_id': unitId,
            },
            query: {
                'load_status': loadStatus,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
