/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_mechanic_document_api_maintenance_mechanics__mechanic_id__documents__doc_type__post } from '../models/Body_upload_mechanic_document_api_maintenance_mechanics__mechanic_id__documents__doc_type__post';
import type { InventoryItemCreate } from '../models/InventoryItemCreate';
import type { InventoryItemResponse } from '../models/InventoryItemResponse';
import type { InventoryItemUpdate } from '../models/InventoryItemUpdate';
import type { MechanicCreate } from '../models/MechanicCreate';
import type { MechanicDocumentResponse } from '../models/MechanicDocumentResponse';
import type { MechanicResponse } from '../models/MechanicResponse';
import type { MechanicUpdate } from '../models/MechanicUpdate';
import type { WorkOrderCreate } from '../models/WorkOrderCreate';
import type { WorkOrderResponse } from '../models/WorkOrderResponse';
import type { WorkOrderStatusUpdate } from '../models/WorkOrderStatusUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MaintenanceService {
    /**
     * Read Inventory
     * @param skip
     * @param limit
     * @returns InventoryItemResponse Successful Response
     * @throws ApiError
     */
    public static readInventoryApiMaintenanceInventoryGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<InventoryItemResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/maintenance/inventory',
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
     * Create Inventory Item
     * @param requestBody
     * @returns InventoryItemResponse Successful Response
     * @throws ApiError
     */
    public static createInventoryItemApiMaintenanceInventoryPost(
        requestBody: InventoryItemCreate,
    ): CancelablePromise<InventoryItemResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/maintenance/inventory',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Inventory Item
     * @param itemId
     * @param requestBody
     * @returns InventoryItemResponse Successful Response
     * @throws ApiError
     */
    public static updateInventoryItemApiMaintenanceInventoryItemIdPut(
        itemId: number,
        requestBody: InventoryItemUpdate,
    ): CancelablePromise<InventoryItemResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/maintenance/inventory/{item_id}',
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
     * Delete Inventory Item
     * @param itemId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteInventoryItemApiMaintenanceInventoryItemIdDelete(
        itemId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/maintenance/inventory/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Mechanics
     * @returns MechanicResponse Successful Response
     * @throws ApiError
     */
    public static readMechanicsApiMaintenanceMechanicsGet(): CancelablePromise<Array<MechanicResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/maintenance/mechanics',
        });
    }
    /**
     * Create Mechanic
     * @param requestBody
     * @returns MechanicResponse Successful Response
     * @throws ApiError
     */
    public static createMechanicApiMaintenanceMechanicsPost(
        requestBody: MechanicCreate,
    ): CancelablePromise<MechanicResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/maintenance/mechanics',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Mechanic
     * @param mechanicId
     * @param requestBody
     * @returns MechanicResponse Successful Response
     * @throws ApiError
     */
    public static updateMechanicApiMaintenanceMechanicsMechanicIdPut(
        mechanicId: number,
        requestBody: MechanicUpdate,
    ): CancelablePromise<MechanicResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/maintenance/mechanics/{mechanic_id}',
            path: {
                'mechanic_id': mechanicId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Mechanic Document
     * @param mechanicId
     * @param docType
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadMechanicDocumentApiMaintenanceMechanicsMechanicIdDocumentsDocTypePost(
        mechanicId: number,
        docType: string,
        formData: Body_upload_mechanic_document_api_maintenance_mechanics__mechanic_id__documents__doc_type__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/maintenance/mechanics/{mechanic_id}/documents/{doc_type}',
            path: {
                'mechanic_id': mechanicId,
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
     * Get Mechanic Documents
     * @param mechanicId
     * @returns MechanicDocumentResponse Successful Response
     * @throws ApiError
     */
    public static getMechanicDocumentsApiMaintenanceMechanicsMechanicIdDocumentsGet(
        mechanicId: number,
    ): CancelablePromise<Array<MechanicDocumentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/maintenance/mechanics/{mechanic_id}/documents',
            path: {
                'mechanic_id': mechanicId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Mechanic Document
     * @param documentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteMechanicDocumentApiMaintenanceMechanicsDocumentsDocumentIdDelete(
        documentId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/maintenance/mechanics/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Work Orders
     * @param skip
     * @param limit
     * @returns WorkOrderResponse Successful Response
     * @throws ApiError
     */
    public static readWorkOrdersApiMaintenanceWorkOrdersGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<WorkOrderResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/maintenance/work-orders',
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
     * Create Work Order
     * @param requestBody
     * @returns WorkOrderResponse Successful Response
     * @throws ApiError
     */
    public static createWorkOrderApiMaintenanceWorkOrdersPost(
        requestBody: WorkOrderCreate,
    ): CancelablePromise<WorkOrderResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/maintenance/work-orders',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Order Status
     * @param orderId
     * @param requestBody
     * @returns WorkOrderResponse Successful Response
     * @throws ApiError
     */
    public static updateOrderStatusApiMaintenanceWorkOrdersOrderIdStatusPatch(
        orderId: number,
        requestBody: WorkOrderStatusUpdate,
    ): CancelablePromise<WorkOrderResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/maintenance/work-orders/{order_id}/status',
            path: {
                'order_id': orderId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Work Order
     * @param orderId
     * @param requestBody
     * @returns WorkOrderResponse Successful Response
     * @throws ApiError
     */
    public static updateWorkOrderApiMaintenanceWorkOrdersOrderIdPut(
        orderId: number,
        requestBody: WorkOrderCreate,
    ): CancelablePromise<WorkOrderResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/maintenance/work-orders/{order_id}',
            path: {
                'order_id': orderId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Work Order
     * @param orderId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteWorkOrderApiMaintenanceWorkOrdersOrderIdDelete(
        orderId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/maintenance/work-orders/{order_id}',
            path: {
                'order_id': orderId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
