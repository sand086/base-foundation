/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SatLocationCreate } from '../models/SatLocationCreate';
import type { SatLocationResponse } from '../models/SatLocationResponse';
import type { SatNeighborhoodCreate } from '../models/SatNeighborhoodCreate';
import type { SatNeighborhoodResponse } from '../models/SatNeighborhoodResponse';
import type { SatPostalCodeCreate } from '../models/SatPostalCodeCreate';
import type { SatPostalCodeResponse } from '../models/SatPostalCodeResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SatUbicacionesService {
    /**
     * Get All
     * @param skip
     * @param limit
     * @param search
     * @returns SatLocationResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatMunicipalitiesGet(
        skip?: number,
        limit: number = 500,
        search?: (string | null),
    ): CancelablePromise<Array<SatLocationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-municipalities',
            query: {
                'skip': skip,
                'limit': limit,
                'search': search,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatLocationResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatMunicipalitiesPost(
        requestBody: SatLocationCreate,
    ): CancelablePromise<SatLocationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-municipalities',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Item
     * @param itemId
     * @param requestBody
     * @returns SatLocationResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatMunicipalitiesItemIdPut(
        itemId: number,
        requestBody: SatLocationCreate,
    ): CancelablePromise<SatLocationResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-municipalities/{item_id}',
            path: {
                'item_id': itemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Item
     * @param itemId
     * @returns void
     * @throws ApiError
     */
    public static deleteItemApiSatSatMunicipalitiesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-municipalities/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All
     * @param skip
     * @param limit
     * @param search
     * @returns SatLocationResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatLocalitiesGet(
        skip?: number,
        limit: number = 500,
        search?: (string | null),
    ): CancelablePromise<Array<SatLocationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-localities',
            query: {
                'skip': skip,
                'limit': limit,
                'search': search,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatLocationResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatLocalitiesPost(
        requestBody: SatLocationCreate,
    ): CancelablePromise<SatLocationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-localities',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Item
     * @param itemId
     * @param requestBody
     * @returns SatLocationResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatLocalitiesItemIdPut(
        itemId: number,
        requestBody: SatLocationCreate,
    ): CancelablePromise<SatLocationResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-localities/{item_id}',
            path: {
                'item_id': itemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Item
     * @param itemId
     * @returns void
     * @throws ApiError
     */
    public static deleteItemApiSatSatLocalitiesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-localities/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All
     * @param skip
     * @param limit
     * @param search
     * @returns SatNeighborhoodResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatNeighborhoodsGet(
        skip?: number,
        limit: number = 500,
        search?: (string | null),
    ): CancelablePromise<Array<SatNeighborhoodResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-neighborhoods',
            query: {
                'skip': skip,
                'limit': limit,
                'search': search,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatNeighborhoodResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatNeighborhoodsPost(
        requestBody: SatNeighborhoodCreate,
    ): CancelablePromise<SatNeighborhoodResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-neighborhoods',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Item
     * @param itemId
     * @param requestBody
     * @returns SatNeighborhoodResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatNeighborhoodsItemIdPut(
        itemId: number,
        requestBody: SatNeighborhoodCreate,
    ): CancelablePromise<SatNeighborhoodResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-neighborhoods/{item_id}',
            path: {
                'item_id': itemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Item
     * @param itemId
     * @returns void
     * @throws ApiError
     */
    public static deleteItemApiSatSatNeighborhoodsItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-neighborhoods/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Location Codes
     * @returns SatPostalCodeResponse Successful Response
     * @throws ApiError
     */
    public static getLocationCodesApiSatSatLocationCodesGet(): CancelablePromise<Array<SatPostalCodeResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-location-codes',
        });
    }
    /**
     * Create Location Code
     * @param requestBody
     * @returns SatPostalCodeResponse Successful Response
     * @throws ApiError
     */
    public static createLocationCodeApiSatSatLocationCodesPost(
        requestBody: SatPostalCodeCreate,
    ): CancelablePromise<SatPostalCodeResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-location-codes',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Location Code
     * @param itemId
     * @param requestBody
     * @returns SatPostalCodeResponse Successful Response
     * @throws ApiError
     */
    public static updateLocationCodeApiSatSatLocationCodesItemIdPut(
        itemId: number,
        requestBody: SatPostalCodeCreate,
    ): CancelablePromise<SatPostalCodeResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-location-codes/{item_id}',
            path: {
                'item_id': itemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Location Code
     * @param itemId
     * @returns void
     * @throws ApiError
     */
    public static deleteLocationCodeApiSatSatLocationCodesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-location-codes/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
