/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InventoryCategory } from './InventoryCategory';
export type InventoryItemCreate = {
    sku: string;
    descripcion: string;
    categoria?: InventoryCategory;
    stock_actual?: number;
    stock_minimo?: number;
    ubicacion?: (string | null);
    precio_unitario?: number;
};

