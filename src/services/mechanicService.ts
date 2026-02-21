import axiosClient from "@/api/axiosClient";
import { Mechanic, MechanicDocument } from "@/types/api.types";

export const mechanicService = {
  // Obtener todos los mecánicos
  getAll: async () => {
    // CORRECCIÓN: Agregado el prefijo /maintenance
    const { data } = await axiosClient.get<Mechanic[]>(
      "/maintenance/mechanics",
    );
    return data;
  },

  // Obtener un mecánico por ID (necesario para recargar datos específicos)
  getById: async (id: number) => {
    const { data } = await axiosClient.get<Mechanic>(
      `/maintenance/mechanics/${id}`,
    );
    return data;
  },

  // Crear mecánico
  create: async (mechanic: Partial<Mechanic>) => {
    const { data } = await axiosClient.post<Mechanic>(
      "/maintenance/mechanics",
      mechanic,
    );
    return data;
  },

  // Actualizar mecánico
  update: async (id: number, mechanic: Partial<Mechanic>) => {
    const { data } = await axiosClient.put<Mechanic>(
      `/maintenance/mechanics/${id}`,
      mechanic,
    );
    return data;
  },

  // Eliminar mecánico (Soft delete o físico según backend)
  delete: async (id: number) => {
    await axiosClient.delete(`/maintenance/mechanics/${id}`);
  },

  // --- DOCUMENTOS (Expediente) ---

  // Obtener documentos de un mecánico
  // NOTA: Asegúrate de que este endpoint exista en tu backend o usa getById si los documentos vienen anidados
  getDocuments: async (id: number) => {
    const { data } = await axiosClient.get<MechanicDocument[]>(
      `/maintenance/mechanics/${id}/documents`,
    );
    return data;
  },

  // Subir documento al expediente
  uploadDocument: async (id: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post(
      `/maintenance/mechanics/${id}/documents/${docType}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  // Eliminar documento
  deleteDocument: async (docId: number) => {
    await axiosClient.delete(`/maintenance/mechanics/documents/${docId}`);
  },
};
