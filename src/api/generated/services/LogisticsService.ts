/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BatchSettlementPayload } from '../models/BatchSettlementPayload';
import type { BatchSettlementPreviewRequest } from '../models/BatchSettlementPreviewRequest';
import type { BatchSettlementPreviewResponse } from '../models/BatchSettlementPreviewResponse';
import type { CloseSettlementPayload } from '../models/CloseSettlementPayload';
import type { RateTemplateCreate } from '../models/RateTemplateCreate';
import type { RateTemplateResponse } from '../models/RateTemplateResponse';
import type { RateTemplateUpdate } from '../models/RateTemplateUpdate';
import type { TollBoothCreate } from '../models/TollBoothCreate';
import type { TollBoothResponse } from '../models/TollBoothResponse';
import type { TollBoothUpdate } from '../models/TollBoothUpdate';
import type { TripCreate } from '../models/TripCreate';
import type { TripLegCreate } from '../models/TripLegCreate';
import type { TripResponse } from '../models/TripResponse';
import type { TripSettlementResponse } from '../models/TripSettlementResponse';
import type { TripTimelineEventCreatePayload } from '../models/TripTimelineEventCreatePayload';
import type { TripUpdate } from '../models/TripUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LogisticsService {
    /**
     * List Tolls
     * @param search
     * @returns TollBoothResponse Successful Response
     * @throws ApiError
     */
    public static listTollsApiLogisticsTollsGet(
        search: string = '',
    ): CancelablePromise<Array<TollBoothResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/tolls',
            query: {
                'search': search,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Toll
     * @param requestBody
     * @returns TollBoothResponse Successful Response
     * @throws ApiError
     */
    public static createTollApiLogisticsTollsPost(
        requestBody: TollBoothCreate,
    ): CancelablePromise<TollBoothResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/tolls',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Toll
     * @param tollId
     * @param requestBody
     * @returns TollBoothResponse Successful Response
     * @throws ApiError
     */
    public static updateTollApiLogisticsTollsTollIdPut(
        tollId: number,
        requestBody: TollBoothUpdate,
    ): CancelablePromise<TollBoothResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/logistics/tolls/{toll_id}',
            path: {
                'toll_id': tollId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Toll
     * @param tollId
     * @param removeFromRoutes
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTollApiLogisticsTollsTollIdDelete(
        tollId: number,
        removeFromRoutes: boolean = false,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/logistics/tolls/{toll_id}',
            path: {
                'toll_id': tollId,
            },
            query: {
                'remove_from_routes': removeFromRoutes,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Check Toll Dependencies
     * @param tollId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static checkTollDependenciesApiLogisticsTollsTollIdDependenciesGet(
        tollId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/tolls/{toll_id}/dependencies',
            path: {
                'toll_id': tollId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Templates
     * @param search
     * @param clientId
     * @returns RateTemplateResponse Successful Response
     * @throws ApiError
     */
    public static listTemplatesApiLogisticsRateTemplatesGet(
        search: string = '',
        clientId?: (number | null),
    ): CancelablePromise<Array<RateTemplateResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/rate-templates',
            query: {
                'search': search,
                'client_id': clientId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Template
     * @param requestBody
     * @returns RateTemplateResponse Successful Response
     * @throws ApiError
     */
    public static createTemplateApiLogisticsRateTemplatesPost(
        requestBody: RateTemplateCreate,
    ): CancelablePromise<RateTemplateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/rate-templates',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Template
     * @param templateId
     * @param requestBody
     * @returns RateTemplateResponse Successful Response
     * @throws ApiError
     */
    public static updateTemplateApiLogisticsRateTemplatesTemplateIdPut(
        templateId: number,
        requestBody: RateTemplateUpdate,
    ): CancelablePromise<RateTemplateResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/logistics/rate-templates/{template_id}',
            path: {
                'template_id': templateId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Template
     * @param templateId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTemplateApiLogisticsRateTemplatesTemplateIdDelete(
        templateId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/logistics/rate-templates/{template_id}',
            path: {
                'template_id': templateId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Trips
     * @param skip
     * @param limit
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static readTripsApiLogisticsTripsGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<TripResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/trips',
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
     * Create Trip
     * @param requestBody
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static createTripApiLogisticsTripsPost(
        requestBody: TripCreate,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Trip
     * @param tripId
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static readTripApiLogisticsTripsTripIdGet(
        tripId: number,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/trips/{trip_id}',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Trip Endpoint
     * @param tripId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTripEndpointApiLogisticsTripsTripIdDelete(
        tripId: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/logistics/trips/{trip_id}',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Trip Endpoint
     * @param tripId
     * @param requestBody
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static updateTripEndpointApiLogisticsTripsTripIdPut(
        tripId: number,
        requestBody: TripUpdate,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/logistics/trips/{trip_id}',
            path: {
                'trip_id': tripId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Status
     * @param tripId
     * @param status
     * @param location
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static updateStatusApiLogisticsTripsTripIdStatusPatch(
        tripId: number,
        status: string,
        location?: string,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/logistics/trips/{trip_id}/status',
            path: {
                'trip_id': tripId,
            },
            query: {
                'status': status,
                'location': location,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Timeline Event
     * @param tripId
     * @param requestBody
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static createTimelineEventApiLogisticsTripsTripIdTimelinePost(
        tripId: number,
        requestBody: TripTimelineEventCreatePayload,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/{trip_id}/timeline',
            path: {
                'trip_id': tripId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Trip Settlement
     * @param tripLegId
     * @returns TripSettlementResponse Successful Response
     * @throws ApiError
     */
    public static getTripSettlementApiLogisticsTripsLegTripLegIdSettlementGet(
        tripLegId: number,
    ): CancelablePromise<TripSettlementResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/trips/leg/{trip_leg_id}/settlement',
            path: {
                'trip_leg_id': tripLegId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Close Trip Settlement
     * @param tripLegId
     * @param requestBody
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static closeTripSettlementApiLogisticsTripsLegTripLegIdCloseSettlementPost(
        tripLegId: number,
        requestBody: CloseSettlementPayload,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/leg/{trip_leg_id}/close-settlement',
            path: {
                'trip_leg_id': tripLegId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Next Leg Endpoint
     * @param tripId
     * @param requestBody
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static createNextLegEndpointApiLogisticsTripsTripIdNextLegPost(
        tripId: number,
        requestBody: TripLegCreate,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/{trip_id}/next-leg',
            path: {
                'trip_id': tripId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Settle Trip Leg
     * @param legId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static settleTripLegApiLogisticsTripsLegsLegIdSettlePost(
        legId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/legs/{leg_id}/settle',
            path: {
                'leg_id': legId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Carta Porte
     * @param tripId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generateCartaPorteApiLogisticsTripsTripIdCartaPorteCiegaGet(
        tripId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/trips/{trip_id}/carta-porte-ciega',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Nom 087
     * @param tripId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generateNom087ApiLogisticsTripsTripIdNom087Get(
        tripId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/logistics/trips/{trip_id}/nom-087',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Settle Trip Legs Batch
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static settleTripLegsBatchApiLogisticsTripsLegsSettleBatchPost(
        requestBody: BatchSettlementPayload,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/legs/settle-batch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Preview Batch Settlement Endpoint
     * @param requestBody
     * @returns BatchSettlementPreviewResponse Successful Response
     * @throws ApiError
     */
    public static previewBatchSettlementEndpointApiLogisticsTripsLegsSettlementPreviewPost(
        requestBody: BatchSettlementPreviewRequest,
    ): CancelablePromise<BatchSettlementPreviewResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/legs/settlement-preview',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Undo Trip Leg Endpoint
     * @param tripId
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static undoTripLegEndpointApiLogisticsTripsTripIdUndoLegPost(
        tripId: number,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/{trip_id}/undo-leg',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Timeline Event
     * @param eventId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTimelineEventApiLogisticsTripsTimelineEventIdDelete(
        eventId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/logistics/trips/timeline/{event_id}',
            path: {
                'event_id': eventId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Timeline Event
     * @param eventId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateTimelineEventApiLogisticsTripsTimelineEventIdPut(
        eventId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/logistics/trips/timeline/{event_id}',
            path: {
                'event_id': eventId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stamp Real Trip
     * @param tripId
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static stampRealTripApiLogisticsTripsTripIdStampRealPost(
        tripId: number,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/{trip_id}/stamp-real',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Dispatch Trip
     * @param tripId
     * @param requestBody
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static dispatchTripApiLogisticsTripsTripIdDispatchPut(
        tripId: number,
        requestBody: TripCreate,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/logistics/trips/{trip_id}/dispatch',
            path: {
                'trip_id': tripId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unhook Trip In Yard
     * @param tripId
     * @returns TripResponse Successful Response
     * @throws ApiError
     */
    public static unhookTripInYardApiLogisticsTripsTripIdUnhookPost(
        tripId: number,
    ): CancelablePromise<TripResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/trips/{trip_id}/unhook',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Sync Distances
     * Sincroniza masivamente las distancias en carretera de los RateTemplates
     * utilizando la función helper existente (Nominatim + OSRM).
     * @returns any Successful Response
     * @throws ApiError
     */
    public static syncDistancesApiLogisticsRateTemplatesSyncDistancesPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logistics/rate-templates/sync-distances',
        });
    }
}
