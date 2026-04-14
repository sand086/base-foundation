/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PurchaseOrderItemResponse } from './PurchaseOrderItemResponse';
export type PurchaseOrderResponse = {
    id: number;
    folio: string;
    tipo: string;
    supplier_id: number;
    cost_center: (string | null);
    indirect_category_id: (number | null);
    requester: (string | null);
    required_date: (string | null);
    service_description: (string | null);
    subtotal: number;
    iva: number;
    total: number;
    moneda: string;
    status: string;
    items?: Array<PurchaseOrderItemResponse>;
    created_at: string;
    updated_at: string;
};

