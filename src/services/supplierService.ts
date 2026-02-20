import axiosClient from "@/api/axiosClient";

// ==========================================
// INTERFACES (Ajusta los imports si ya las tienes en api.types.ts)
// ==========================================

export interface Supplier {
  id: number;
  razon_social: string;
  rfc: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigo_postal?: string;
  dias_credito: number;
  limite_credito: number;
  contacto_principal?: string;
  categoria?: string;
  estatus: "activo" | "inactivo" | "suspendido";
  created_at: string;
  updated_at: string;
}

export interface InvoicePayment {
  id?: number;
  invoice_id?: number;
  fecha_pago: string; // YYYY-MM-DD
  monto: number;
  metodo_pago?: string;
  referencia?: string;
  cuenta_retiro?: string;
  complemento_uuid?: string;
}

export interface PayableInvoice {
  id: number;
  supplier_id: number;
  supplier_razon_social?: string; // Viene del backend
  uuid: string;
  folio_interno?: string;
  monto_total: number;
  saldo_pendiente: number;
  moneda: string;
  fecha_emision: string; // YYYY-MM-DD
  fecha_vencimiento: string; // YYYY-MM-DD
  concepto?: string;
  clasificacion?: string;
  estatus: "pendiente" | "pago_parcial" | "pagado" | "cancelado";
  pdf_url?: string;
  xml_url?: string;
  orden_compra_id?: string;
  payments?: InvoicePayment[];
}

// ==========================================
// SERVICIOS
// ==========================================

export const supplierService = {
  // --- MÓDULO: PROVEEDORES ---

  // 1. Obtener todos los proveedores
  getSuppliers: async () => {
    const response = await axiosClient.get<Supplier[]>("/finance/suppliers");
    return response.data;
  },

  // 2. Obtener un proveedor por ID
  getSupplierById: async (id: number) => {
    const response = await axiosClient.get<Supplier>(
      `/finance/suppliers/${id}`,
    );
    return response.data;
  },

  // 3. Crear proveedor
  createSupplier: async (
    supplier: Omit<Supplier, "id" | "created_at" | "updated_at">,
  ) => {
    const response = await axiosClient.post<Supplier>(
      "/finance/suppliers",
      supplier,
    );
    return response.data;
  },

  // 4. Actualizar proveedor
  updateSupplier: async (id: number, supplier: Partial<Supplier>) => {
    const response = await axiosClient.put<Supplier>(
      `/finance/suppliers/${id}`,
      supplier,
    );
    return response.data;
  },

  // 5. Eliminar proveedor (Borrado lógico en backend)
  deleteSupplier: async (id: number) => {
    const response = await axiosClient.delete(`/finance/suppliers/${id}`);
    return response.data;
  },

  // --- MÓDULO: FACTURAS CXP ---

  // 6. Obtener todas las facturas
  getInvoices: async () => {
    const response =
      await axiosClient.get<PayableInvoice[]>("/finance/invoices");
    return response.data;
  },

  // 7. Obtener una factura por ID (con sus pagos)
  getInvoiceById: async (id: number) => {
    const response = await axiosClient.get<PayableInvoice>(
      `/finance/invoices/${id}`,
    );
    return response.data;
  },

  // 8. Crear factura
  createInvoice: async (
    invoice: Omit<PayableInvoice, "id" | "saldo_pendiente" | "estatus">,
  ) => {
    const response = await axiosClient.post<PayableInvoice>(
      "/finance/invoices",
      invoice,
    );
    return response.data;
  },

  // 9. Actualizar factura
  updateInvoice: async (id: number, invoice: Partial<PayableInvoice>) => {
    const response = await axiosClient.put<PayableInvoice>(
      `/finance/invoices/${id}`,
      invoice,
    );
    return response.data;
  },

  // 10. Eliminar factura
  deleteInvoice: async (id: number) => {
    const response = await axiosClient.delete(`/finance/invoices/${id}`);
    return response.data;
  },

  // --- MÓDULO: PAGOS ---

  // 11. Registrar un pago a una factura
  registerPayment: async (invoiceId: number, payment: InvoicePayment) => {
    const response = await axiosClient.post<PayableInvoice>(
      `/finance/invoices/${invoiceId}/payments`,
      payment,
    );
    return response.data;
  },
};
