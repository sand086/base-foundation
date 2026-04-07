import { useState, useEffect, useCallback } from "react";
import { FleetOperatorsService } from "@/api/generated";
import { ApiError } from "@/api/generated/core/ApiError";
import { Operator } from "../types";
import { toast } from "sonner";

export const useOperators = () => {
  const [operadores, setOperadores] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await FleetOperatorsService.readOperatorsApiFleetOperatorsGet();
      setOperadores(data as Operator[]);
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

  const createOperator = async (operador: any) => {
    try {
      await FleetOperatorsService.createOperatorApiFleetOperatorsPost(operador);
      toast.success("Operador registrado exitosamente");
      fetchOperators();
      return true;
    } catch (error) {
      const msg = error instanceof ApiError ? error.body?.detail : "Error al crear operador";
      toast.error(msg || "Error al crear operador");
      return false;
    }
  };

  const updateOperator = async (id: number, operador: any) => {
    try {
      await FleetOperatorsService.updateOperatorApiFleetOperatorsOperatorIdPut(Number(id), operador);
      toast.success("Operador actualizado");
      fetchOperators();
      return true;
    } catch (error) {
      const msg = error instanceof ApiError ? error.body?.detail : "Error al actualizar operador";
      toast.error(msg || "Error al actualizar operador");
      return false;
    }
  };

  const deleteOperator = async (id: number) => {
    try {
      await FleetOperatorsService.deleteOperatorApiFleetOperatorsOperatorIdDelete(Number(id));
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
