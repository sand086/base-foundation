import axiosClient from "@/api/axiosClient";

export interface Supplier {
  id: number;
  razon_social: string;
  rfc: string;
  categoria?: string;
  dias_credito: number;
  contacto_principal?: string;
  telefono?: string;
  email?: string;
  estatus: "activo" | "inactivo" | "suspendido";
}

export interface PayableInvoice {
  id: number;
  supplier_id: number;
  supplier_razon_social?: string;
  uuid: string;
  folio_interno?: string;
  monto_total: number;
  saldo_pendiente: number;
  moneda: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  concepto: string;
  clasificacion?: string;
  estatus: "pendiente" | "pago_parcial" | "pagado" | "cancelado";
  orden_compra_id?: string;
}

export const supplierService = {
  getSuppliers: async () => {
    const { data } = await axiosClient.get("/finance/suppliers");
    return data;
  },
  createSupplier: async (supplier: any) => {
    const { data } = await axiosClient.post("/finance/suppliers", supplier);
    return data;
  },
  getInvoices: async () => {
    const { data } = await axiosClient.get("/finance/invoices");
    return data;
  },
  createInvoice: async (invoice: any) => {
    const { data } = await axiosClient.post("/finance/invoices", invoice);
    return data;
  },
  registerPayment: async (invoiceId: number, payment: any) => {
    const { data } = await axiosClient.post(
      `/finance/invoices/${invoiceId}/payments`,
      payment,
    );
    return data;
  },
};
