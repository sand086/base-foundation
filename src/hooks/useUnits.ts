import { useState, useEffect, useCallback } from "react";
import { unitService, Unidad } from "@/services/unitService";
import { toast } from "sonner";

export const useUnits = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const createUnit = async (unidad: Unidad) => {
    try {
      await unitService.create(unidad);
      toast.success("Unidad creada exitosamente");
      fetchUnits();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear unidad");
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
      toast.error("Error al actualizar unidad");
      return false;
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      await unitService.delete(id);
      toast.success("Unidad eliminada");
      fetchUnits();
      return true;
    } catch (error) {
      toast.error("Error al eliminar unidad");
      return false;
    }
  };

  return {
    unidades,
    isLoading,
    createUnit,
    updateUnit,
    deleteUnit,
    refreshUnits: fetchUnits,
  };
};
