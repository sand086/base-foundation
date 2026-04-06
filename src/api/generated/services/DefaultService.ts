/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_download_csd_secure_api_sat_csd_download_post } from '../models/Body_download_csd_secure_api_sat_csd_download_post';
import type { Body_upload_client_document_api_clients__client_id__documents__doc_type__post } from '../models/Body_upload_client_document_api_clients__client_id__documents__doc_type__post';
import type { Body_upload_csd_files_api_sat_csd_post } from '../models/Body_upload_csd_files_api_sat_csd_post';
import type { ClientCreate } from '../models/ClientCreate';
import type { ClientResponse } from '../models/ClientResponse';
import type { ClientUpdate } from '../models/ClientUpdate';
import type { DashboardData } from '../models/DashboardData';
import type { ReceivableInvoiceCreate } from '../models/ReceivableInvoiceCreate';
import type { SatProductCreate } from '../models/SatProductCreate';
import type { SatProductResponse } from '../models/SatProductResponse';
import type { TerminalBase } from '../models/TerminalBase';
import type { TerminalResponse } from '../models/TerminalResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Get Terminals
     * @param search
     * @returns TerminalResponse Successful Response
     * @throws ApiError
     */
    public static getTerminalsApiCatalogsTerminalsGet(
        search: string = '',
    ): CancelablePromise<Array<TerminalResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/catalogs/terminals',
            query: {
                'search': search,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Terminal
     * @param requestBody
     * @returns TerminalResponse Successful Response
     * @throws ApiError
     */
    public static createTerminalApiCatalogsTerminalsPost(
        requestBody: TerminalBase,
    ): CancelablePromise<TerminalResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/catalogs/terminals',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Terminal
     * @param terminalId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTerminalApiCatalogsTerminalsTerminalIdDelete(
        terminalId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/catalogs/terminals/{terminal_id}',
            path: {
                'terminal_id': terminalId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Terminal
     * @param terminalId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateTerminalApiCatalogsTerminalsTerminalIdPut(
        terminalId: number,
        requestBody: TerminalBase,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/catalogs/terminals/{terminal_id}',
            path: {
                'terminal_id': terminalId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Dashboard Stats
     * @param startDate
     * @param endDate
     * @returns DashboardData Successful Response
     * @throws ApiError
     */
    public static getDashboardStatsApiDashboardStatsGet(
        startDate: string,
        endDate: string,
    ): CancelablePromise<DashboardData> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dashboard/stats',
            query: {
                'start_date': startDate,
                'end_date': endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Clients
     * @param skip
     * @param limit
     * @returns ClientResponse Successful Response
     * @throws ApiError
     */
    public static readClientsApiClientsGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<ClientResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/clients',
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
     * Create Client
     * @param requestBody
     * @returns ClientResponse Successful Response
     * @throws ApiError
     */
    public static createClientApiClientsPost(
        requestBody: ClientCreate,
    ): CancelablePromise<ClientResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/clients',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Client
     * @param clientId
     * @returns ClientResponse Successful Response
     * @throws ApiError
     */
    public static readClientApiClientsClientIdGet(
        clientId: number,
    ): CancelablePromise<ClientResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/clients/{client_id}',
            path: {
                'client_id': clientId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Client
     * @param clientId
     * @param requestBody
     * @returns ClientResponse Successful Response
     * @throws ApiError
     */
    public static updateClientApiClientsClientIdPut(
        clientId: number,
        requestBody: ClientUpdate,
    ): CancelablePromise<ClientResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/clients/{client_id}',
            path: {
                'client_id': clientId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Client
     * @param clientId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteClientApiClientsClientIdDelete(
        clientId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/clients/{client_id}',
            path: {
                'client_id': clientId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Client Document
     * @param clientId
     * @param docType
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadClientDocumentApiClientsClientIdDocumentsDocTypePost(
        clientId: number,
        docType: string,
        formData: Body_upload_client_document_api_clients__client_id__documents__doc_type__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/clients/{client_id}/documents/{doc_type}',
            path: {
                'client_id': clientId,
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
     * Get Client Document History
     * Retorna todas las versiones de un documento específico de un cliente
     * @param clientId
     * @param docType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getClientDocumentHistoryApiClientsClientIdDocumentsDocTypeHistoryGet(
        clientId: number,
        docType: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/clients/{client_id}/documents/{doc_type}/history',
            path: {
                'client_id': clientId,
                'doc_type': docType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Client Document
     * @param documentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteClientDocumentApiClientsDocumentsDocumentIdDelete(
        documentId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/clients/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Test Invoice Pro
     * @returns any Successful Response
     * @throws ApiError
     */
    public static testInvoiceProApiSatTestInvoiceProGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/test-invoice-pro',
        });
    }
    /**
     * Debug Ping
     * @returns any Successful Response
     * @throws ApiError
     */
    public static debugPingApiSatDebugPingGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/debug-ping',
        });
    }
    /**
     * Generar Carta Porte Nominal
     * Endpoint Fase 3 (Bypass Aduanal):
     * Genera y timbra la Carta Porte 3.1 por un valor de $1.00 MXN.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generarCartaPorteNominalApiSatStampNominalPost(
        requestBody: ReceivableInvoiceCreate,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/stamp/nominal',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stamp Real Trip
     * Trigger manual o automático para generar la Carta Porte REAL
     * cuando el viaje inicia su tramo de carretera. Automáticamente
     * relaciona y cancela la carta porte nominal previa si existe.
     * @param tripId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static stampRealTripApiSatTripIdStampRealPost(
        tripId: number,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/{trip_id}/stamp-real',
            path: {
                'trip_id': tripId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generar Factura Final
     * Endpoint Fase 4 (Cierre Administrativo y Sustitución 04):
     * 1. Genera la factura real con los costos completos jalando al operador de ruta.
     * 2. Aplica la Relación 04 al UUID de la Carta Porte nominal.
     * 3. Cancela localmente la Carta Porte nominal de $1.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generarFacturaFinalApiSatStampFinalPost(
        requestBody: ReceivableInvoiceCreate,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/stamp/final',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Download Invoice Pdf
     * Busca el archivo PDF generado en el disco y lo descarga.
     * @param uuid
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadInvoicePdfApiSatInvoiceUuidPdfGet(
        uuid: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/invoice/{uuid}/pdf',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Download Invoice Xml
     * Busca el archivo XML timbrado en el disco y lo descarga.
     * @param uuid
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadInvoiceXmlApiSatInvoiceUuidXmlGet(
        uuid: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/invoice/{uuid}/xml',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Sat Params
     * Endpoint para la Pestaña 3: Guarda la leyenda legal y otros textos.
     * Recibe un dict: {"sat_leyenda_legal": "TEXTO LARGO...", "sat_ppd_default": "true"}
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateSatParamsApiSatUpdateParamsPost(
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/update-params',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Csd Files
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadCsdFilesApiSatCsdPost(
        formData: Body_upload_csd_files_api_sat_csd_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/csd',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Download Csd Secure
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadCsdSecureApiSatCsdDownloadPost(
        formData: Body_download_csd_secure_api_sat_csd_download_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/csd/download',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Test Csd Connection
     * Verifica que los certificados existan, lee la fecha de caducidad del .cer
     * y simula la conexión con el PAC.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static testCsdConnectionApiSatCsdTestPost(
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/csd/test',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reintentar Cancelaciones Pendientes SAT
     * Este endpoint busca facturas con status 'PENDIENTE_CANCELAR_SAT'
     * y vuelve a mandar la petición SOAP de cancelación al PAC.
     * Ideal para configurar en un CRONJOB (ej. cada hora).
     * @returns any Successful Response
     * @throws ApiError
     */
    public static retryPendingCancellationsApiSatRetryCancellationsPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/sat/retry-cancellations',
        });
    }
    /**
     * Get Sat Products
     * Obtiene la lista de productos/servicios del catálogo del SAT
     * @returns SatProductResponse Successful Response
     * @throws ApiError
     */
    public static getSatProductsApiSatSatProductsGet(): CancelablePromise<Array<SatProductResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/sat/sat-products',
        });
    }
    /**
     * Create Sat Product
     * Crea un nuevo producto/servicio en el catálogo del SAT
     * @param requestBody
     * @returns SatProductResponse Successful Response
     * @throws ApiError
     */
    public static createSatProductApiSatSatProductsPost(
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
     * Update Sat Product
     * Actualiza un producto del catálogo del SAT
     * @param productId
     * @param requestBody
     * @returns SatProductResponse Successful Response
     * @throws ApiError
     */
    public static updateSatProductApiSatSatProductsProductIdPut(
        productId: number,
        requestBody: SatProductCreate,
    ): CancelablePromise<SatProductResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sat/sat-products/{product_id}',
            path: {
                'product_id': productId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Sat Product
     * Realiza un borrado lógico (soft delete) del producto SAT
     * @param productId
     * @returns void
     * @throws ApiError
     */
    public static deleteSatProductApiSatSatProductsProductIdDelete(
        productId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/sat/sat-products/{product_id}',
            path: {
                'product_id': productId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Root
     * @returns any Successful Response
     * @throws ApiError
     */
    public static rootGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }
}
