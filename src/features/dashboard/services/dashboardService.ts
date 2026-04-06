import axiosClient from "@/api/axiosClient";

// 🚀 IMPORTACIONES FSD (Tus tipos consolidados)
import {
  ServiceStats,
  OperatorStats,
  ClientServiceCount,
  DashboardData,
} from "@/features/dashboard/types";

// ==========================================
// 1. HELPERS PARA GRÁFICAS (Transformación)
// ==========================================

export const getOnTimeVsLateData = (stats: ServiceStats) => [
  {
    name: "A Tiempo",
    value: stats.onTimeCount,
    fill: "hsl(var(--brand-green))",
  },
  {
    name: "Tardíos",
    value: stats.lateCount,
    fill: "hsl(var(--brand-red))",
  },
];

export const getOperatorTripsData = (operators: OperatorStats[]) =>
  operators.slice(0, 5).map((o) => ({
    name: o.shortName,
    viajes: o.trips,
  }));

export const getOperatorIncidentsData = (operators: OperatorStats[]) =>
  [...operators]
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 5)
    .map((o) => ({
      name: o.shortName,
      incidencias: o.incidents,
    }));

export const getTopClientsChartData = (clients: ClientServiceCount[]) =>
  clients.slice(0, 5).map((c) => ({
    name: c.shortName,
    servicios: c.count,
    ingresos: c.revenue,
  }));

// ==========================================
// 2. SERVICIO API (Conexión con Backend)
// ==========================================

export const dashboardService = {
  /**
   * Obtiene las estadísticas reales del backend de FastAPI
   * @param startDate Fecha inicio en formato YYYY-MM-DD
   * @param endDate Fecha fin en formato YYYY-MM-DD
   */
  getStats: async (
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardData> => {
    // Parámetros en snake_case para que Python los lea correctamente
    const params = {
      start_date: startDate,
      end_date: endDate,
    };

    // 📡 Mapeo directo al tipado DashboardData
    const { data } = await axiosClient.get<DashboardData>("/dashboard", {
      params,
    });
    return data;
  },
};
