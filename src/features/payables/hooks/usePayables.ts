import { useState, useEffect, useCallback } from "react";
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

  return { invoices, isLoading, error, refetch: fetchPayables };
}
