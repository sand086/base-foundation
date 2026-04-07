import { useQuery } from "@tanstack/react-query";
import { MaintenanceService } from "@/api/generated";
import { InventoryItem } from "@/features/inventory/types";

export const useInventory = (skip = 0, limit = 100) => {
  const {
    data: inventoryItems = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["inventory", skip, limit],
    queryFn: async () => {
      const data = await MaintenanceService.readInventoryApiMaintenanceInventoryGet(skip, limit);
      return data as InventoryItem[];
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
