import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { SuppliersService } from "@/api/generated/services/SuppliersService";

export function usePayables() {
  // Usamos "any[]" temporalmente para que no tengas problemas con el nombre largo del Schema
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPayables = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      // Consumimos el endpoint real de tu backend: GET /api/suppliers/invoices
      const data = await SuppliersService.readInvoicesApiSuppliersInvoicesGet();
      setInvoices(data);
    } catch (err) {
      console.error("Error al cargar cuentas por pagar:", err);
      toast.error("Hubo un problema al conectar con el servidor de Finanzas");
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  // 🔥 MAGIA PARA LA UI: Separamos la data para la Tabla y las Cards 🔥

  // 1. Facturas reales que se deben pagar (Positivas y que NO sean Egreso)
  const facturasAPagar = useMemo(() => {
    return invoices.filter(
      (inv) => inv.saldo_pendiente > 0 && inv.tipo_comprobante !== "E",
    );
  }, [invoices]);

  // 2. Notas de Crédito / Saldos a favor (Negativas o que SÍ sean Egreso)
  const notasDeCredito = useMemo(() => {
    return invoices.filter(
      (inv) => inv.saldo_pendiente < 0 || inv.tipo_comprobante === "E",
    );
  }, [invoices]);

  // 3. Cálculos limpios para las Cards de la interfaz
  const totalesCards = useMemo(() => {
    // Sumamos la deuda pendiente real
    const totalDeuda = facturasAPagar.reduce(
      (sum, inv) => sum + (inv.saldo_pendiente || 0),
      0,
    );

    // Sumamos el dinero a favor (convertimos los negativos a positivos para mostrar en la Card)
    const totalAFavor = notasDeCredito.reduce(
      (sum, inv) => sum + Math.abs(inv.saldo_pendiente || 0),
      0,
    );

    return {
      totalDeuda,
      totalAFavor,
      deudaRealNeto: totalDeuda - totalAFavor, // Lo que realmente le debes al proveedor si cruzas saldos
    };
  }, [facturasAPagar, notasDeCredito]);

  return {
    invoices, // La data cruda (por si la necesitas para otra cosa)
    facturasAPagar, // Pásale esto a la tabla principal
    notasDeCredito, // Pásale esto a la tabla secundaria de saldos a favor
    totalesCards, // Pásale esto a tus Cards superiores
    isLoading,
    error,
    refetch: fetchPayables,
  };
}
