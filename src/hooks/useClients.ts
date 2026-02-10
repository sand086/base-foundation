import { useState, useEffect, useCallback } from "react";
import { clientService } from "@/services/clientService";
import { Client } from "@/types/api.types"; // <--- Importar desde tipos centrales
import { toast } from "sonner";
import { AxiosError } from "axios";

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar clients");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // CORRECCIÓN: id ahora es number
  const deleteClient = async (id: number) => {
    try {
      await clientService.deleteClient(id);
      toast.success("Client eliminado");
      fetchClients(); // Recargar lista para asegurar sincronía
      return true;
    } catch (error) {
      console.error("Error eliminando cliente:", error);

      let message = "Error al eliminar cliente";

      // Manejo de errores seguro
      if (error instanceof AxiosError) {
        // Si el backend envía un detalle específico (ej: "Tiene viajes activos")
        message = error.response?.data?.detail || message;
      }

      toast.error(message);
      return false;
    }
  };

  return {
    clients,
    isLoading,
    fetchClients,
    deleteClient,
  };
};
