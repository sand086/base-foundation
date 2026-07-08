/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InventoryCategory } from './InventoryCategory';
export type InventoryItemUpdate = {
    sku?: (string | null);
    descripcion?: (string | null);
    categoria?: (InventoryCategory | null);
    stock_actual?: (number | null);
    stock_minimo?: (number | null);
    ubicacion?: (string | null);
    precio_unitario?: (number | null);
    proveedor_id?: (number | null);
};

