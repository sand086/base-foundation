import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  maintenanceService,
  InventoryItem,
  Mechanic,
  WorkOrder,
  CreateInventoryPayload,
  CreateWorkOrderPayload,
} from "@/services/maintenanceService";

export const useMaintenance = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invData, mechData, woData] = await Promise.all([
        maintenanceService.getInventory(),
        maintenanceService.getMechanics(),
        maintenanceService.getWorkOrders(),
      ]);

      setInventory(invData);
      setMechanics(mechData);
      setWorkOrders(woData);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos de mantenimiento");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- ACTIONS: INVENTARIO ---
  const createItem = async (item: CreateInventoryPayload) => {
    try {
      await maintenanceService.createInventoryItem(item);
      toast.success("Refacción agregada");
      fetchData(); // Recargar
      return true;
    } catch (error) {
      toast.error("Error al crear refacción");
      return false;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await maintenanceService.deleteInventoryItem(id);
      toast.success("Refacción eliminada");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  // --- ACTIONS: ORDENES ---
  const createWorkOrder = async (order: CreateWorkOrderPayload) => {
    try {
      await maintenanceService.createWorkOrder(order);
      toast.success("Orden de trabajo creada");
      fetchData(); // Actualiza inventario y lista de ordenes
      return true;
    } catch (error) {
      toast.error("Error al crear orden");
      return false;
    }
  };

  return {
    inventory,
    mechanics,
    workOrders,
    isLoading,
    refresh: fetchData,
    createItem,
    deleteItem,
    createWorkOrder,
  };
};
