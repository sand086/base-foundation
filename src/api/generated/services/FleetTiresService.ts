/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignTirePayload } from '../models/AssignTirePayload';
import type { MaintenanceTirePayload } from '../models/MaintenanceTirePayload';
import type { TireCreate } from '../models/TireCreate';
import type { TireResponse } from '../models/TireResponse';
import type { TireUpdate } from '../models/TireUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FleetTiresService {
    /**
     * Read Tires
     * @param skip
     * @param limit
     * @returns TireResponse Successful Response
     * @throws ApiError
     */
    public static readTiresApiFleetTiresGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<TireResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/tires',
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
     * Create Tire
     * @param requestBody
     * @returns TireResponse Successful Response
     * @throws ApiError
     */
    public static createTireApiFleetTiresPost(
        requestBody: TireCreate,
    ): CancelablePromise<TireResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/tires',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Tire
     * @param tireId
     * @returns TireResponse Successful Response
     * @throws ApiError
     */
    public static readTireApiFleetTiresTireIdGet(
        tireId: number,
    ): CancelablePromise<TireResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/fleet/tires/{tire_id}',
            path: {
                'tire_id': tireId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Tire
     * @param tireId
     * @param requestBody
     * @returns TireResponse Successful Response
     * @throws ApiError
     */
    public static updateTireApiFleetTiresTireIdPut(
        tireId: number,
        requestBody: TireUpdate,
    ): CancelablePromise<TireResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/fleet/tires/{tire_id}',
            path: {
                'tire_id': tireId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Tire
     * @param tireId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTireApiFleetTiresTireIdDelete(
        tireId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/fleet/tires/{tire_id}',
            path: {
                'tire_id': tireId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Assign Tire
     * @param tireId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static assignTireApiFleetTiresTireIdAssignPost(
        tireId: number,
        requestBody: AssignTirePayload,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/tires/{tire_id}/assign',
            path: {
                'tire_id': tireId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Maintenance Tire
     * @param tireId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static maintenanceTireApiFleetTiresTireIdMaintenancePost(
        tireId: number,
        requestBody: MaintenanceTirePayload,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/fleet/tires/{tire_id}/maintenance',
            path: {
                'tire_id': tireId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
