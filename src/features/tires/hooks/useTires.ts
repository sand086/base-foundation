import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FleetTiresService } from "@/api/generated";
import { ApiError } from "@/api/generated/core/ApiError";
import type { AssignTirePayload, MaintenanceTirePayload } from "@/api/generated";
import { Tire } from "@/features/tires/types";

export const useTires = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTires = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await FleetTiresService.readTiresApiFleetTiresGet();
      setTires(data as Tire[]);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar inventario de llantas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTires();
  }, [fetchTires]);

  const assignTire = async (tireId: number, payload: AssignTirePayload) => {
    try {
      await FleetTiresService.assignTireApiFleetTiresTireIdAssignPost(Number(tireId), payload);
      const accion = payload.unit_id ? "asignada" : "enviada a almacén";
      toast.success(`Llanta ${accion} correctamente`);
      fetchTires();
      return true;
    } catch (error) {
      let msg = "Error al asignar llanta";
      if (error instanceof ApiError && error.body?.detail) {
        msg = error.body.detail;
      }
      toast.error(msg);
      return false;
    }
  };

  const registerMaintenance = async (tireId: number, payload: MaintenanceTirePayload) => {
    try {
      await FleetTiresService.maintenanceTireApiFleetTiresTireIdMaintenancePost(Number(tireId), payload);
      toast.success("Maintenance registrado");
      fetchTires();
      return true;
    } catch (error) {
      let msg = "Error al registrar mantenimiento";
      if (error instanceof ApiError && error.body?.detail) {
        msg = error.body.detail;
      }
      toast.error(msg);
      return false;
    }
  };

  const createTire = async (tireData: any) => {
    try {
      await FleetTiresService.createTireApiFleetTiresPost(tireData);
      toast.success("Llanta dada de alta");
      fetchTires();
      return true;
    } catch (error) {
      const msg = error instanceof ApiError ? error.body?.detail : "Error al crear llanta";
      toast.error(msg || "Error al crear llanta");
      return false;
    }
  };

  const updateTire = async (id: number, data: any) => {
    try {
      await FleetTiresService.updateTireApiFleetTiresTireIdPut(Number(id), data);
      toast.success("Llanta actualizada correctamente");
      fetchTires();
      return true;
    } catch (error) {
      const msg = error instanceof ApiError ? error.body?.detail : "Error al actualizar llanta";
      toast.error(msg || "Error al actualizar llanta");
      return false;
    }
  };

  const deleteTire = async (id: number) => {
    try {
      await FleetTiresService.deleteTireApiFleetTiresTireIdDelete(Number(id));
      toast.success("Llanta eliminada del sistema");
      fetchTires();
      return true;
    } catch (error) {
      const msg = error instanceof ApiError ? error.body?.detail : "No se puede eliminar la llanta";
      toast.error(msg || "No se puede eliminar la llanta");
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
