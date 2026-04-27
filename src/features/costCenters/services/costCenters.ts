/* generated using openapi-typescript-codegen */
import { FinanceService } from "@/api/generated/services/FinanceService";
import type { CostCenterResponse } from "@/api/generated/models/CostCenterResponse";

export const costCentersService = {
  /**
   * Obtiene todos los centros de costos activos
   * Utiliza el método autogenerado del FinanceService
   */
  getAll: async (): Promise<CostCenterResponse[]> => {
    try {
      // Usamos el método que detectaste en tu FinanceService
      return await FinanceService.readCostCentersApiFinanceCostCentersGet();
    } catch (error) {
      console.error("Error en costCentersService.getAll:", error);
      throw error;
    }
  },
};
