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
    try {
      const response =
        await DefaultService.generarCartaPorteNominalApiSatStampNominalPost({
          viaje_id: viajeId,
          is_nominal: true,
        } as any);
      return response as BillingResponse;
    } catch (error: any) {
      // 🚀 MAGIA: Los clientes generados por OpenAPI guardan el JSON del backend en "error.body"
      if (error.body) {
        // Lo empaquetamos simulando la estructura de Axios para que tu useBilling.ts lo atrape perfecto
        throw { response: { data: error.body } };
      }
      throw error;
    }
  },

  stampFinal: async (
    viajeId: number,
    uuidRelacionado: string,
  ): Promise<BillingResponse> => {
    try {
      const response =
        await DefaultService.generarFacturaFinalApiSatStampFinalPost({
          viaje_id: viajeId,
          is_nominal: false,
          tipo_relacion: "04",
          uuid_relacionado: uuidRelacionado,
        } as any);
      return response as BillingResponse;
    } catch (error: any) {
      // 🚀 MAGIA: Mismo blindaje para la factura final
      if (error.body) {
        throw { response: { data: error.body } };
      }
      throw error;
    }
  },
};
