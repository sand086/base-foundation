/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InventoryCategory } from './InventoryCategory';
import type { RecordStatus } from './RecordStatus';
export type InventoryItemResponse = {
    sku: string;
    descripcion: string;
    categoria?: InventoryCategory;
    stock_actual?: number;
    stock_minimo?: number;
    ubicacion?: (string | null);
    precio_unitario?: number;
    proveedor_id?: (number | null);
    id: number;
    proveedor_nombre?: (string | null);
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

