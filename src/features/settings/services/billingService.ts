import { DefaultService } from "@/api/generated";

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
  stampNominal: async (viajeId: number): Promise<BillingResponse> => {
    const response = await DefaultService.generarCartaPorteNominalApiSatStampNominalPost({
      viaje_id: viajeId,
      is_nominal: true,
    } as any);
    return response as BillingResponse;
  },

  stampFinal: async (viajeId: number, uuidRelacionado: string): Promise<BillingResponse> => {
    const response = await DefaultService.generarFacturaFinalApiSatStampFinalPost({
      viaje_id: viajeId,
      is_nominal: false,
      tipo_relacion: "04",
      uuid_relacionado: uuidRelacionado,
    } as any);
    return response as BillingResponse;
  },
};
