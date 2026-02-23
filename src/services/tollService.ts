import axiosClient from "@/api/axiosClient";
import { TollBooth, RateTemplate } from "@/types/api.types";

export interface RateTemplateCreate {
  client_id: number;
  origen: string;
  destino: string;
  toll_unit_type: string;
  toll_ids: number[];
}

export const tollService = {
  getTolls: async (search = "") => {
    const { data } = await axiosClient.get<TollBooth[]>(
      `/tolls?search=${search}`,
    );
    return data;
  },
  createToll: async (toll: Partial<TollBooth>) => {
    const { data } = await axiosClient.post<TollBooth>("/tolls", toll);
    return data;
  },
  updateToll: async (id: number, toll: Partial<TollBooth>) => {
    const { data } = await axiosClient.put<TollBooth>(`/tolls/${id}`, toll);
    return data;
  },
  deleteToll: async (id: number) => {
    await axiosClient.delete(`/tolls/${id}`);
  },
  getTemplates: async (clientId?: number) => {
    const url = clientId
      ? `/rate-templates?client_id=${clientId}`
      : "/rate-templates";
    const { data } = await axiosClient.get<RateTemplate[]>(url);
    return data;
  },
  saveTemplate: async (template: RateTemplateCreate) => {
    const { data } = await axiosClient.post<RateTemplate>(
      "/rate-templates",
      template,
    );
    return data;
  },
};
