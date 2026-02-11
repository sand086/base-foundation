import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  tireService,
  GlobalTire,
  AssignTirePayload,
  MaintenanceTirePayload,
} from "@/services/tireService";
import { AxiosError } from "axios";

export const useTires = () => {
  const [tires, setTires] = useState<GlobalTire[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar Llantas
  const fetchTires = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await tireService.getAll();
      setTires(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar inventario de llantas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchTires();
  }, [fetchTires]);

  // --- ACCIONES ---

  // 1. Asignar / Rotar
  const assignTire = async (tireId: number, payload: AssignTirePayload) => {
    try {
      await tireService.assign(tireId, payload);
      const accion = payload.unidad_id ? "asignada" : "enviada a almacén";
      toast.success(`Llanta ${accion} correctamente`);
      fetchTires();
      return true;
    } catch (error: unknown) {
      let msg = "Error al asignar llanta";
      if (error instanceof AxiosError && error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
      return false;
    }
  };

  // 2. Mantenimiento
  const registerMaintenance = async (
    tireId: number,
    payload: MaintenanceTirePayload,
  ) => {
    try {
      await tireService.maintenance(tireId, payload);
      toast.success("Mantenimiento registrado");
      fetchTires();
      return true;
    } catch (error: unknown) {
      let msg = "Error al registrar mantenimiento";
      if (error instanceof AxiosError && error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
      return false;
    }
  };

  // 3. Crear
  const createTire = async (tireData: any) => {
    try {
      await tireService.create(tireData);
      toast.success("Llanta dada de alta");
      fetchTires();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear llanta");
      return false;
    }
  };

  // 4. Actualizar (NUEVO)
  const updateTire = async (id: number, data: any) => {
    try {
      await tireService.update(id, data);
      toast.success("Llanta actualizada correctamente");
      fetchTires();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al actualizar llanta");
      return false;
    }
  };

  // 5. Eliminar (NUEVO)
  const deleteTire = async (id: number) => {
    try {
      await tireService.delete(id);
      toast.success("Llanta eliminada del sistema");
      fetchTires();
      return true;
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "No se puede eliminar la llanta",
      );
      return false;
    }
  };

  return {
    tires,
    isLoading,
    fetchTires,
    assignTire,
    registerMaintenance,
    createTire,
    updateTire,
    deleteTire,
  };
};
