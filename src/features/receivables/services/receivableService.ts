import axiosClient from "@/api/axiosClient";
import { ReceivableInvoice } from "@/types/api.types";

export const receivableService = {
  // ==========================================
  // MÓDULO: CUENTAS POR COBRAR (CxC)
  // ==========================================

  /**
   * 1. Obtener todas las facturas de Cuentas por Cobrar
   * Endpoint: GET /receivables
   */
  getInvoices: async (skip = 0, limit = 100) => {
    const response = await axiosClient.get<ReceivableInvoice[]>(
      "/receivables",
      {
        params: { skip, limit },
      },
    );
    return response.data;
  },

  /**
   * 2. Eliminar una factura de CxC
   * Endpoint: DELETE /receivables/{id}
   */
  deleteInvoice: async (id: number | string) => {
    const response = await axiosClient.delete(`/receivables/${id}`);
    return response.data;
  },

  /**
   * 3. Registrar un pago manual a una factura
   * Endpoint: POST /receivables/{id}/payments
   */
  registerPayment: async (invoiceId: number | string, paymentData: any) => {
    // Normalizamos el payload para asegurar que hace match exacto con lo que espera FastAPI
    const normalizedPayment = {
      monto: paymentData.monto,
      fecha_pago:
        paymentData.fechaPago || paymentData.fecha_pago || paymentData.fecha,
      metodo_pago: paymentData.metodoPago || paymentData.metodo_pago || "03", // 03 = Transferencia
      referencia: paymentData.referencia || "",
      cuenta_deposito:
        paymentData.cuentaDestino || paymentData.cuenta_deposito || "Banco",
    };

    const response = await axiosClient.post(
      `/receivables/${invoiceId}/payments`,
      normalizedPayment,
    );
    return response.data;
  },

  // ==========================================
  // AUTOMATIZACIÓN SAT (FASE 4)
  // ==========================================

  /**
   * 4. 🚀 Subir XML de Complemento de Pago (REP) para liquidación automática
   * Endpoint: POST /receivables/payments/upload-xml
   */
  uploadPaymentXml: async (file: File) => {
    // Para enviar archivos por Axios, siempre debemos usar FormData
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post(
      "/receivables/payments/upload-xml",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },
};
