import axiosClient from "@/api/axiosClient";
import {
  Supplier,
  PayableInvoice,
  InvoicePayment,
  IndirectCategory,
} from "@/types/api.types";

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

  // ---  CATECORRIAS ---

  // --- MÓDULO: CATEGORÍAS INDIRECTAS ---
  getIndirectCategories: async () => {
    const response = await axiosClient.get<IndirectCategory[]>(
      "/finance/indirect-categories",
    );
    return response.data;
  },
  createIndirectCategory: async (category: {
    nombre: string;
    tipo: "fijo" | "variable";
  }) => {
    const response = await axiosClient.post<IndirectCategory>(
      "/finance/indirect-categories",
      category,
    );
    return response.data;
  },
  // ✅ NUEVAS FUNCIONES
  updateIndirectCategory: async (
    id: number,
    data: Partial<IndirectCategory>,
  ) => {
    const response = await axiosClient.put<IndirectCategory>(
      `/finance/indirect-categories/${id}`,
      data,
    );
    return response.data;
  },
  deleteIndirectCategory: async (id: number) => {
    const response = await axiosClient.delete(
      `/finance/indirect-categories/${id}`,
    );
    return response.data;
  },
};
