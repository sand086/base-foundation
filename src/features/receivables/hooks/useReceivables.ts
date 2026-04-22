// src/features/receivables/hooks/useReceivables.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { receivableService } from "@/features/receivables/services/receivableService";
import { ReceivableInvoice } from "@/features/receivables/types";
import axiosClient from "@/api/axiosClient";

// 🚀 HELPER DE BLINDAJE: Extrae siempre un texto del error para evitar que React crashee
const getErrorMessage = (error: any, fallback: string) => {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  if (typeof detail === "string") return detail;
  return fallback;
};

export const useReceivables = () => {
  const queryClient = useQueryClient();

  // 1. CONSULTA: Obtener todas las facturas
  const receivablesQuery = useQuery({
    queryKey: ["receivables"],
    queryFn: () => receivableService.getInvoices(),
    staleTime: 1000 * 60 * 5,
  });

  // 2. MUTACIÓN: Eliminar factura
  const deleteReceivableMut = useMutation({
    mutationFn: (id: number) => receivableService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Factura eliminada correctamente");
    },
  });

  // 3. MUTACIÓN: Registrar pago manual simple
  const registerPaymentMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      receivableService.registerPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Pago registrado exitosamente");
    },
  });

  // 4. MUTACIÓN: Subir XML
  const uploadXmlMut = useMutation({
    mutationFn: (file: File) => receivableService.uploadPaymentXml(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Complemento de pago procesado y saldos actualizados");
    },
  });

  // 5. MUTACIÓN: Timbrar REP en el SAT
  const registerMultiPaymentRepMut = useMutation({
    mutationFn: (payload: any) =>
      axiosClient.post("/api/sat/stamp/payment", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // 6. 🚀 MUTACIÓN: Reabrir / Restaurar factura
  const reopenMut = useMutation({
    mutationFn: (id: number) =>
      axiosClient.post(`/api/finance/receivables/${id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  return {
    // ESTADOS
    receivables: (receivablesQuery.data || []) as ReceivableInvoice[],
    isLoadingReceivables: receivablesQuery.isLoading,
    refreshReceivables: receivablesQuery.refetch,

    // ACCIONES
    deleteReceivable: async (id: number) => {
      try {
        await deleteReceivableMut.mutateAsync(id);
        return true;
      } catch (error: any) {
        toast.error("Error al eliminar la factura");
        return false;
      }
    },

    registerPayment: async (invoiceId: number, paymentData: any) => {
      try {
        await registerPaymentMut.mutateAsync({
          id: invoiceId,
          data: paymentData,
        });
        return true;
      } catch (error: any) {
        toast.error(getErrorMessage(error, "Error al registrar el pago"));
        return false;
      }
    },

    uploadPaymentXml: async (file: File) => {
      try {
        await uploadXmlMut.mutateAsync(file);
        return true;
      } catch (error: any) {
        toast.error(getErrorMessage(error, "Error al procesar el XML"));
        return false;
      }
    },

    registerMultiplePaymentRep: async (payload: any) => {
      try {
        await registerMultiPaymentRepMut.mutateAsync(payload);
        toast.success(
          "Pago registrado y Complemento (REP) timbrado con éxito.",
        );
        return true;
      } catch (error: any) {
        toast.error(
          getErrorMessage(error, "Error al timbrar el REP en el SAT"),
        );
        console.error(error);
        return false;
      }
    },

    // 🚀 ACCIÓN: Restaurar la factura
    reopenReceivable: async (id: number) => {
      try {
        await reopenMut.mutateAsync(id);
        toast.success(
          "Factura restaurada. Lista para intentar el cobro de nuevo.",
        );
        return true;
      } catch (error: any) {
        toast.error(getErrorMessage(error, "Error al restaurar la factura"));
        return false;
      }
    },
  };
};
