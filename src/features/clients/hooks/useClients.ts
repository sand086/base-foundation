import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
// 1. ✨ Magia: Importamos TODO desde la carpeta generada (Modelos, Servicios y Errores)
import { DefaultService, ClientResponse, ApiError } from "@/api/generated";
// (Nota: si tu endpoint no está en DefaultService, escribe "Service" y VS Code te autocompletará el correcto)

export const useClients = () => {
  // 2. ✨ Usamos el tipo exacto que escupió tu backend (ClientResponse)
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      // 3. ✨ Cero Axios manual: Llamamos al servicio generado.
      // (Borra "readClients" y presiona Ctrl + Espacio para que VS Code te sugiera el nombre exacto que le dio FastAPI)
      const data = await DefaultService.readClientsApiClientsGet();

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

  const deleteClient = async (id: number) => {
    try {
      // 4. ✨ Otro endpoint generado
      await DefaultService.deleteClientApiClientsClientIdDelete(id);
      toast.success("Cliente eliminado");
      fetchClients(); // Recargar lista para asegurar sincronía
      return true;
    } catch (error) {
      console.error("Error eliminando cliente:", error);

      let message = "Error al eliminar cliente";

      // 5. ✨ Manejo de errores seguro:
      // La carpeta generada usa "ApiError" en lugar de "AxiosError"
      if (error instanceof ApiError) {
        // En FastAPI, el detalle del error viene en error.body.detail
        message = error.body?.detail || message;
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
