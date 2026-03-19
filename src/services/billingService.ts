// src/services/billingService.ts
import axiosClient from "@/api/axiosClient";

export interface BillingResponse {
  status: string;
  message: string;
  data: {
    factura_id: number;
    uuid: string;
    xml_url: string;
  };
}

export const billingService = {
  // Fase 1: Bypass Aduanal ($1 peso)
  stampNominal: async (viajeId: number): Promise<BillingResponse> => {
    const response = await axiosClient.post("/billing/stamp/nominal", {
      viaje_id: viajeId,
      is_nominal: true,
    });
    return response.data;
  },

  // Fase 3: Factura Final (Sustitución 04)
  stampFinal: async (
    viajeId: number,
    uuidRelacionado: string,
  ): Promise<BillingResponse> => {
    const response = await axiosClient.post("/billing/stamp/final", {
      viaje_id: viajeId,
      is_nominal: false,
      tipo_relacion: "04",
      uuid_relacionado: uuidRelacionado,
    });
    return response.data;
  },
};
