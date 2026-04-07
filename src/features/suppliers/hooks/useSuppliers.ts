import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SuppliersService, FinanceService } from "@/api/generated";
import { Supplier, PayableInvoice, IndirectCategory } from "@/features/payables/types";
import axiosClient from "@/api/axiosClient";

export const useSuppliers = () => {
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => SuppliersService.readSuppliersApiSuppliersGet(),
    staleTime: 1000 * 60 * 5,
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: () => SuppliersService.readInvoicesApiSuppliersInvoicesGet(),
    staleTime: 1000 * 60 * 5,
  });

  const categoriesQuery = useQuery({
    queryKey: ["indirect-categories"],
    queryFn: () => FinanceService.readIndirectCategoriesApiFinanceIndirectCategoriesGet() as Promise<IndirectCategory[]>,
    staleTime: 1000 * 60 * 30,
  });

  const createSupplierMut = useMutation({
    mutationFn: (data: any) => SuppliersService.createSupplierApiSuppliersPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor creado");
    },
  });

  const updateSupplierMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      SuppliersService.updateSupplierApiSuppliersSupplierIdPut(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor actualizado");
    },
  });

  const deleteSupplierMut = useMutation({
    mutationFn: (id: number) => SuppliersService.deleteSupplierApiSuppliersSupplierIdDelete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor eliminado");
    },
  });

  const createInvoiceMut = useMutation({
    mutationFn: (data: any) => SuppliersService.createInvoiceApiSuppliersInvoicesPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura registrada correctamente");
    },
  });

  const updateInvoiceMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      SuppliersService.updateInvoiceApiSuppliersInvoicesInvoiceIdPut(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura actualizada");
    },
  });

  const deleteInvoiceMut = useMutation({
    mutationFn: (id: number) => SuppliersService.deleteInvoiceApiSuppliersInvoicesInvoiceIdDelete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura eliminada correctamente");
    },
  });

  const registerPaymentMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      SuppliersService.registerPaymentApiSuppliersInvoicesInvoiceIdPaymentsPost(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Pago registrado exitosamente");
    },
  });

  // Indirect categories CUD — not yet in generated API, use axiosClient
  const createCategoryMut = useMutation({
    mutationFn: (input: { nombre: string; tipo: "fijo" | "variable" }) =>
      axiosClient.post<IndirectCategory>("/api/finance/indirect-categories", input).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indirect-categories"] });
      toast.success("Categoría creada");
    },
  });

  const updateCategoryMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IndirectCategory> }) =>
      axiosClient.put<IndirectCategory>(`/api/finance/indirect-categories/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indirect-categories"] });
      toast.success("Categoría actualizada");
    },
  });

  const deleteCategoryMut = useMutation({
    mutationFn: (id: number) =>
      axiosClient.delete(`/api/finance/indirect-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indirect-categories"] });
      toast.success("Categoría eliminada");
    },
  });

  return {
    suppliers: (suppliersQuery.data || []) as Supplier[],
    invoices: (invoicesQuery.data || []) as PayableInvoice[],
    indirectCategories: categoriesQuery.data || [],
    isLoadingSuppliers: suppliersQuery.isLoading,
    isLoadingInvoices: invoicesQuery.isLoading,

    refreshSuppliers: suppliersQuery.refetch,
    refreshInvoices: invoicesQuery.refetch,

    createInvoice: async (data: Partial<PayableInvoice>) => {
      try { await createInvoiceMut.mutateAsync(data as any); return true; } catch { return false; }
    },
    updateInvoice: async (id: number, data: Partial<PayableInvoice>) => {
      try { await updateInvoiceMut.mutateAsync({ id, data }); return true; } catch { return false; }
    },
    deleteInvoice: async (id: number) => {
      try { await deleteInvoiceMut.mutateAsync(id); return true; } catch { return false; }
    },

    registerPayment: async (invoiceId: number, paymentData: any) => {
      try { await registerPaymentMut.mutateAsync({ id: invoiceId, data: paymentData }); return true; } catch { return false; }
    },

    createSupplier: async (data: Partial<Supplier>) => {
      try { await createSupplierMut.mutateAsync(data as any); return true; } catch { return false; }
    },
    updateSupplier: async (id: number, data: Partial<Supplier>) => {
      try { await updateSupplierMut.mutateAsync({ id, data }); return true; } catch { return false; }
    },
    deleteSupplier: async (id: number) => {
      try { await deleteSupplierMut.mutateAsync(id); return true; } catch { return false; }
    },

    createIndirectCategory: async (input: { nombre: string; tipo: "fijo" | "variable" }) => {
      try { return await createCategoryMut.mutateAsync(input); } catch { return null; }
    },
    updateIndirectCategory: async (id: number, data: Partial<IndirectCategory>) => {
      try { await updateCategoryMut.mutateAsync({ id, data }); return true; } catch { return false; }
    },
    deleteIndirectCategory: async (id: number) => {
      try { await deleteCategoryMut.mutateAsync(id); return true; } catch { return false; }
    },
  };
};
