import { useState, useEffect, useCallback } from "react";
import {
  supplierService,
  Supplier,
  PayableInvoice,
} from "@/services/supplierService";
import { toast } from "sonner";

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [supData, invData] = await Promise.all([
        supplierService.getSuppliers(),
        supplierService.getInvoices(),
      ]);
      setSuppliers(supData);
      setInvoices(invData);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar proveedores y cuentas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createInvoice = async (invoiceData: any) => {
    try {
      await supplierService.createInvoice(invoiceData);
      toast.success("Factura registrada");
      fetchData();
      return true;
    } catch (error) {
      toast.error("Error al registrar factura");
      return false;
    }
  };

  const registerPayment = async (invoiceId: number, paymentData: any) => {
    try {
      await supplierService.registerPayment(invoiceId, paymentData);
      toast.success("Pago registrado");
      fetchData();
      return true;
    } catch (error) {
      toast.error("Error al registrar pago");
      return false;
    }
  };

  return {
    suppliers,
    invoices,
    isLoading,
    refresh: fetchData,
    createInvoice,
    registerPayment,
  };
};
