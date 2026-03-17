import axiosClient from "@/api/axiosClient";

// ==========================================
// 1. INTERFACES (Se mantienen igual, coinciden con Pydantic)
// ==========================================
export interface ServiceStats {
  totalServices: number;
  onTimeCount: number;
  lateCount: number;
  estimatedRevenue: number;
  onTimePercentage: number;
}

export interface ClientServiceCount {
  client: string;
  shortName: string;
  count: number;
  revenue: number;
}

export interface OperatorStats {
  name: string;
  shortName: string;
  trips: number;
  incidents: number;
  onTimeRate: number;
}

export interface RecentService {
  id: string;
  clientId: string;
  clientName: string;
  route: string;
  origin: string;
  destination: string;
  operator: string;
  operatorId: string;
  status:
    | "en_ruta"
    | "detenido"
    | "retraso"
    | "entregado"
    | "programado"
    | "creado"
    | "en_transito";
  date: string;
  unitNumber: string;
}

export interface DashboardData {
  serviceStats: ServiceStats;
  clientServices: ClientServiceCount[];
  operatorStats: OperatorStats[];
  recentServices: RecentService[];
}

// ==========================================
// 2. HELPERS PARA GRÁFICAS (Se mantienen igual)
// ==========================================
export const getOnTimeVsLateData = (stats: ServiceStats) => [
  {
    name: "A Tiempo",
    value: stats.onTimeCount,
    fill: "hsl(var(--brand-green))",
  },
  { name: "Tardíos", value: stats.lateCount, fill: "hsl(var(--brand-red))" },
];

export const getOperatorTripsData = (operators: OperatorStats[]) =>
  operators.slice(0, 5).map((o) => ({ name: o.shortName, viajes: o.trips }));

export const getOperatorIncidentsData = (operators: OperatorStats[]) =>
  [...operators]
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 5)
    .map((o) => ({ name: o.shortName, incidencias: o.incidents }));

export const getTopClientsChartData = (clients: ClientServiceCount[]) =>
  clients
    .slice(0, 5)
    .map((c) => ({
      name: c.shortName,
      servicios: c.count,
      ingresos: c.revenue,
    }));

// ==========================================
// 3. SERVICIO API (¡ACTUALIZADO!)
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
    // 🚀 Cambiamos los parámetros para que coincidan con los de Python (snake_case)
    const params = {
      start_date: startDate,
      end_date: endDate,
    };

    // 📡 La ruta es /dashboard/stats según tu api_router de Python
    const { data } = await axiosClient.get("/dashboard/stats", { params });
    return data;
  },
};
