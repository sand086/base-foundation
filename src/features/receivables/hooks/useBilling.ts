// src/features/receivables/hooks/useBilling.ts
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { billingService } from "@/features/settings/services/billingService";
import axiosClient from "@/api/axiosClient";

// Helper para limpiar los prefijos técnicos del backend y dejar solo el mensaje útil
const parseBillingError = (error: any): string => {
  const rawDetail = error?.response?.data?.detail;

  // Extraemos el texto base (ya sea que venga como string directo o dentro de un objeto)
  let message =
    typeof rawDetail === "string"
      ? rawDetail
      : rawDetail?.message ||
        error?.message ||
        "Error en la comunicación con el PAC.";

  // Limpiamos los prefijos anidados que manda FastAPI / Zeep
  message = message.replace(/^(detail"?\s*:?\s*)/i, "");
  message = message.replace(/(500:\s*|400:\s*)+/g, "");
  message = message.replace(/Error al timbrar Carta Porte:\s*/i, "");
  message = message.replace(/Error SAT:\s*/i, "");
  message = message.replace(/Error de validaciones adicionales\s*/i, "");

  return message.trim();
};

export const useBilling = () => {
  const [isStamping, setIsStamping] = useState(false);
  const { toast } = useToast();

  const handleStampNominal = async (
    viajeId: number,
    onSuccess?: (data: any) => void,
  ) => {
    setIsStamping(true);
    try {
      // Llama al endpoint /stamp/nominal del backend
      const response = await billingService.stampNominal(viajeId);
      toast({
        title: "¡Timbrado Exitoso!",
        description: "La Carta Porte provisional de $1 MXN ha sido generada.",
        variant: "default", // O "success" si tienes esa variante
      });
      if (onSuccess) onSuccess(response.data);
    } catch (error: any) {
      toast({
        title: "Error de Timbrado",
        description: parseBillingError(error),
        variant: "destructive",
      });
    } finally {
      setIsStamping(false);
    }
  };

  const handleStampFinal = async (
    viajeId: number,
    uuidRelacionado: string,
    onSuccess?: (data: any) => void,
  ) => {
    setIsStamping(true);
    try {
      // Llama al endpoint /stamp/final del backend
      const response = await billingService.stampFinal(
        viajeId,
        uuidRelacionado,
      );
      toast({
        title: "Factura Final Generada",
        description:
          "Se generó la factura real y se vinculó con la provisional.",
        variant: "default",
      });
      if (onSuccess) onSuccess(response.data);
    } catch (error: any) {
      toast({
        title: "Error al Facturar",
        description: parseBillingError(error),
        variant: "destructive",
      });
    } finally {
      setIsStamping(false);
    }
  };

  // 🚀 CARRIL 1: Motor 1 (Factura Directa con Viaje y Complemento Carta Porte)
  const generateOneShotInvoice = async (
    payload: any,
    onSuccess?: (data: any) => void,
  ) => {
    setIsStamping(true);
    try {
      // Usamos el billingService que creamos
      const response = await billingService.stampOneShot(payload);
      toast({
        title: "Factura Generada",
        description: "La Factura se generó y timbró con éxito ante el SAT.",
      });
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (error: any) {
      toast({
        title: "Error al Facturar (SAT)",
        description: parseBillingError(error),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsStamping(false);
    }
  };

  // 🚀 CARRIL 2: Motor de Factura Libre (Ingreso puro, Sin Viaje)
  const generateFreeInvoice = async (
    payload: any,
    onSuccess?: (data: any) => void,
  ) => {
    setIsStamping(true);
    try {
      // APUNTA AL NUEVO ENDPOINT EXCLUSIVO PARA FACTURAS LIBRES
      const response = await axiosClient.post(
        "/api/sat/stamp/free-invoice",
        payload,
      );
      toast({
        title: "Factura Libre Generada",
        description: "Tu CFDI se timbró exitosamente.",
      });
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (error: any) {
      toast({
        title: "Error al Facturar (SAT)",
        description: parseBillingError(error),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsStamping(false);
    }
  };

  // 🚀 EXPORTAMOS TODAS LAS FUNCIONES (AQUÍ ESTABA TU ERROR)
  return {
    isStamping,
    handleStampNominal,
    handleStampFinal,
    generateOneShotInvoice,
    generateFreeInvoice,
  };
};
