/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BankAccountCreate } from '../models/BankAccountCreate';
import type { BankAccountResponse } from '../models/BankAccountResponse';
import type { BankMovementResponse } from '../models/BankMovementResponse';
import type { Body_upload_payment_xml_api_finance_payments_upload_xml_post } from '../models/Body_upload_payment_xml_api_finance_payments_upload_xml_post';
import type { BulkUploadPayload } from '../models/BulkUploadPayload';
import type { ProviderCreate } from '../models/ProviderCreate';
import type { ProviderResponse } from '../models/ProviderResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FinanceService {
    /**
     * Read Providers
     * @param skip
     * @param limit
     * @returns ProviderResponse Successful Response
     * @throws ApiError
     */
    public static readProvidersApiFinanceProvidersGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<ProviderResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/providers',
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
     * Create Provider
     * @param requestBody
     * @returns ProviderResponse Successful Response
     * @throws ApiError
     */
    public static createProviderApiFinanceProvidersPost(
        requestBody: ProviderCreate,
    ): CancelablePromise<ProviderResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/providers',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Provider
     * @param providerId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteProviderApiFinanceProvidersProviderIdDelete(
        providerId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/finance/providers/{provider_id}',
            path: {
                'provider_id': providerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Indirect Categories
     * Obtiene las categorías de gastos indirectos (Fijos/Variables)
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readIndirectCategoriesApiFinanceIndirectCategoriesGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/indirect-categories',
        });
    }
    /**
     * Read Bank Accounts
     * @returns BankAccountResponse Successful Response
     * @throws ApiError
     */
    public static readBankAccountsApiFinanceBankAccountsGet(): CancelablePromise<Array<BankAccountResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/bank-accounts',
        });
    }
    /**
     * Create Bank Account
     * Crea una nueva cuenta bancaria en Tesorería
     * @param requestBody
     * @returns BankAccountResponse Successful Response
     * @throws ApiError
     */
    public static createBankAccountApiFinanceBankAccountsPost(
        requestBody: BankAccountCreate,
    ): CancelablePromise<BankAccountResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/bank-accounts',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Bank Account
     * Edita la cuenta bancaria. Permite ajuste de saldo si se autorizó en el front.
     * @param accountId
     * @param requestBody
     * @returns BankAccountResponse Successful Response
     * @throws ApiError
     */
    public static updateBankAccountApiFinanceBankAccountsAccountIdPatch(
        accountId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<BankAccountResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/finance/bank-accounts/{account_id}',
            path: {
                'account_id': accountId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Bank Account
     * Aplica un Soft Delete a la cuenta para proteger la integridad contable.
     * @param accountId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteBankAccountApiFinanceBankAccountsAccountIdDelete(
        accountId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/finance/bank-accounts/{account_id}',
            path: {
                'account_id': accountId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Movements
     * @returns BankMovementResponse Successful Response
     * @throws ApiError
     */
    public static readMovementsApiFinanceMovementsGet(): CancelablePromise<Array<BankMovementResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/movements',
        });
    }
    /**
     * Bulk Upload Invoices
     * Endpoint para procesar la carga masiva de facturas del SAT (CXP).
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkUploadInvoicesApiFinanceInvoicesBulkUploadPost(
        requestBody: BulkUploadPayload,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/invoices/bulk-upload',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Receivable Invoices
     * Obtiene todas las facturas de clientes (Cuentas por Cobrar)
     * con la información del cliente adjunta.
     * @param skip
     * @param limit
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getReceivableInvoicesApiFinanceReceivablesGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/receivables',
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
     * Delete Receivable Invoice
     * @param invoiceId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteReceivableInvoiceApiFinanceReceivablesInvoiceIdDelete(
        invoiceId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/finance/receivables/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Register Receivable Payment
     * @param invoiceId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static registerReceivablePaymentApiFinanceReceivablesInvoiceIdPaymentsPost(
        invoiceId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/receivables/{invoice_id}/payments',
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
     * Upload Payment Xml
     * Lee un XML de Complemento de Pago (REP), busca el UUID de la factura relacionada
     * y aplica el pago automáticamente matando el saldo pendiente.
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadPaymentXmlApiFinancePaymentsUploadXmlPost(
        formData: Body_upload_payment_xml_api_finance_payments_upload_xml_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/payments/upload-xml',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Register Provider Payment
     * Aplica un pago a una factura de proveedor (CXP) y descuenta del banco.
     * @param invoiceId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static registerProviderPaymentApiFinancePayablesInvoiceIdPaymentsPost(
        invoiceId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/payables/{invoice_id}/payments',
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
     * Register Petty Cash
     * Registra un gasto de Caja Chica (Sin XML) afectando directo la Tesorería.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static registerPettyCashApiFinancePettyCashPost(
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/petty-cash',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
