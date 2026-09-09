import { FinanceService } from "@/api/generated";
import { ReceivableInvoice } from "@/features/receivables/types";
import axiosClient from "@/api/axiosClient";

export const receivableService = {
  getInvoices: async (skip = 0, limit = 5000) => {
    const data =
      await FinanceService.getReceivableInvoicesApiFinanceReceivablesGet(
        skip,
        limit,
      );
    return data as ReceivableInvoice[];
  },

  //  FIX: Modificado para usar AxiosClient directo y soportar la query string ?cascade=true
  deleteInvoice: async (id: number | string, cascade?: boolean) => {
    const { data } = await axiosClient.delete(
      `/api/finance/receivables/${id}`,
      {
        params: cascade !== undefined ? { cascade } : undefined,
      },
    );
    return data;
  },

  registerPayment: async (invoiceId: number | string, paymentData: any) => {
    const normalizedPayment = {
      monto: paymentData.monto,
      fecha_pago:
        paymentData.fechaPago || paymentData.fecha_pago || paymentData.fecha,
      metodo_pago: paymentData.metodoPago || paymentData.metodo_pago || "03",
      referencia: paymentData.referencia || "",
      cuenta_deposito:
        paymentData.cuentaDestino || paymentData.cuenta_deposito || "Banco",
      banco_ordenante: paymentData.banco_ordenante || "",
      cuenta_ordenante: paymentData.cuenta_ordenante || "",
      generar_complemento: paymentData.generar_complemento,
      idempotency_key: paymentData.idempotency_key,
    };

    return await FinanceService.registerReceivablePaymentApiFinanceReceivablesInvoiceIdPaymentsPost(
      Number(invoiceId),
      normalizedPayment,
    );
  },

  uploadPaymentXml: async (file: File) => {
    return await FinanceService.uploadPaymentXmlApiFinancePaymentsUploadXmlPost(
      { file },
    );
  },

  cancelInvoiceSAT: async (
    invoiceId: number | string,
    motivo: string = "02",
  ) => {
    const { data } = await axiosClient.post(
      `/api/sat/stamp/cancel/${invoiceId}`,
      {
        motivo: motivo,
        uuid_sustituto: null,
      },
    );
    return data;
  },

  // NUEVO: Endpoint para Timbrar la Factura CXC Provisional
  stampInvoice: async (id: number | string) => {
    const { data } = await axiosClient.post(`/api/sat/stamp/invoice/${id}`);
    return data;
  },
};
