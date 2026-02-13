import { useState, useEffect, useCallback } from "react";
// Asegúrate de importar AxiosError si usas axios, o usa 'any' controladamente
import { AxiosError } from "axios";
import { unitService, Unidad } from "@/services/unitService";
import { toast } from "sonner";

export const useUnits = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Función de carga de datos
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

  // Carga inicial
  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // --- CRUD OPERATIONS ---

  const createUnit = async (unidad: Omit<Unidad, "id">) => {
    try {
      await unitService.create(unidad);
      toast.success("Unidad creada exitosamente");
      // Esperamos a que se refresque la lista antes de devolver true
      await fetchUnits();
      return true;
    } catch (error: any) {
      const err = error as AxiosError<{ detail: string }>;
      const message = err.response?.data?.detail || "Error al crear unidad";
      toast.error(message);
      return false;
    }
  };

  // NOTA: Cambiado 'id: string' a 'id: number'
  const updateUnit = async (id: number, unidad: Partial<Unidad>) => {
    try {
      await unitService.update(id, unidad);
      toast.success("Unidad actualizada");
      await fetchUnits();
      return true;
    } catch (error: any) {
      const err = error as AxiosError<{ detail: string }>;
      const message =
        err.response?.data?.detail || "Error al actualizar unidad";
      toast.error(message);
      return false;
    }
  };

  // NOTA: Cambiado 'id: string' a 'id: number'
  const deleteUnit = async (id: number) => {
    try {
      await unitService.delete(id);
      toast.success("Unidad eliminada");
      await fetchUnits();
      return true;
    } catch (error: any) {
      const err = error as AxiosError<{ detail: string }>;
      const message = err.response?.data?.detail || "Error al eliminar unidad";
      toast.error(message);
      return false;
    }
  };

  // --- CARGA MASIVA ---

  const importBulkUnits = async (file: File) => {
    setIsUploading(true);
    try {
      const response = await unitService.importBulk(file);

      // Ajuste para manejar diferentes formatos de respuesta del backend
      const count = response.records || response.inserted || 0;
      toast.success(`Carga exitosa: ${count} unidades procesadas`);

      await fetchUnits();
      return true;
    } catch (error: any) {
      const err = error as AxiosError<{ detail: string }>;
      const message =
        err.response?.data?.detail || "Error al procesar el archivo";
      toast.error(message);
      return false;
    } finally {
      setIsUploading(false);
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
    refreshUnits: fetchUnits,
  };
};
