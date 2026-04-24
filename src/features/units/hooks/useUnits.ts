import { useState, useEffect, useCallback } from "react";
import { FleetUnitsService, DefaultService } from "@/api/generated";
import { ApiError } from "@/api/generated/core/ApiError";
import { Unit } from "@/features/units/types";
import { toast } from "sonner";

export const useUnits = () => {
  const [unidades, setUnidades] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await FleetUnitsService.readUnitsApiFleetUnitsGet();
      setUnidades(data as Unit[]);
    } catch (error) {
      console.error(error);
      console.error("Error al cargar la flota");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const createUnit = async (unidad: any) => {
    try {
      await FleetUnitsService.createUnitApiFleetUnitsPost(unidad);
      toast.success("Unidad creada exitosamente");
      await fetchUnits();
      return true;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "Error al crear unidad";
      console.error(msg || "Error al crear unidad");
      return false;
    }
  };

  const updateUnit = async (id: number, unidad: any) => {
    try {
      await FleetUnitsService.updateUnitApiFleetUnitsUnitIdPut(
        String(id),
        unidad,
      );
      toast.success("Unidad actualizada");
      await fetchUnits();
      return true;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "Error al actualizar unidad";
      console.error(msg || "Error al actualizar unidad");
      return false;
    }
  };

  const deleteUnit = async (id: number) => {
    try {
      await FleetUnitsService.deleteUnitApiFleetUnitsUnitIdDelete(String(id));
      toast.success("Unidad eliminada");
      await fetchUnits();
      return true;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "Error al eliminar unidad";
      console.error(msg || "Error al eliminar unidad");
      return false;
    }
  };

  const updateLoadStatus = async (id: number, isLoaded: boolean) => {
    try {
      setUnidades((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_loaded: isLoaded } : u)),
      );
      await FleetUnitsService.updateUnitLoadStatusApiFleetUnitsUnitIdLoadStatusPatch(
        Number(id),
        isLoaded,
      );
      return true;
    } catch (error) {
      console.error("Error al actualizar estado en el servidor");
      fetchUnits();
      return false;
    }
  };

  const importBulkUnits = async (file: File) => {
    setIsUploading(true);
    try {
      const response =
        await FleetUnitsService.uploadUnitsBulkApiFleetUnitsBulkUploadPost({
          file,
        });
      const count = (response as any)?.records || 0;
      toast.success(`Carga exitosa: ${count} unidades procesadas`);
      await fetchUnits();
      return true;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "Error al procesar el archivo";
      console.error(msg || "Error al procesar el archivo");
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // 🚀 FIX: Usando el servicio oficial generado por OpenAPI
  const fetchLastOdometer = async (
    unitId: string | number,
  ): Promise<number> => {
    try {
      if (!unitId) return 0;

      // Llamada directa al API client generado
      const res =
        await DefaultService.getUnitLastOdometerApiFleetUnitsUnitIdLastOdometerGet(
          Number(unitId),
        );

      // En los clientes generados, la data suele venir en la raíz del objeto de respuesta
      return Number(res?.last_odometer || 0);
    } catch (error) {
      console.error("Error obteniendo último odómetro:", error);
      return 0; // Si falla, retorna 0 por seguridad para no bloquear el sistema
    }
  };

  return {
    unidades,
    isLoading,
    isUploading,
    createUnit,
    updateUnit,
    deleteUnit,
    importBulkUnits,
    updateLoadStatus,
    fetchLastOdometer, // Exportamos la función conectada
    refreshUnits: fetchUnits,
  };
};
