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
      // 🚀 Llama al endpoint /stamp/nominal del backend
      const response = await billingService.stampNominal(viajeId);
      toast({
        title: "¡Timbrado Exitoso!",
        description: "La Carta Porte provisional de $1 MXN ha sido generada.",
        variant: "default",
      });
      if (onSuccess) onSuccess(response.data);
    } catch (error: any) {
      toast({
        title: "Error de Timbrado",
        description:
          error.response?.data?.detail ||
          "Error en la comunicación con el PAC.",
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
      // 🚀 Llama al endpoint /stamp/final del backend
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
