import { useState, useEffect, useCallback } from "react";
import { costCentersService } from "../services/costCenters";
import type { CostCenterResponse } from "@/api/generated/models/CostCenterResponse";
import { toast } from "sonner";

export function useCostCenters() {
  const [costCenters, setCostCenters] = useState<CostCenterResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCC = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await costCentersService.getAll();
      // Filtramos para asegurar que solo cargue los activos
      setCostCenters(data.filter((cc) => cc.activo));
    } catch (err) {
      toast.error("Error al cargar el catálogo de Centros de Costos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCC();
  }, [fetchCC]);

  return { costCenters, isLoading, refetch: fetchCC };
}
