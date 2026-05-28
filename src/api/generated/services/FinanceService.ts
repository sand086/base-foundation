/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__modules__finance__schemas__CostCenterResponse } from '../models/app__modules__finance__schemas__CostCenterResponse';
import type { BankAccountCreate } from '../models/BankAccountCreate';
import type { BankAccountResponse } from '../models/BankAccountResponse';
import type { BankMovementCreate } from '../models/BankMovementCreate';
import type { BankMovementResponse } from '../models/BankMovementResponse';
import type { Body_bulk_upload_invoices_api_finance_invoices_bulk_upload_post } from '../models/Body_bulk_upload_invoices_api_finance_invoices_bulk_upload_post';
import type { Body_fix_orphan_payments_api_finance_fix_orphan_payments_post } from '../models/Body_fix_orphan_payments_api_finance_fix_orphan_payments_post';
import type { Body_upload_payment_xml_api_finance_payments_upload_xml_post } from '../models/Body_upload_payment_xml_api_finance_payments_upload_xml_post';
import type { IndirectCategoryCreate } from '../models/IndirectCategoryCreate';
import type { IndirectCategoryResponse } from '../models/IndirectCategoryResponse';
import type { IndirectCategoryUpdate } from '../models/IndirectCategoryUpdate';
import type { OperatorSettlementPayload } from '../models/OperatorSettlementPayload';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FinanceService {
    /**
     * Read Cost Centers
     * Obtiene los Centros de Costos activos.
     * @returns app__modules__finance__schemas__CostCenterResponse Successful Response
     * @throws ApiError
     */
    public static readCostCentersApiFinanceCostCentersGet(): CancelablePromise<Array<app__modules__finance__schemas__CostCenterResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/cost-centers',
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
     * Create Manual Movement
     * @param requestBody
     * @returns BankMovementResponse Successful Response
     * @throws ApiError
     */
    public static createManualMovementApiFinanceMovementsPost(
        requestBody: BankMovementCreate,
    ): CancelablePromise<BankMovementResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/movements',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Conciliate Movement
     * @param movementId
     * @returns BankMovementResponse Successful Response
     * @throws ApiError
     */
    public static conciliateMovementApiFinanceMovementsMovementIdConciliationPatch(
        movementId: number,
    ): CancelablePromise<BankMovementResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/finance/movements/{movement_id}/conciliation',
            path: {
                'movement_id': movementId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Bank Movement
     * @param movementId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteBankMovementApiFinanceMovementsMovementIdDelete(
        movementId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/finance/movements/{movement_id}',
            path: {
                'movement_id': movementId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Upload Invoices
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkUploadInvoicesApiFinanceInvoicesBulkUploadPost(
        formData: Body_bulk_upload_invoices_api_finance_invoices_bulk_upload_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/invoices/bulk-upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Receivable Invoices
     * @param skip
     * @param limit
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getReceivableInvoicesApiFinanceReceivablesGet(
        skip?: number,
        limit: number = 5000,
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
     * Create Manual Receivable
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static createManualReceivableApiFinanceReceivablesPost(
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/receivables',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Receivable Invoice
     * FIX: ELIMINACIÓN TOTAL EN CASCADA (VIAJE, DIÉSEL, LIQUIDACIÓN, TRAZABILIDAD)
     * @param invoiceId
     * @param cascade
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteReceivableInvoiceApiFinanceReceivablesInvoiceIdDelete(
        invoiceId: number,
        cascade: boolean = false,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/finance/receivables/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            query: {
                'cascade': cascade,
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
     * Fix Orphan Payments
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static fixOrphanPaymentsApiFinanceFixOrphanPaymentsPost(
        requestBody: Body_fix_orphan_payments_api_finance_fix_orphan_payments_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/fix-orphan-payments',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Register Petty Cash
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
    /**
     * Reopen Receivable Invoice
     * FIX CRÍTICO TESORERÍA: Revertir cobros antes de reabrir factura
     * @param invoiceId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static reopenReceivableInvoiceApiFinanceReceivablesInvoiceIdReopenPost(
        invoiceId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/receivables/{invoice_id}/reopen',
            path: {
                'invoice_id': invoiceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Process Settlement For Operator
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static processSettlementForOperatorApiFinanceSettlementsOperatorPost(
        requestBody: OperatorSettlementPayload,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/settlements/operator',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Indirect Categories
     * @returns IndirectCategoryResponse Successful Response
     * @throws ApiError
     */
    public static readIndirectCategoriesApiFinanceIndirectCategoriesGet(): CancelablePromise<Array<IndirectCategoryResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/finance/indirect-categories',
        });
    }
    /**
     * Create Indirect Category
     * @param requestBody
     * @returns IndirectCategoryResponse Successful Response
     * @throws ApiError
     */
    public static createIndirectCategoryApiFinanceIndirectCategoriesPost(
        requestBody: IndirectCategoryCreate,
    ): CancelablePromise<IndirectCategoryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/finance/indirect-categories',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Indirect Category
     * @param catId
     * @param requestBody
     * @returns IndirectCategoryResponse Successful Response
     * @throws ApiError
     */
    public static updateIndirectCategoryApiFinanceIndirectCategoriesCatIdPut(
        catId: number,
        requestBody: IndirectCategoryUpdate,
    ): CancelablePromise<IndirectCategoryResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/finance/indirect-categories/{cat_id}',
            path: {
                'cat_id': catId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Indirect Category
     * @param catId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteIndirectCategoryApiFinanceIndirectCategoriesCatIdDelete(
        catId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/finance/indirect-categories/{cat_id}',
            path: {
                'cat_id': catId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
