import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { SuppliersService } from "@/api/generated/services/SuppliersService";

export function usePayables() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPayables = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
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

  // 🔥 1. FILTRO MAESTRO: Quitamos las facturas canceladas para que no ensucien la suma
  const facturasActivas = useMemo(() => {
    return invoices.filter((inv) => {
      const estatus = inv.estatus?.toLowerCase() || "";
      return estatus !== "cancelado" && estatus !== "cancelada";
    });
  }, [invoices]);

  // 🔥 2. FACTURAS A PAGAR: Solo positivas y que no sean Egreso
  const facturasAPagar = useMemo(() => {
    return facturasActivas.filter(
      (inv) => inv.saldo_pendiente > 0 && inv.tipo_comprobante !== "E",
    );
  }, [facturasActivas]);

  // 🔥 3. NOTAS DE CRÉDITO: Negativas o tipo Egreso
  const notasDeCredito = useMemo(() => {
    return facturasActivas.filter(
      (inv) => inv.saldo_pendiente < 0 || inv.tipo_comprobante === "E",
    );
  }, [facturasActivas]);

  // 🔥 4. MATEMÁTICAS EXACTAS PARA TUS CARDS
  const totalesCards = useMemo(() => {
    const totalDeuda = facturasAPagar.reduce(
      (sum, inv) => sum + (inv.saldo_pendiente || 0),
      0,
    );

    const totalAFavor = notasDeCredito.reduce(
      (sum, inv) => sum + Math.abs(inv.saldo_pendiente || 0),
      0,
    );

    return {
      totalDeuda, // ESTE ES TU $1,048,707.83
      totalAFavor, // ESTE ES TU $333.23
      deudaRealNeto: totalDeuda - totalAFavor, // ESTE ES EL $1,048,374.60
    };
  }, [facturasAPagar, notasDeCredito]);

  return {
    invoices,
    facturasAPagar,
    notasDeCredito,
    totalesCards,
    isLoading,
    error,
    refetch: fetchPayables,
  };
}
