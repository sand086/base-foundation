// src/features/inventory/types.ts
import type { InventoryItemResponse } from "@/api/generated";

export interface InventoryItem extends InventoryItemResponse {
  unidad?: string;
}

export type InventoryItemCreate = Omit<InventoryItem, "id" | "record_status" | "created_at" | "updated_at" | "created_by_id" | "updated_by_id">;
export type InventoryItemUpdate = Partial<InventoryItemCreate>;
