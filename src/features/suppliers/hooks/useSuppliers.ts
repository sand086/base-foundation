import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supplierService } from "@/features/suppliers/services/supplierService";
import {
  Supplier,
  PayableInvoice,
  IndirectCategory,
} from "@/features/payables/types";

export const useSuppliers = () => {
  const queryClient = useQueryClient();

  // ====================================================
  // 1. QUERIES (Lectura de datos con Caché automático)
  // ====================================================

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.getSuppliers(),
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: () => supplierService.getInvoices(),
    staleTime: 1000 * 60 * 5,
  });

  const categoriesQuery = useQuery({
    queryKey: ["indirect-categories"],
    queryFn: () => supplierService.getIndirectCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutos de caché (casi no cambian)
  });

  // ====================================================
  // 2. MUTATIONS (Escritura de datos)
  // ====================================================

  // --- PROVEEDORES ---
  const createSupplierMut = useMutation({
    mutationFn: (data: Partial<Supplier>) =>
      supplierService.createSupplier(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor creado");
    },
  });

  const updateSupplierMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) =>
      supplierService.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor actualizado");
    },
  });

  const deleteSupplierMut = useMutation({
    mutationFn: (id: number) => supplierService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor eliminado");
    },
  });

  // --- FACTURAS ---
  const createInvoiceMut = useMutation({
    mutationFn: (data: Partial<PayableInvoice>) =>
      supplierService.createInvoice(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura registrada correctamente");
    },
  });

  const updateInvoiceMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PayableInvoice> }) =>
      supplierService.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura actualizada");
    },
  });

  const deleteInvoiceMut = useMutation({
    mutationFn: (id: number) => supplierService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura eliminada correctamente");
    },
  });

  // --- PAGOS ---
  const registerPaymentMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierService.registerPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Pago registrado exitosamente");
    },
  });

  // --- CATEGORÍAS ---
  const createCategoryMut = useMutation({
    mutationFn: (data: { nombre: string; tipo: "fijo" | "variable" }) =>
      supplierService.createIndirectCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indirect-categories"] });
      toast.success("Categoría creada");
    },
  });

  const updateCategoryMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<IndirectCategory>;
    }) => supplierService.updateIndirectCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indirect-categories"] });
      toast.success("Categoría actualizada");
    },
  });

  const deleteCategoryMut = useMutation({
    mutationFn: (id: number) => supplierService.deleteIndirectCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indirect-categories"] });
      toast.success("Categoría eliminada");
    },
  });

  // ====================================================
  // 3. WRAPPERS (Para mantener compatibilidad con tus vistas)
  // ====================================================
  // Usamos wrappers con try/catch para devolver true/false y no romper tu UI actual.

  return {
    // ESTADOS Y DATOS
    suppliers: suppliersQuery.data || [],
    invoices: invoicesQuery.data || [],
    indirectCategories: categoriesQuery.data || [],
    isLoadingSuppliers: suppliersQuery.isLoading,
    isLoadingInvoices: invoicesQuery.isLoading,

    // REFRESH MANUAL
    refreshSuppliers: suppliersQuery.refetch,
    refreshInvoices: invoicesQuery.refetch,

    // MÉTODOS FACTURAS
    createInvoice: async (data: Partial<PayableInvoice>) => {
      try {
        await createInvoiceMut.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    updateInvoice: async (id: number, data: Partial<PayableInvoice>) => {
      try {
        await updateInvoiceMut.mutateAsync({ id, data });
        return true;
      } catch {
        return false;
      }
    },
    deleteInvoice: async (id: number) => {
      try {
        await deleteInvoiceMut.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },

    // MÉTODOS PAGOS
    registerPayment: async (invoiceId: number, paymentData: any) => {
      try {
        await registerPaymentMut.mutateAsync({
          id: invoiceId,
          data: paymentData,
        });
        return true;
      } catch {
        return false;
      }
    },

    // MÉTODOS PROVEEDORES
    createSupplier: async (data: Partial<Supplier>) => {
      try {
        await createSupplierMut.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    updateSupplier: async (id: number, data: Partial<Supplier>) => {
      try {
        await updateSupplierMut.mutateAsync({ id, data });
        return true;
      } catch {
        return false;
      }
    },
    deleteSupplier: async (id: number) => {
      try {
        await deleteSupplierMut.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },

    // MÉTODOS CATEGORÍAS
    createIndirectCategory: async (input: {
      nombre: string;
      tipo: "fijo" | "variable";
    }) => {
      try {
        return await createCategoryMut.mutateAsync(input);
      } catch {
        return null;
      }
    },
    updateIndirectCategory: async (
      id: number,
      data: Partial<IndirectCategory>,
    ) => {
      try {
        await updateCategoryMut.mutateAsync({ id, data });
        return true;
      } catch {
        return false;
      }
    },
    deleteIndirectCategory: async (id: number) => {
      try {
        await deleteCategoryMut.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
};
