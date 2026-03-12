import axiosClient from "@/api/axiosClient";
import { TollBooth, RateTemplate } from "@/types/api.types";

// Tipos para la creación (Payloads)
export interface RateSegmentCreate {
  nombre_segmento: string;
  estado: string;
  carretera: string;
  distancia_km: number;
  tiempo_minutos: number;
  toll_booth_id: number | null;
  orden: number;
  costo_s: number; // El backend lo mapeará a costo_momento_sencillo
  costo_f: number; // El backend lo mapeará a costo_momento_full
}

export interface RateTemplateCreate {
  client_id: number;
  origen: string;
  destino: string;
  tipo_unidad: string;
  segments: RateSegmentCreate[];
}

export const tollService = {
  // --- GESTIÓN DE CASETAS (CATÁLOGO) ---
  getTolls: async (search?: string): Promise<TollBooth[]> => {
    const params = search ? { search } : {};
    const { data } = await axiosClient.get<TollBooth[]>("/tolls", { params });
    return data;
  },

  createToll: async (toll: Partial<TollBooth>): Promise<TollBooth> => {
    const { data } = await axiosClient.post<TollBooth>("/tolls", toll);
    return data;
  },

  updateToll: async (
    id: number,
    toll: Partial<TollBooth>,
  ): Promise<TollBooth> => {
    const { data } = await axiosClient.put<TollBooth>(`/tolls/${id}`, toll);
    return data;
  },

  deleteToll: async (id: number): Promise<void> => {
    await axiosClient.delete(`/tolls/${id}`);
  },

  // --- GESTIÓN DE TARIFAS AUTORIZADAS (ARMADOR) ---

  //  Obtener todas las plantillas (Incluye los segments por defecto)
  getTemplates: async (
    search?: string,
    clientId?: number,
  ): Promise<RateTemplate[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (clientId) params.client_id = clientId; // Enviar el ID del cliente al backend

    const { data } = await axiosClient.get<RateTemplate[]>("/rate-templates", {
      params,
    });
    return data;
  },

  updateTemplate: async (id: number, payload: any): Promise<RateTemplate> => {
    const cleanPayload = {
      ...payload,
      origen: payload.origen?.trim().toUpperCase(),
      destino: payload.destino?.trim().toUpperCase(),
    };
    const { data } = await axiosClient.put<RateTemplate>(
      `/rate-templates/${id}`,
      cleanPayload,
    );
    return data;
  },

  //  Guardar nueva ruta autorizada
  saveTemplate: async (payload: RateTemplateCreate): Promise<RateTemplate> => {
    // Senior Tip: Limpiamos los strings antes de enviar
    const cleanPayload = {
      ...payload,
      origen: payload.origen.trim().toUpperCase(),
      destino: payload.destino.trim().toUpperCase(),
    };
    const { data } = await axiosClient.post<RateTemplate>(
      "/rate-templates",
      cleanPayload,
    );
    return data;
  },

  //  Eliminar tarifa
  deleteTemplate: async (id: number): Promise<void> => {
    await axiosClient.delete(`/rate-templates/${id}`);
  },

  // Obtener detalle de una sola ruta (por si necesitas ver el reporte SCT individual)
  getTemplateById: async (id: number): Promise<RateTemplate> => {
    const { data } = await axiosClient.get<RateTemplate>(
      `/rate-templates/${id}`,
    );
    return data;
  },
};
