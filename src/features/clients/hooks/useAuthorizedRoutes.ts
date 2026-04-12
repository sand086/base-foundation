import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";
import { AuthorizedRoute } from "../types";
import { toast } from "sonner";

export const useAuthorizedRoutes = () => {
  const [rutas, setRutas] = useState<AuthorizedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRutas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosClient.get<AuthorizedRoute[]>(
        "/api/catalogs/routes",
      );
      setRutas(data);
    } catch (error) {
      console.error("Error al cargar el catálogo de rutas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRutas();
  }, [fetchRutas]);

  const addRuta = async (ruta: Omit<AuthorizedRoute, "id">) => {
    try {
      await axiosClient.post("/api/catalogs/routes", ruta);
      fetchRutas();
      return true;
    } catch (error) {
      console.error("Error al crear la ruta");
      return false;
    }
  };

  const updateRuta = async (id: number, ruta: Partial<AuthorizedRoute>) => {
    try {
      await axiosClient.put(`/api/catalogs/routes/${id}`, ruta);
      fetchRutas();
      return true;
    } catch (error) {
      console.error("Error al actualizar la ruta");
      return false;
    }
  };

  const deleteRuta = async (id: number) => {
    try {
      await axiosClient.delete(`api/catalogs/routes/${id}`);
      fetchRutas();
      return true;
    } catch (error) {
      console.error("No se pudo eliminar la ruta. Puede estar en uso.");
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
