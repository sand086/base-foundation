/* generated using openapi-typescript-codegen */
import { FinanceService } from "@/api/generated/services/FinanceService";
import type { app__modules__finance__schemas__CostCenterResponse as CostCenterResponse } from "@/api/generated/models/app__modules__finance__schemas__CostCenterResponse";
export const costCentersService = {
  /**
   * Obtiene todos los centros de costos activos
   * Utiliza el método autogenerado del FinanceService
   */
  getAll: async (): Promise<CostCenterResponse[]> => {
    try {
      return await FinanceService.readCostCentersApiFinanceCostCentersGet();
    } catch (error) {
      console.error("Error en costCentersService.getAll:", error);
      throw error;
    }
  },
};
