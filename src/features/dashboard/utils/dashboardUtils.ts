import {
  ServiceStats,
  OperatorStats,
  ClientServiceCount,
} from "@/features/dashboard/types";

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
