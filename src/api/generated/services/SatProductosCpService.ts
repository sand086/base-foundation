/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SatProductCreate } from '../models/SatProductCreate';
import type { SatProductResponse } from '../models/SatProductResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SatProductosCpService {
    /**
     * Get All
     * @param skip
     * @param limit
     * @param search
     * @returns SatProductResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatProductsGet(
        skip?: number,
        limit: number = 50000,
        search?: (string | null),
    ): CancelablePromise<Array<SatProductResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-products',
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
     * @returns SatProductResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatProductsPost(
        requestBody: SatProductCreate,
    ): CancelablePromise<SatProductResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-products',
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
     * @returns SatProductResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatProductsItemIdPut(
        itemId: number,
        requestBody: SatProductCreate,
    ): CancelablePromise<SatProductResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-products/{item_id}',
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
    public static deleteItemApiSatSatProductsItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-products/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
