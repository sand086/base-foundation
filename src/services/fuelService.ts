import axiosClient from "@/api/axiosClient";

export const fuelService = {
  // Obtener historial real
  getAll: async () => {
    const { data } = await axiosClient.get("/fuel/fuel-logs");
    return data;
  },

  // Crear registro con Imagen (FormData)
  create: async (formData: any) => {
    const dataToSend = new FormData();

    // Mapeamos el objeto plano a FormData de forma SEGURA
    Object.keys(formData).forEach((key) => {
      const value = formData[key];

      // Manejo de la imagen
      if (key === "evidencia" && value) {
        dataToSend.append("file", value);
      }
      // Solo enviamos campos que tengan un valor real (evita mandar "null" o "")
      else if (value !== null && value !== undefined && value !== "") {
        dataToSend.append(key, value);
      }
    });

    const { data } = await axiosClient.post("/fuel/fuel-logs", dataToSend, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  update: async (id: number | string, data: any) => {
    const { data: response } = await axiosClient.put(
      `/fuel/fuel-logs/${id}`,
      data,
    );
    return response;
  },

  uploadDocument: async (logId: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post(
      `/fuel/fuel-logs/${logId}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  delete: async (id: string | number) => {
    const { data } = await axiosClient.delete(`/fuel/fuel-logs/${id}`);
    return data;
  },
};
