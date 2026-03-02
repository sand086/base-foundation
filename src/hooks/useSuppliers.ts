// src/hooks/useSuppliers.ts
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supplierService } from "@/services/supplierService";
import { Supplier, PayableInvoice, IndirectCategory } from "@/types/api.types"; // <-- AQUÍ SE AGREGÓ

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
  const [indirectCategories, setIndirectCategories] = useState<
    IndirectCategory[]
  >([]);

  // Separamos los estados de carga para que la vista no llore
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar proveedores");
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setIsLoadingInvoices(true);
    try {
      const data = await supplierService.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar facturas");
    } finally {
      setIsLoadingInvoices(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await supplierService.getIndirectCategories();
      setIndirectCategories(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchInvoices();
    fetchCategories();
  }, [fetchSuppliers, fetchInvoices, fetchCategories]);

  // ==========================
  // FACTURAS
  // ==========================

  const createInvoice = async (invoiceData: Partial<PayableInvoice>) => {
    try {
      await supplierService.createInvoice(invoiceData as any);
      return true;
    } catch (error) {
      toast.error("Error al registrar factura");
      return false;
    }
  };

  const updateInvoice = async (
    id: number,
    invoiceData: Partial<PayableInvoice>,
  ) => {
    try {
      await supplierService.updateInvoice(id, invoiceData);
      return true;
    } catch (error) {
      toast.error("Error al actualizar factura");
      return false;
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    try {
      await supplierService.deleteInvoice(id);
      toast.success("Factura eliminada correctamente");
      fetchInvoices(); // Recargar la tabla
      return true;
    } catch (error) {
      toast.error("Error al eliminar la factura");
      return false;
    }
  };

  // ==========================
  // PAGOS
  // ==========================

  const registerPayment = async (invoiceId: number, paymentData: any) => {
    try {
      await supplierService.registerPayment(invoiceId, paymentData);
      return true;
    } catch (error) {
      toast.error("Error al registrar pago");
      return false;
    }
  };

  // ==========================
  // PROVEEDORES
  // ==========================

  const handleCreateSupplier = async (data: Partial<Supplier>) => {
    try {
      await supplierService.createSupplier(data as any);
      toast.success("Proveedor creado");
      fetchSuppliers(); // Recarga la tabla
      return true;
    } catch (e) {
      toast.error("Error al crear proveedor");
      return false;
    }
  };

  const handleUpdateSupplier = async (id: number, data: Partial<Supplier>) => {
    try {
      await supplierService.updateSupplier(id, data);
      toast.success("Proveedor actualizado");
      fetchSuppliers(); // Recarga la tabla
      return true;
    } catch (e) {
      toast.error("Error al actualizar proveedor");
      return false;
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    try {
      await supplierService.deleteSupplier(id);
      toast.success("Proveedor eliminado");
      fetchSuppliers();
      return true;
    } catch (e) {
      toast.error("Error al eliminar proveedor");
      return false;
    }
  };

  // ==========================
  // CATEGORÍAS INDIRECTAS
  // ==========================

  const handleUpdateCategory = async (
    id: number,
    data: Partial<IndirectCategory>,
  ) => {
    try {
      await supplierService.updateIndirectCategory(id, data);
      toast.success("Categoría actualizada");
      fetchCategories(); // Recarga la lista
      return true;
    } catch (error) {
      toast.error("Error al actualizar categoría");
      return false;
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await supplierService.deleteIndirectCategory(id);
      toast.success("Categoría eliminada");
      fetchCategories(); // Recarga la lista
      return true;
    } catch (error) {
      toast.error("Error al eliminar categoría (¿está en uso?)");
      return false;
    }
  };

  const handleCreateCategory = async (input: {
    nombre: string;
    tipo: "fijo" | "variable";
  }) => {
    try {
      const created = await supplierService.createIndirectCategory(input);
      fetchCategories(); // Recarga la lista
      return created;
    } catch (error) {
      toast.error("Error al crear categoría de gasto");
      return null;
    }
  };

  // Asegúrate de agregarlas en el 'return' del hook:
  return {
    suppliers,
    invoices,
    indirectCategories,
    isLoadingSuppliers,
    isLoadingInvoices,

    refreshSuppliers: fetchSuppliers,
    refreshInvoices: fetchInvoices,

    createInvoice,
    updateInvoice,
    deleteInvoice: handleDeleteInvoice,

    registerPayment,

    createSupplier: handleCreateSupplier,
    updateSupplier: handleUpdateSupplier,
    deleteSupplier: handleDeleteSupplier,

    createIndirectCategory: handleCreateCategory, // Faltaba exportar esta función
    updateIndirectCategory: handleUpdateCategory,
    deleteIndirectCategory: handleDeleteCategory,
  };
};
