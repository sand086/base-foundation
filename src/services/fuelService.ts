import axiosClient from "@/api/axiosClient";
import { CargaCombustible } from "@/data/combustibleData";

export const fuelService = {
  // Obtener historial real
  getAll: async () => {
    const { data } = await axiosClient.get<any[]>("/fuel-logs");
    // Mapeamos lo que viene del backend al formato que espera tu componente
    return data.map((log) => ({
      id: log.id.toString(),
      fechaHora: log.fecha_hora,
      unidadId: log.unit_id,
      unidadNumero: log.unit?.numero_economico || "N/A",
      operadorId: log.operator_id,
      operadorNombre: log.operator?.name || "N/A",
      estacion: log.estacion,
      tipoCombustible: log.tipo_combustible,
      litros: log.litros,
      precioPorLitro: log.precio_por_litro,
      total: log.total,
      odometro: log.odometro,
      tieneEvidencia: !!log.evidencia_url,
      evidenciaUrl: log.evidencia_url,
      excedeTanque: log.excede_tanque,
      capacidadTanque: log.capacidad_tanque_snapshot,
    }));
  },

  // Crear registro con Imagen (FormData)
  create: async (formData: any) => {
    const body = new FormData();

    // Iteramos sobre el objeto y lo metemos al FormData
    Object.keys(formData).forEach((key) => {
      if (key === "evidencia" && formData[key]) {
        // 'file' es el nombre que pusimos en el backend de FastAPI
        body.append("file", formData[key]);
      } else if (formData[key] !== null && formData[key] !== undefined) {
        body.append(key, formData[key]);
      }
    });

    const { data } = await axiosClient.post("/fuel-logs", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  delete: async (id: string) => {
    await axiosClient.delete(`/fuel-logs/${id}`);
  },
};
