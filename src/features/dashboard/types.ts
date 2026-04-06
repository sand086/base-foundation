// src/features/dashboard/types.ts

export interface ServiceStats {
  totalServices: number;
  onTimeCount: number;
  lateCount: number;
  estimatedRevenue: number;
  onTimePercentage: number;
}

export interface ClientServiceCount {
  id?: number | string;
  name: string; // Reemplaza a 'client' para estandarizar
  shortName: string;
  count: number;
  revenue: number;
}

export interface OperatorStats {
  id?: number | string;
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
