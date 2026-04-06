/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
export type WorkOrderPartResponse = {
    id: number;
    work_order_id: number;
    inventory_item_id: number;
    cantidad: number;
    costo_unitario_snapshot: number;
    item_sku?: (string | null);
    item_descripcion?: (string | null);
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

