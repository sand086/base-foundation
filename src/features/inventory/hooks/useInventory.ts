import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { InventoryItem } from "../types";

export const useInventory = (skip = 0, limit = 100) => {
  const {
    data: inventoryItems = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["inventory", skip, limit],
    queryFn: async () => {
      // 🚀 Esta ruta coincide con tu backend: @router.get("/inventory")
      const { data } = await axiosClient.get<InventoryItem[]>(
        `/inventory?skip=${skip}&limit=${limit}`,
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    inventoryItems,
    isLoading,
    isError,
    refreshInventory: refetch,
  };
};
