// src/hooks/useBilling.ts
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { billingService } from "@/services/billingService";

export const useBilling = () => {
  const [isStamping, setIsStamping] = useState(false);
  const { toast } = useToast();

  const handleStampNominal = async (
    viajeId: number,
    onSuccess?: (data: any) => void,
  ) => {
    setIsStamping(true);
    try {
      const response = await billingService.stampNominal(viajeId);
      toast({
        title: "Éxito",
        description: "Carta Porte provisional timbrada correctamente.",
        variant: "default",
      });
      if (onSuccess) onSuccess(response.data);
    } catch (error: any) {
      toast({
        title: "Error al timbrar",
        description:
          error.response?.data?.detail || "Ocurrió un error con el PAC.",
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
      const response = await billingService.stampFinal(
        viajeId,
        uuidRelacionado,
      );
      toast({
        title: "Factura Generada",
        description:
          "La factura final se generó y la provisional fue enviada a cancelación.",
        variant: "default",
      });
      if (onSuccess) onSuccess(response.data);
    } catch (error: any) {
      toast({
        title: "Error al facturar",
        description:
          error.response?.data?.detail ||
          "No se pudo generar la factura final.",
        variant: "destructive",
      });
    } finally {
      setIsStamping(false);
    }
  };

  return {
    isStamping,
    handleStampNominal,
    handleStampFinal,
  };
};
