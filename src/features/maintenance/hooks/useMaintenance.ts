import { useState, useEffect, useCallback } from "react";
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
}

export const useMaintenance = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invData, woData, mechData] = await Promise.all([
        MaintenanceService.readInventoryApiMaintenanceInventoryGet(),
        MaintenanceService.readWorkOrdersApiMaintenanceWorkOrdersGet(),
        MaintenanceService.readMechanicsApiMaintenanceMechanicsGet(),
      ]);
      setInventory(invData as InventoryItem[]);
      setWorkOrders(woData as WorkOrder[]);
      setMechanics(mechData as any[]);
    } catch (err) {
      console.error("Error fetching maintenance data", err);
      setError("Error al cargar datos de mantenimiento");
      console.error("Error de conexión", {
        description: "No se pudo cargar el inventario.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createItem = async (item: CreateInventoryPayload) => {
    try {
      const newItem =
        await MaintenanceService.createInventoryItemApiMaintenanceInventoryPost(
          item as any,
        );
      setInventory((prev) => [newItem as InventoryItem, ...prev]);
      return true;
    } catch (err) {
      console.error("Error al crear", {
        description: "Verifica que el SKU no exista.",
      });
      return false;
    }
  };

  const updateItem = async (id: number, item: any) => {
    try {
      const updatedItem =
        await MaintenanceService.updateInventoryItemApiMaintenanceInventoryItemIdPut(
          Number(id),
          item,
        );
      setInventory((prev) =>
        prev.map((i) => (i.id === id ? (updatedItem as InventoryItem) : i)),
      );
      toast.success("Refacción actualizada", {
        description: `${updatedItem.sku} - ${updatedItem.descripcion}`,
      });
      return true;
    } catch (err) {
      console.error(err);
      console.error("Error al actualizar", {
        description: "No se pudieron guardar los cambios.",
      });
      return false;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await MaintenanceService.deleteInventoryItemApiMaintenanceInventoryItemIdDelete(
        Number(id),
      );
      setInventory((prev) => prev.filter((item) => item.id !== id));
      toast.success("Eliminado", {
        description: "Refacción eliminada correctamente.",
      });
    } catch (err) {
      console.error("Error", { description: "No se pudo eliminar el item." });
    }
  };

  const createWorkOrder = async (order: CreateWorkOrderPayload) => {
    try {
      const newOrder =
        await MaintenanceService.createWorkOrderApiMaintenanceWorkOrdersPost(
          order as any,
        );
      setWorkOrders((prev) => [newOrder as WorkOrder, ...prev]);
      const updatedInventory =
        await MaintenanceService.readInventoryApiMaintenanceInventoryGet();
      setInventory(updatedInventory as InventoryItem[]);
      toast.success("Orden Creada", {
        description: `Folio: ${newOrder.folio}`,
      });
      return true;
    } catch (err) {
      console.error("Error", {
        description: "No se pudo crear la orden de trabajo.",
      });
      return false;
    }
  };

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      const updatedOrder =
        await MaintenanceService.updateOrderStatusApiMaintenanceWorkOrdersOrderIdStatusPatch(
          Number(id),
          { status } as any,
        );
      setWorkOrders((prev) =>
        prev.map((o) => (o.id === id ? (updatedOrder as WorkOrder) : o)),
      );
      if (status === "cancelada") {
        const updatedInventory =
          await MaintenanceService.readInventoryApiMaintenanceInventoryGet();
        setInventory(updatedInventory as InventoryItem[]);
      }
      toast.success(
        `Orden ${status === "cerrada" ? "Finalizada" : "Cancelada"}`,
      );
      return true;
    } catch (error) {
      console.error("Error al actualizar la orden");
      return false;
    }
  };

  return {
    inventory,
    workOrders,
    mechanics,
    isLoading,
    error,
    refresh: fetchData,
    createItem,
    updateItem,
    deleteItem,
    createWorkOrder,
    updateOrderStatus,
  };
};
