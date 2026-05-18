/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PayableInvoiceCreate } from '../models/PayableInvoiceCreate';
import type { PayableInvoiceResponse } from '../models/PayableInvoiceResponse';
import type { PayableInvoiceUpdate } from '../models/PayableInvoiceUpdate';
import type { SupplierCreate } from '../models/SupplierCreate';
import type { SupplierResponse } from '../models/SupplierResponse';
import type { SupplierUpdate } from '../models/SupplierUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SuppliersService {
    /**
     * Read Invoices
     * Obtiene el listado de Cuentas por Pagar (Facturas de Proveedores).
     * @param skip
     * @param limit
     * @returns PayableInvoiceResponse Successful Response
     * @throws ApiError
     */
    public static readInvoicesApiSuppliersInvoicesGet(
        skip?: number,
        limit: number = 5000,
    ): CancelablePromise<Array<PayableInvoiceResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/suppliers/invoices',
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
     * Create Invoice
     * Crea una nueva factura de proveedor.
     * Heredará automáticamente el CECO del proveedor si existe.
     * @param requestBody
     * @returns PayableInvoiceResponse Successful Response
     * @throws ApiError
     */
    public static createInvoiceApiSuppliersInvoicesPost(
        requestBody: PayableInvoiceCreate,
    ): CancelablePromise<PayableInvoiceResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/suppliers/invoices',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Suppliers
     * Catálogo de proveedores activos.
     * @param skip
     * @param limit
     * @returns SupplierResponse Successful Response
     * @throws ApiError
     */
    public static readSuppliersApiSuppliersGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<SupplierResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/suppliers',
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
     * Create Supplier
     * Registra un nuevo proveedor en el sistema.
     * @param requestBody
     * @returns SupplierResponse Successful Response
     * @throws ApiError
     */
    public static createSupplierApiSuppliersPost(
        requestBody: SupplierCreate,
    ): CancelablePromise<SupplierResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/suppliers',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Invoice
     * @param invoiceId
     * @returns PayableInvoiceResponse Successful Response
     * @throws ApiError
     */
    public static readInvoiceApiSuppliersInvoicesInvoiceIdGet(
        invoiceId: number,
    ): CancelablePromise<PayableInvoiceResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/suppliers/invoices/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Invoice
     * @param invoiceId
     * @param requestBody
     * @returns PayableInvoiceResponse Successful Response
     * @throws ApiError
     */
    public static updateInvoiceApiSuppliersInvoicesInvoiceIdPut(
        invoiceId: number,
        requestBody: PayableInvoiceUpdate,
    ): CancelablePromise<PayableInvoiceResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/suppliers/invoices/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Invoice
     * @param invoiceId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteInvoiceApiSuppliersInvoicesInvoiceIdDelete(
        invoiceId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/suppliers/invoices/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Register Payment
     * Registra un pago a una factura y genera el movimiento de egreso en Tesorería.
     * @param invoiceId
     * @param requestBody
     * @returns PayableInvoiceResponse Successful Response
     * @throws ApiError
     */
    public static registerPaymentApiSuppliersInvoicesInvoiceIdPaymentsPost(
        invoiceId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<PayableInvoiceResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/suppliers/invoices/{invoice_id}/payments',
            path: {
                'invoice_id': invoiceId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Payment
     * Cancela un pago, restaura el saldo de la factura y devuelve el dinero a Tesorería.
     * @param paymentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deletePaymentApiSuppliersInvoicesPaymentsPaymentIdDelete(
        paymentId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/suppliers/invoices/payments/{payment_id}',
            path: {
                'payment_id': paymentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Supplier
     * @param supplierId
     * @returns SupplierResponse Successful Response
     * @throws ApiError
     */
    public static readSupplierApiSuppliersSupplierIdGet(
        supplierId: number,
    ): CancelablePromise<SupplierResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/suppliers/{supplier_id}',
            path: {
                'supplier_id': supplierId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Supplier
     * @param supplierId
     * @param requestBody
     * @returns SupplierResponse Successful Response
     * @throws ApiError
     */
    public static updateSupplierApiSuppliersSupplierIdPut(
        supplierId: number,
        requestBody: SupplierUpdate,
    ): CancelablePromise<SupplierResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/suppliers/{supplier_id}',
            path: {
                'supplier_id': supplierId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Supplier
     * Aplica borrado lógico al proveedor para no romper historial de facturas.
     * @param supplierId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteSupplierApiSuppliersSupplierIdDelete(
        supplierId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/suppliers/{supplier_id}',
            path: {
                'supplier_id': supplierId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
