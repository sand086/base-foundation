import { MaintenanceService } from "@/api/generated";
import {
  InventoryItem,
  InventoryItemCreate,
  InventoryItemUpdate,
} from "../types";

export const inventoryService = {
  getInventory: async (skip = 0, limit = 100): Promise<InventoryItem[]> => {
    const data = await MaintenanceService.readInventoryApiMaintenanceInventoryGet(skip, limit);
    return data as InventoryItem[];
  },

  createItem: async (item: InventoryItemCreate): Promise<InventoryItem> => {
    const data = await MaintenanceService.createInventoryItemApiMaintenanceInventoryPost(item as any);
    return data as InventoryItem;
  },

  updateItem: async (id: number, item: InventoryItemUpdate): Promise<InventoryItem> => {
    const data = await MaintenanceService.updateInventoryItemApiMaintenanceInventoryItemIdPut(Number(id), item as any);
    return data as InventoryItem;
  },

  deleteItem: async (id: number): Promise<void> => {
    await MaintenanceService.deleteInventoryItemApiMaintenanceInventoryItemIdDelete(Number(id));
  },
};
