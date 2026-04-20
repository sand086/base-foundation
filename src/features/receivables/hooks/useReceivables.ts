// src/features/receivables/hooks/useReceivables.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { receivableService } from "@/features/receivables/services/receivableService";
import { ReceivableInvoice } from "@/features/receivables/types";
import axiosClient from "@/api/axiosClient";

// 🚀 HELPER DE BLINDAJE: Extrae siempre un texto del error para evitar que React crashee con objetos
const getErrorMessage = (error: any, fallback: string) => {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    // Si es un error 422 de Pydantic, extraemos el mensaje del primer elemento
    return detail[0]?.msg || fallback;
  }
  if (typeof detail === "string") {
    // Si es un error 400 normal lanzado con HTTPException
    return detail;
  }

  return fallback;
};

export const useReceivables = () => {
  const queryClient = useQueryClient();

  // 1. CONSULTA: Obtener todas las facturas de clientes (Cuentas por Cobrar)
  const receivablesQuery = useQuery({
    queryKey: ["receivables"],
    queryFn: () => receivableService.getInvoices(),
    staleTime: 1000 * 60 * 5,
  });

  // 2. MUTACIÓN: Eliminar una factura
  const deleteReceivableMut = useMutation({
    mutationFn: (id: number) => receivableService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Factura eliminada correctamente");
    },
  });

  // 3. MUTACIÓN: Registrar un pago manualmente (Simple / 1 factura)
  const registerPaymentMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      receivableService.registerPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Pago registrado exitosamente");
    },
  });

  // 4. MUTACIÓN: Subir XML de pago (REP)
  const uploadXmlMut = useMutation({
    mutationFn: (file: File) => receivableService.uploadPaymentXml(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Complemento de pago procesado y saldos actualizados");
    },
  });

  // 5. NUEVA MUTACIÓN: Registrar Múltiples Pagos y Timbrar REP en el SAT
  const registerMultiPaymentRepMut = useMutation({
    mutationFn: (payload: any) =>
      axiosClient.post("/api/sat/stamp/payment", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  return {
    receivables: (receivablesQuery.data || []) as ReceivableInvoice[],
    isLoadingReceivables: receivablesQuery.isLoading,
    refreshReceivables: receivablesQuery.refetch,

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
        // 🚀 Usamos el helper
        toast.error(getErrorMessage(error, "Error al registrar el pago"));
        return false;
      }
    },

    uploadPaymentXml: async (file: File) => {
      try {
        await uploadXmlMut.mutateAsync(file);
        return true;
      } catch (error: any) {
        // 🚀 Usamos el helper
        toast.error(getErrorMessage(error, "Error al procesar el XML"));
        return false;
      }
    },

    // NUEVA FUNCIÓN EXPUESTA PARA USAR EN TU COMPONENTE
    registerMultiplePaymentRep: async (payload: any) => {
      try {
        await registerMultiPaymentRepMut.mutateAsync(payload);
        toast.success(
          "Pago registrado y Complemento (REP) timbrado con éxito.",
        );
        return true;
      } catch (error: any) {
        // 🚀 Usamos el helper para que el array del 422 no rompa la pantalla
        toast.error(
          getErrorMessage(error, "Error al timbrar el REP en el SAT"),
        );
        console.error(error);
        return false;
      }
    },
  };
};
