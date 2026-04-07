import { FinanceService } from "@/api/generated";
import { ReceivableInvoice } from "@/features/receivables/types";

export const receivableService = {
  getInvoices: async (skip = 0, limit = 100) => {
    const data = await FinanceService.getReceivableInvoicesApiFinanceReceivablesGet(skip, limit);
    return data as ReceivableInvoice[];
  },

  deleteInvoice: async (id: number | string) => {
    return await FinanceService.deleteReceivableInvoiceApiFinanceReceivablesInvoiceIdDelete(Number(id));
  },

  registerPayment: async (invoiceId: number | string, paymentData: any) => {
    const normalizedPayment = {
      monto: paymentData.monto,
      fecha_pago: paymentData.fechaPago || paymentData.fecha_pago || paymentData.fecha,
      metodo_pago: paymentData.metodoPago || paymentData.metodo_pago || "03",
      referencia: paymentData.referencia || "",
      cuenta_deposito: paymentData.cuentaDestino || paymentData.cuenta_deposito || "Banco",
    };

    return await FinanceService.registerReceivablePaymentApiFinanceReceivablesInvoiceIdPaymentsPost(
      Number(invoiceId),
      normalizedPayment,
    );
  },

  uploadPaymentXml: async (file: File) => {
    return await FinanceService.uploadPaymentXmlApiFinancePaymentsUploadXmlPost({ file });
  },
};
