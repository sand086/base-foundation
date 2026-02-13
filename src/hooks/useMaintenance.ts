import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  maintenanceService,
  InventoryItem,
  WorkOrder,
  CreateInventoryPayload,
  CreateWorkOrderPayload,
} from "@/services/maintenanceService";

export const useMaintenance = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]); // Tipar según tu interfaz Mechanic
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invData, woData, mechData] = await Promise.all([
        maintenanceService.getInventory(),
        maintenanceService.getWorkOrders(),
        maintenanceService.getMechanics(),
      ]);
      setInventory(invData);
      setWorkOrders(woData);
      setMechanics(mechData);
    } catch (err) {
      console.error("Error fetching maintenance data", err);
      setError("Error al cargar datos de mantenimiento");
      toast.error("Error de conexión", {
        description: "No se pudo cargar el inventario.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- ACCIONES DE INVENTARIO ---

  const createItem = async (item: CreateInventoryPayload) => {
    try {
      const newItem = await maintenanceService.createInventoryItem(item);
      setInventory((prev) => [newItem, ...prev]);
      return true;
    } catch (err) {
      toast.error("Error al crear", {
        description: "Verifica que el SKU no exista.",
      });
      return false;
    }
  };

  const updateItem = async (id: number, item: any) => {
    try {
      const updatedItem = await maintenanceService.updateInventoryItem(
        id,
        item,
      );

      // Actualizamos el estado local reemplazando el item viejo por el nuevo
      setInventory((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));

      toast.success("Refacción actualizada", {
        description: `${updatedItem.sku} - ${updatedItem.descripcion}`,
      });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar", {
        description: "No se pudieron guardar los cambios.",
      });
      return false;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await maintenanceService.deleteInventoryItem(id);
      setInventory((prev) => prev.filter((item) => item.id !== id));
      toast.success("Eliminado", {
        description: "Refacción eliminada correctamente.",
      });
    } catch (err) {
      toast.error("Error", { description: "No se pudo eliminar el item." });
    }
  };

  // --- ACCIONES DE ÓRDENES DE TRABAJO ---

  const createWorkOrder = async (order: CreateWorkOrderPayload) => {
    try {
      const newOrder = await maintenanceService.createWorkOrder(order);
      // Al crear una orden, el inventario cambia en el backend, hay que recargar o actualizar localmente
      setWorkOrders((prev) => [newOrder, ...prev]);

      // Opción A: Recargar todo el inventario (Más seguro)
      const updatedInventory = await maintenanceService.getInventory();
      setInventory(updatedInventory);

      toast.success("Orden Creada", {
        description: `Folio: ${newOrder.folio}`,
      });
      return true;
    } catch (err) {
      toast.error("Error", {
        description: "No se pudo crear la orden de trabajo.",
      });
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
  };
};
