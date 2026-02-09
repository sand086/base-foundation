import { useState, useEffect, useCallback } from "react";
import { operatorService, Operador } from "@/services/operatorService";
import { toast } from "sonner";

export const useOperators = () => {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await operatorService.getAll();
      setOperadores(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar operadores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  // CORRECCIÓN: Usamos Omit<Operador, "id"> para crear, ya que no tenemos ID aún
  const createOperator = async (operador: Omit<Operador, "id">) => {
    try {
      await operatorService.create(operador);
      toast.success("Operador registrado exitosamente");
      fetchOperators();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear operador");
      return false;
    }
  };

  // CORRECCIÓN: id es number
  const updateOperator = async (id: number, operador: Partial<Operador>) => {
    try {
      await operatorService.update(id, operador);
      toast.success("Operador actualizado");
      fetchOperators();
      return true;
    } catch (error: any) {
      toast.error("Error al actualizar operador");
      return false;
    }
  };

  // CORRECCIÓN: id es number
  const deleteOperator = async (id: number) => {
    try {
      await operatorService.delete(id);
      toast.success("Operador dado de baja");
      fetchOperators();
      return true;
    } catch (error) {
      toast.error("Error al eliminar operador");
      return false;
    }
  };

  return {
    operadores,
    isLoading,
    createOperator,
    updateOperator,
    deleteOperator,
    refreshOperators: fetchOperators,
  };
};
