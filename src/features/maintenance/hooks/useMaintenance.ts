import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MaintenanceService } from "@/api/generated";
import { InventoryItem } from "@/features/inventory/types";
import { WorkOrder } from "@/features/maintenance/types";

interface CreateInventoryPayload {
  sku: string;
  descripcion: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string;
  precio_unitario: number;
}

interface CreateWorkOrderPayload {
  unit_id: number;
  mechanic_id?: number;
  descripcion_problema: string;
  parts: { inventory_item_id: number; cantidad: number }[];
  tipo_mantenimiento?: string;
}

export const useMaintenance = () => {
  const queryClient = useQueryClient();

  // ===========================
  // QUERIES (Sincronización en tiempo real)
  // ===========================
  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: () => MaintenanceService.readInventoryApiMaintenanceInventoryGet(),
    staleTime: 1000 * 60 * 5,
  });

  const workOrdersQuery = useQuery({
    queryKey: ["workOrders"],
    queryFn: () =>
      MaintenanceService.readWorkOrdersApiMaintenanceWorkOrdersGet(),
    staleTime: 1000 * 60 * 5,
  });

  const mechanicsQuery = useQuery({
    queryKey: ["mechanics"],
    queryFn: () => MaintenanceService.readMechanicsApiMaintenanceMechanicsGet(),
    staleTime: 1000 * 60 * 5,
  });

  // ===========================
  // MUTATIONS - INVENTARIO
  // ===========================
  const createItemMut = useMutation({
    mutationFn: (item: CreateInventoryPayload) =>
      MaintenanceService.createInventoryItemApiMaintenanceInventoryPost(
        item as any,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const updateItemMut = useMutation({
    mutationFn: ({ id, item }: { id: number; item: any }) =>
      MaintenanceService.updateInventoryItemApiMaintenanceInventoryItemIdPut(
        id,
        item,
      ),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Refacción actualizada", {
        description: `${updatedItem.sku} - ${updatedItem.descripcion}`,
      });
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: number) =>
      MaintenanceService.deleteInventoryItemApiMaintenanceInventoryItemIdDelete(
        id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Eliminado", {
        description: "Refacción eliminada correctamente.",
      });
    },
  });

  // ===========================
  // MUTATIONS - ÓRDENES DE TRABAJO
  // ===========================
  const createWorkOrderMut = useMutation({
    mutationFn: (order: CreateWorkOrderPayload) =>
      MaintenanceService.createWorkOrderApiMaintenanceWorkOrdersPost(
        order as any,
      ),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Sincroniza stock
      toast.success("Orden Creada", {
        description: `Folio: ${newOrder.folio}`,
      });
    },
  });

  const updateOrderStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      MaintenanceService.updateOrderStatusApiMaintenanceWorkOrdersOrderIdStatusPatch(
        id,
        { status } as any,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      // Si cancela, devuelve piezas al stock y refresca
      if (variables.status === "cancelada") {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }
      toast.success(
        `Orden ${variables.status === "cerrada" ? "Finalizada" : "Cancelada"} con éxito`,
      );
    },
  });

  return {
    inventory: (inventoryQuery.data || []) as InventoryItem[],
    workOrders: (workOrdersQuery.data || []) as WorkOrder[],
    mechanics: (mechanicsQuery.data || []) as any[],
    isLoading:
      inventoryQuery.isLoading ||
      workOrdersQuery.isLoading ||
      mechanicsQuery.isLoading,
    error:
      inventoryQuery.isError || workOrdersQuery.isError
        ? "Error al cargar datos"
        : null,

    refresh: () => {
      inventoryQuery.refetch();
      workOrdersQuery.refetch();
      mechanicsQuery.refetch();
    },

    createItem: async (item: CreateInventoryPayload) => {
      try {
        await createItemMut.mutateAsync(item);
        return true;
      } catch (err) {
        toast.error("Error al crear", {
          description: "Verifica que el SKU no exista.",
        });
        return false;
      }
    },

    updateItem: async (id: number, item: any) => {
      try {
        await updateItemMut.mutateAsync({ id, item });
        return true;
      } catch (err) {
        toast.error("Error al actualizar", {
          description: "No se pudieron guardar los cambios.",
        });
        return false;
      }
    },

    deleteItem: async (id: number) => {
      try {
        await deleteItemMut.mutateAsync(id);
      } catch (err) {
        toast.error("Error", { description: "No se pudo eliminar el item." });
      }
    },

    createWorkOrder: async (order: CreateWorkOrderPayload) => {
      try {
        await createWorkOrderMut.mutateAsync(order);
        return true;
      } catch (err) {
        toast.error("Error", {
          description: "Verifica stock suficiente para las piezas.",
        });
        return false;
      }
    },

    updateOrderStatus: async (id: number, status: string) => {
      try {
        await updateOrderStatusMut.mutateAsync({ id, status });
        return true;
      } catch (err) {
        toast.error("Fallo al actualizar", {
          description: "No se pudo cambiar el estatus de la orden.",
        });
        return false;
      }
    },
  };
};
