import axiosClient from "@/api/axiosClient";
import {
  InventoryItem,
  InventoryItemCreate,
  InventoryItemUpdate,
} from "../types";

export const inventoryService = {
  // Obtener todo el inventario (hace match con GET /inventory)
  getInventory: async (skip = 0, limit = 100): Promise<InventoryItem[]> => {
    const { data } = await axiosClient.get(
      `/inventory?skip=${skip}&limit=${limit}`,
    );
    return data;
  },

  // Crear un nuevo artículo (hace match con POST /inventory)
  createItem: async (item: InventoryItemCreate): Promise<InventoryItem> => {
    const { data } = await axiosClient.post("/inventory", item);
    return data;
  },

  // Actualizar un artículo (hace match con PUT /inventory/{item_id})
  updateItem: async (
    id: number,
    item: InventoryItemUpdate,
  ): Promise<InventoryItem> => {
    const { data } = await axiosClient.put(`/inventory/${id}`, item);
    return data;
  },

  // Eliminar un artículo (hace match con DELETE /inventory/{item_id})
  deleteItem: async (id: number): Promise<void> => {
    await axiosClient.delete(`/inventory/${id}`);
  },
};
