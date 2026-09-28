import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { receivableService } from "@/features/receivables/services/receivableService";
import { ReceivableInvoice } from "@/features/receivables/types";
import axiosClient from "@/api/axiosClient";

// HELPER DE BLINDAJE: Extrae siempre un texto del error para evitar que React crashee
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
    staleTime: 0,
    refetchOnMount: true, // Obliga a recargar al abrir la vista
    refetchOnWindowFocus: true, // Recarga si cambias de ventana y regresas a tu app
  });

  // 2. MUTACIÓN: Eliminar o Cancelar factura local (Soporta Cascada)
  const deleteReceivableMut = useMutation({
    mutationFn: ({ id, cascade }: { id: number; cascade?: boolean }) =>
      receivableService.deleteInvoice(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      // El toast de éxito ahora lo maneja la interfaz (Receivables.tsx) para dar mensajes más exactos
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

  // 5.1 FIX: Timbrar Factura Vinculada a Viaje (Provisional -> Timbrada) apuntando a Logística
  const stampInvoiceMut = useMutation({
    mutationFn: (viajeId: number) =>
      axiosClient.post(`/api/logistics/trips/${viajeId}/stamp-real`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // 5.2 NUEVO: Timbrar Factura Libre (Cuentas por Cobrar sin viaje)
  const stampFreeInvoiceMut = useMutation({
    mutationFn: (invoiceId: number) =>
      receivableService.stampInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // 6. MUTACIÓN: Reabrir / Restaurar factura
  const reopenMut = useMutation({
    mutationFn: (id: number) =>
      axiosClient.post(`/api/finance/receivables/${id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // 7. MUTACIÓN: Cancelar Factura directamente en el SAT
  const cancelSatMut = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      receivableService.cancelInvoiceSAT(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // 7.5 Consultar estatus actual en el SAT bajo demanda
  const verifySatStatusMut = useMutation({
    mutationFn: (id: number) =>
      axiosClient.get(`/api/finance/receivables/${id}/verify-sat`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // 8.   NUEVO: MUTACIÓN DE PLANCHADO/SINCRONIZACIÓN DE CANCELADAS
  const syncCancelledMut = useMutation({
    mutationFn: () => axiosClient.post(`/api/finance/sync-cancelled-invoices`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  return {
    // ESTADOS
    receivables: (receivablesQuery.data || []) as ReceivableInvoice[],
    isLoadingReceivables: receivablesQuery.isLoading,
    refreshReceivables: receivablesQuery.refetch,

    // ACCIONES LOCALES
    deleteReceivable: async (id: number, options?: { cascade?: boolean }) => {
      try {
        await deleteReceivableMut.mutateAsync({
          id,
          cascade: options?.cascade,
        });
        return true;
      } catch (error: any) {
        toast.error(
          getErrorMessage(
            error,
            "Error al eliminar/cancelar la factura localmente",
          ),
        );
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
        const response = await registerMultiPaymentRepMut.mutateAsync(payload);
        const responseData = response?.data || {};
        const batchStatus = responseData?.data?.batch_status;

        if (response?.status === 202 || batchStatus === "CONCILIACION_REQUERIDA") {
          toast.warning(
            responseData?.detail ||
              "El REP quedó en conciliación. No se reintentará automáticamente para evitar duplicidad.",
          );
        } else if (batchStatus === "SOLO_COBRO") {
          toast.success("Cobro registrado sin timbrar complemento REP.");
        } else {
          toast.success(
            "Pago registrado y Complemento (REP) timbrado con éxito.",
          );
        }
        return true;
      } catch (error: any) {
        toast.error(
          getErrorMessage(error, "Error al timbrar el REP en el SAT"),
        );
        console.error(error);
        return false;
      }
    },

    stampInvoice: async (viajeId: number) => {
      const toastId = toast.loading(
        "Conectando con el SAT y emitiendo factura definitiva (Viaje)...",
      );
      try {
        await stampInvoiceMut.mutateAsync(viajeId);
        toast.success("FACTURA TIMBRADA", {
          id: toastId,
          description:
            "El documento ha sido certificado por el SAT exitosamente.",
        });
        return true;
      } catch (error: any) {
        toast.error("Error de Timbrado", {
          id: toastId,
          description: getErrorMessage(
            error,
            "Error al timbrar la factura en el SAT",
          ),
        });
        return false;
      }
    },

    stampFreeInvoice: async (invoiceId: number) => {
      const toastId = toast.loading(
        "Timbrando factura independiente en el SAT...",
      );
      try {
        await stampFreeInvoiceMut.mutateAsync(invoiceId);
        toast.success("FACTURA TIMBRADA", {
          id: toastId,
          description: "La factura independiente ha sido certificada.",
        });
        return true;
      } catch (error: any) {
        toast.error("Error de Timbrado", {
          id: toastId,
          description: getErrorMessage(
            error,
            "Error al timbrar la factura independiente en el SAT",
          ),
        });
        return false;
      }
    },

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

    // ACCIONES SAT
    cancelInvoiceSAT: async (id: number, motivo: string = "02") => {
      const toastId = toast.loading(
        "Conectando con el SAT para cancelar CFDI...",
      );
      try {
        const res = await cancelSatMut.mutateAsync({ id, motivo });
        toast.success("CFDI Cancelado", {
          id: toastId,
          description:
            res.message || "La factura se canceló oficialmente ante el SAT.",
        });
        return true;
      } catch (error: any) {
        toast.error("Rechazo del SAT", {
          id: toastId,
          description: getErrorMessage(
            error,
            "El SAT no pudo procesar la cancelación.",
          ),
        });
        return false;
      }
    },

    //  Verificar en tiempo real
    verifySatStatus: async (id: number) => {
      const toastId = toast.loading("Consultando estatus real en el SAT...");
      try {
        await verifySatStatusMut.mutateAsync(id);
        toast.success("Estatus Actualizado", {
          id: toastId,
          description: "La información del SAT se ha sincronizado.",
        });
        return true;
      } catch (error: any) {
        toast.error("Error al consultar al SAT", {
          id: toastId,
          description: getErrorMessage(
            error,
            "No se pudo conectar con el SAT.",
          ),
        });
        return false;
      }
    },

    //   9. NUEVA ACCIÓN EXPUESTA A LA UI: Sincronizar canceladas
    syncCancelledInvoices: async () => {
      const toastId = toast.loading(
        "Sincronizando estado de facturas canceladas...",
      );
      try {
        await syncCancelledMut.mutateAsync();
        toast.success("Sincronización Completa", {
          id: toastId,
          description:
            "Las facturas canceladas en el SAT ya no aparecerán como pendientes.",
        });
        return true;
      } catch (error: any) {
        toast.error("Error de Sincronización", {
          id: toastId,
          description: getErrorMessage(
            error,
            "No se pudieron sincronizar las facturas.",
          ),
        });
        return false;
      }
    },
  };
};
