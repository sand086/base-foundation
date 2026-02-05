import { useState, useEffect, useCallback } from "react";
import { unitService, Unidad } from "@/services/unitService";
import { toast } from "sonner";

export const useUnits = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Estado específico para cargas masivas para mostrar spinners diferentes si es necesario
  const [isUploading, setIsUploading] = useState(false);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await unitService.getAll();
      setUnidades(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la flota");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const createUnit = async (unidad: Omit<Unidad, "id">) => {
    try {
      await unitService.create(unidad);
      toast.success("Unidad creada exitosamente");
      fetchUnits();
      return true;
    } catch (error: any) {
      // Capturamos el mensaje específico del backend (ej: "El número económico ya existe")
      const message = error.response?.data?.detail || "Error al crear unidad";
      toast.error(message);
      return false;
    }
  };

  const updateUnit = async (id: string, unidad: Partial<Unidad>) => {
    try {
      await unitService.update(id, unidad);
      toast.success("Unidad actualizada");
      fetchUnits();
      return true;
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Error al actualizar unidad";
      toast.error(message);
      return false;
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      await unitService.delete(id);
      toast.success("Unidad eliminada");
      fetchUnits();
      return true;
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Error al eliminar unidad";
      toast.error(message);
      return false;
    }
  };

  // --- NUEVA FUNCIÓN PARA CARGA MASIVA ---
  const importBulkUnits = async (file: File) => {
    setIsUploading(true);
    try {
      // El servicio se encarga de crear el FormData
      const response = await unitService.importBulk(file);

      const count = response.records || response.inserted || 0;
      toast.success(`Carga exitosa: ${count} unidades procesadas`);

      // Refrescamos la lista inmediatamente para ver los nuevos datos
      await fetchUnits();
      return true;
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Error al procesar el archivo";
      toast.error(message);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    unidades,
    isLoading,
    isUploading, // Exportamos estado de carga
    createUnit,
    updateUnit,
    deleteUnit,
    importBulkUnits, // Exportamos la nueva función
    refreshUnits: fetchUnits,
  };
};
