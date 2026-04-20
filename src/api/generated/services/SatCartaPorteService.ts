/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SatGenericCreate } from '../models/SatGenericCreate';
import type { SatGenericResponse } from '../models/SatGenericResponse';
import type { SatHazardousMaterialCreate } from '../models/SatHazardousMaterialCreate';
import type { SatHazardousMaterialResponse } from '../models/SatHazardousMaterialResponse';
import type { SatPermitTypeCreate } from '../models/SatPermitTypeCreate';
import type { SatPermitTypeResponse } from '../models/SatPermitTypeResponse';
import type { SatStationCreate } from '../models/SatStationCreate';
import type { SatStationResponse } from '../models/SatStationResponse';
import type { SatTruckConfigCreate } from '../models/SatTruckConfigCreate';
import type { SatTruckConfigResponse } from '../models/SatTruckConfigResponse';
import type { SatUnitWeightCreate } from '../models/SatUnitWeightCreate';
import type { SatUnitWeightResponse } from '../models/SatUnitWeightResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SatCartaPorteService {
    /**
     * Get All
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatServicesGet(): CancelablePromise<Array<SatGenericResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-services',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatServicesPost(
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-services',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatServicesItemIdPut(
        itemId: number,
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-services/{item_id}',
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
    public static deleteItemApiSatSatServicesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-services/{item_id}',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatCargoTypesGet(): CancelablePromise<Array<SatGenericResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-cargo-types',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatCargoTypesPost(
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-cargo-types',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatCargoTypesItemIdPut(
        itemId: number,
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-cargo-types/{item_id}',
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
    public static deleteItemApiSatSatCargoTypesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-cargo-types/{item_id}',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatTrailerSubtypesGet(): CancelablePromise<Array<SatGenericResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-trailer-subtypes',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatTrailerSubtypesPost(
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-trailer-subtypes',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatTrailerSubtypesItemIdPut(
        itemId: number,
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-trailer-subtypes/{item_id}',
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
    public static deleteItemApiSatSatTrailerSubtypesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-trailer-subtypes/{item_id}',
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
     * @returns SatTruckConfigResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatTruckConfigsGet(): CancelablePromise<Array<SatTruckConfigResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-truck-configs',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatTruckConfigResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatTruckConfigsPost(
        requestBody: SatTruckConfigCreate,
    ): CancelablePromise<SatTruckConfigResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-truck-configs',
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
     * @returns SatTruckConfigResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatTruckConfigsItemIdPut(
        itemId: number,
        requestBody: SatTruckConfigCreate,
    ): CancelablePromise<SatTruckConfigResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-truck-configs/{item_id}',
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
    public static deleteItemApiSatSatTruckConfigsItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-truck-configs/{item_id}',
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
     * @returns SatPermitTypeResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatPermitTypesGet(): CancelablePromise<Array<SatPermitTypeResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-permit-types',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatPermitTypeResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatPermitTypesPost(
        requestBody: SatPermitTypeCreate,
    ): CancelablePromise<SatPermitTypeResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-permit-types',
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
     * @returns SatPermitTypeResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatPermitTypesItemIdPut(
        itemId: number,
        requestBody: SatPermitTypeCreate,
    ): CancelablePromise<SatPermitTypeResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-permit-types/{item_id}',
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
    public static deleteItemApiSatSatPermitTypesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-permit-types/{item_id}',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatPackagingTypesGet(): CancelablePromise<Array<SatGenericResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-packaging-types',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatPackagingTypesPost(
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-packaging-types',
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
     * @returns SatGenericResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatPackagingTypesItemIdPut(
        itemId: number,
        requestBody: SatGenericCreate,
    ): CancelablePromise<SatGenericResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-packaging-types/{item_id}',
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
    public static deleteItemApiSatSatPackagingTypesItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-packaging-types/{item_id}',
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
     * @returns SatHazardousMaterialResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatHazardousMaterialsGet(): CancelablePromise<Array<SatHazardousMaterialResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-hazardous-materials',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatHazardousMaterialResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatHazardousMaterialsPost(
        requestBody: SatHazardousMaterialCreate,
    ): CancelablePromise<SatHazardousMaterialResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-hazardous-materials',
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
     * @returns SatHazardousMaterialResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatHazardousMaterialsItemIdPut(
        itemId: number,
        requestBody: SatHazardousMaterialCreate,
    ): CancelablePromise<SatHazardousMaterialResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-hazardous-materials/{item_id}',
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
    public static deleteItemApiSatSatHazardousMaterialsItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-hazardous-materials/{item_id}',
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
     * @returns SatStationResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatStationsGet(): CancelablePromise<Array<SatStationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-stations',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatStationResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatStationsPost(
        requestBody: SatStationCreate,
    ): CancelablePromise<SatStationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-stations',
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
     * @returns SatStationResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatStationsItemIdPut(
        itemId: number,
        requestBody: SatStationCreate,
    ): CancelablePromise<SatStationResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-stations/{item_id}',
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
    public static deleteItemApiSatSatStationsItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-stations/{item_id}',
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
     * @returns SatUnitWeightResponse Successful Response
     * @throws ApiError
     */
    public static getAllApiSatSatUnitWeightsGet(): CancelablePromise<Array<SatUnitWeightResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-unit-weights',
        });
    }
    /**
     * Create Item
     * @param requestBody
     * @returns SatUnitWeightResponse Successful Response
     * @throws ApiError
     */
    public static createItemApiSatSatUnitWeightsPost(
        requestBody: SatUnitWeightCreate,
    ): CancelablePromise<SatUnitWeightResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/sat-unit-weights',
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
     * @returns SatUnitWeightResponse Successful Response
     * @throws ApiError
     */
    public static updateItemApiSatSatUnitWeightsItemIdPut(
        itemId: number,
        requestBody: SatUnitWeightCreate,
    ): CancelablePromise<SatUnitWeightResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-unit-weights/{item_id}',
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
    public static deleteItemApiSatSatUnitWeightsItemIdDelete(
        itemId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-unit-weights/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
