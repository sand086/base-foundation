import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";
import { RutaAutorizada } from "@/types/api.types";
import { toast } from "sonner";

export const useRutasAutorizadas = () => {
  const [rutas, setRutas] = useState<RutaAutorizada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRutas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } =
        await axiosClient.get<RutaAutorizada[]>("/catalogs/routes");
      setRutas(data);
    } catch (error) {
      toast.error("Error al cargar el catálogo de rutas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRutas();
  }, [fetchRutas]);

  const addRuta = async (ruta: Omit<RutaAutorizada, "id">) => {
    try {
      await axiosClient.post("/catalogs/routes", ruta);
      fetchRutas();
      return true;
    } catch (error) {
      toast.error("Error al crear la ruta");
      return false;
    }
  };

  const updateRuta = async (id: number, ruta: Partial<RutaAutorizada>) => {
    try {
      await axiosClient.put(`/catalogs/routes/${id}`, ruta);
      fetchRutas();
      return true;
    } catch (error) {
      toast.error("Error al actualizar la ruta");
      return false;
    }
  };

  const deleteRuta = async (id: number) => {
    try {
      await axiosClient.delete(`/catalogs/routes/${id}`);
      fetchRutas();
      return true;
    } catch (error) {
      toast.error("No se pudo eliminar la ruta. Puede estar en uso.");
      return false;
    }
  };

  const toggleRutaActivo = async (id: number, currentState: boolean) => {
    return updateRuta(id, { activo: !currentState });
  };

  return {
    rutas,
    isLoading,
    addRuta,
    updateRuta,
    deleteRuta,
    toggleRutaActivo,
    refreshRutas: fetchRutas,
  };
};
