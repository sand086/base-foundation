/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PurchaseOrderCreate } from '../models/PurchaseOrderCreate';
import type { PurchaseOrderResponse } from '../models/PurchaseOrderResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PurchasesService {
    /**
     * Create Purchase Order
     * Crea una nueva Orden de Compra desde el Wizard.
     * Nace con estatus PENDIENTE.
     * @param requestBody
     * @returns PurchaseOrderResponse Successful Response
     * @throws ApiError
     */
    public static createPurchaseOrderApiPurchasesPurchasesOrdersPost(
        requestBody: PurchaseOrderCreate,
    ): CancelablePromise<PurchaseOrderResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/purchases/purchases/orders',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Purchase Orders
     * Obtiene la lista de todas las Órdenes de Compra.
     * @param skip
     * @param limit
     * @returns PurchaseOrderResponse Successful Response
     * @throws ApiError
     */
    public static listPurchaseOrdersApiPurchasesPurchasesOrdersGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<PurchaseOrderResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/purchases/purchases/orders',
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
     * Receive Purchase Order
     * Dispara la magia:
     * 1. Suma el stock al inventario (Si es tipo compra).
     * 2. Crea la Provisión PPD en CxP (Finanzas).
     * @param orderId
     * @returns PurchaseOrderResponse Successful Response
     * @throws ApiError
     */
    public static receivePurchaseOrderApiPurchasesPurchasesOrdersOrderIdReceivePost(
        orderId: number,
    ): CancelablePromise<PurchaseOrderResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/purchases/purchases/orders/{order_id}/receive',
            path: {
                'order_id': orderId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
