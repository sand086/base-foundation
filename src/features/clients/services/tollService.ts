import { LogisticsService } from "@/api/generated";
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
  costo_s: number;
  costo_f: number;
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
    const data = await LogisticsService.listTollsApiLogisticsTollsGet(search || '');
    return data as TollBooth[];
  },

  createToll: async (toll: Partial<TollBooth>): Promise<TollBooth> => {
    const data = await LogisticsService.createTollApiLogisticsTollsPost(toll as any);
    return data as TollBooth;
  },

  updateToll: async (id: number, toll: Partial<TollBooth>): Promise<TollBooth> => {
    const data = await LogisticsService.updateTollApiLogisticsTollsTollIdPut(Number(id), toll as any);
    return data as TollBooth;
  },

  deleteToll: async (id: number, removeFromRoutes: boolean = false): Promise<void> => {
    await LogisticsService.deleteTollApiLogisticsTollsTollIdDelete(Number(id), removeFromRoutes);
  },

  checkDependencies: async (id: number): Promise<{ in_use: boolean; rutas_count: number }> => {
    return await LogisticsService.checkTollDependenciesApiLogisticsTollsTollIdDependenciesGet(Number(id));
  },

  // --- GESTIÓN DE TARIFAS AUTORIZADAS (ARMADOR) ---
  getTemplates: async (search?: string, clientId?: number): Promise<RateTemplate[]> => {
    const data = await LogisticsService.listTemplatesApiLogisticsRateTemplatesGet(search || '', clientId);
    return data as RateTemplate[];
  },

  updateTemplate: async (id: number, payload: any): Promise<RateTemplate> => {
    const cleanPayload = {
      ...payload,
      origen: payload.origen?.trim().toUpperCase(),
      destino: payload.destino?.trim().toUpperCase(),
    };
    const data = await LogisticsService.updateTemplateApiLogisticsRateTemplatesTemplateIdPut(Number(id), cleanPayload);
    return data as RateTemplate;
  },

  saveTemplate: async (payload: RateTemplateCreate): Promise<RateTemplate> => {
    const cleanPayload = {
      ...payload,
      origen: payload.origen.trim().toUpperCase(),
      destino: payload.destino.trim().toUpperCase(),
    };
    const data = await LogisticsService.createTemplateApiLogisticsRateTemplatesPost(cleanPayload as any);
    return data as RateTemplate;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await LogisticsService.deleteTemplateApiLogisticsRateTemplatesTemplateIdDelete(Number(id));
  },

  getTemplateById: async (id: number): Promise<RateTemplate> => {
    // No single-get in generated API; fetch all and filter
    const all = await LogisticsService.listTemplatesApiLogisticsRateTemplatesGet();
    const found = (all as RateTemplate[]).find((t) => t.id === id);
    if (!found) throw new Error(`Template ${id} not found`);
    return found;
  },
};
