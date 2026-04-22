/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BankAccountCreate } from '../models/BankAccountCreate';
import type { BankAccountResponse } from '../models/BankAccountResponse';
import type { BankMovementCreate } from '../models/BankMovementCreate';
import type { BankMovementResponse } from '../models/BankMovementResponse';
import type { Body_bulk_upload_invoices_api_finance_invoices_bulk_upload_post } from '../models/Body_bulk_upload_invoices_api_finance_invoices_bulk_upload_post';
import type { Body_fix_orphan_payments_api_finance_fix_orphan_payments_post } from '../models/Body_fix_orphan_payments_api_finance_fix_orphan_payments_post';
import type { Body_upload_payment_xml_api_finance_payments_upload_xml_post } from '../models/Body_upload_payment_xml_api_finance_payments_upload_xml_post';
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
     * Create Manual Movement
     * Crea un movimiento manual (Ingreso o Egreso) afectando el saldo directamente.
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
     * Marca un movimiento bancario como conciliado (Verificado contra el banco).
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
     * Elimina un movimiento bancario y restaura el saldo de la cuenta.
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
     * Endpoint robusto para procesar el reporte SAT.
     * 1. Guarda el archivo original en el servidor para auditoría.
     * 2. Procesa los registros evitando duplicados por UUID.
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
     * Create Manual Receivable
     * Endpoint para crear una factura manual (CxC) generada por el usuario.
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
     * CAMBIO CLAVE: Cobra una factura de cliente e ingresa el dinero a Tesorería.
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
     * CAMBIO CLAVE: Si subes el XML del REP, busca/crea una cuenta puente y hace el ingreso en tesorería.
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
     * Busca los pagos antiguos que decían "cuenta_deposito: '' " (o null)
     * y los inserta oficialmente en la cuenta bancaria de Tesorería que le mandes.
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
    /**
     * Reopen Receivable Invoice
     * BOTÓN DE RESCATE: Restaura una cuenta por cobrar a su estado original (Pendiente).
     * Elimina los pagos atascados y resetea el saldo al monto total para reintentar el REP.
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
}
