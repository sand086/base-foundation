import { useState, useEffect, useCallback } from "react";
import { clientService, Client } from "@/services/clientService";
import { toast } from "sonner";

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
      toast.error("Error al cargar clientes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const deleteClient = async (id: string) => {
    try {
      await clientService.deleteClient(id);
      toast.success("Cliente eliminado");
      fetchClients(); // Recargar lista
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al eliminar cliente");
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
