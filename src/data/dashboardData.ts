// Extended Dashboard Mock Data for KPIs and Charts

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
  status: 'en_ruta' | 'detenido' | 'retraso' | 'entregado' | 'programado';
  date: string;
  unitNumber: string;
}

// Service statistics for current period
export const mockServiceStats: ServiceStats = {
  totalServices: 1240,
  onTimeCount: 1142,
  lateCount: 98,
  estimatedRevenue: 4580000,
  onTimePercentage: 92.1,
};

// Top 5 clients by service count
export const mockClientServices: ClientServiceCount[] = [
  { client: 'Corporativo Logístico Alfa S.A. de C.V.', shortName: 'Corp. Logístico Alfa', count: 312, revenue: 1250000 },
  { client: 'Macro Centro Distribución S.A.', shortName: 'Macro Centro', count: 278, revenue: 980000 },
  { client: 'AutoPartes Premium MX', shortName: 'AutoPartes Premium', count: 245, revenue: 875000 },
  { client: 'Farmacias Unidas del Norte', shortName: 'Farmacias Unidas', count: 198, revenue: 720000 },
  { client: 'Sabino del Bene Logistics', shortName: 'Sabino del Bene', count: 156, revenue: 580000 },
];

// Operator statistics
export const mockOperatorStats: OperatorStats[] = [
  { name: 'Juan Pérez González', shortName: 'J. Pérez', trips: 89, incidents: 2, onTimeRate: 97.8 },
  { name: 'Roberto Martínez Luna', shortName: 'R. Martínez', trips: 82, incidents: 5, onTimeRate: 93.9 },
  { name: 'Carlos Hernández Ruiz', shortName: 'C. Hernández', trips: 78, incidents: 8, onTimeRate: 89.7 },
  { name: 'Miguel Ángel Soto', shortName: 'M. Soto', trips: 75, incidents: 3, onTimeRate: 96.0 },
  { name: 'Fernando García Vega', shortName: 'F. García', trips: 71, incidents: 1, onTimeRate: 98.6 },
  { name: 'Luis Ramírez Torres', shortName: 'L. Ramírez', trips: 68, incidents: 7, onTimeRate: 89.7 },
  { name: 'Pedro Sánchez Villa', shortName: 'P. Sánchez', trips: 65, incidents: 4, onTimeRate: 93.8 },
  { name: 'Antonio López Cruz', shortName: 'A. López', trips: 62, incidents: 9, onTimeRate: 85.5 },
];

// Recent services (last 10)
export const mockRecentServices: RecentService[] = [
  {
    id: 'SRV-2025-001',
    clientId: 'CLI-001',
    clientName: 'Corporativo Logístico Alfa',
    route: 'CDMX → Monterrey',
    origin: 'CDMX',
    destination: 'Monterrey',
    operator: 'Juan Pérez González',
    operatorId: 'OP-001',
    status: 'en_ruta',
    date: '2025-01-17',
    unitNumber: 'TR-204',
  },
  {
    id: 'SRV-2025-002',
    clientId: 'CLI-005',
    clientName: 'Sabino del Bene Logistics',
    route: 'Veracruz → Guadalajara',
    origin: 'Veracruz',
    destination: 'Guadalajara',
    operator: 'Roberto Martínez Luna',
    operatorId: 'OP-002',
    status: 'detenido',
    date: '2025-01-17',
    unitNumber: 'TR-118',
  },
  {
    id: 'SRV-2025-003',
    clientId: 'CLI-003',
    clientName: 'AutoPartes Premium MX',
    route: 'Laredo → Querétaro',
    origin: 'Laredo',
    destination: 'Querétaro',
    operator: 'Carlos Hernández Ruiz',
    operatorId: 'OP-003',
    status: 'retraso',
    date: '2025-01-17',
    unitNumber: 'TR-156',
  },
  {
    id: 'SRV-2025-004',
    clientId: 'CLI-004',
    clientName: 'Farmacias Unidas del Norte',
    route: 'Guadalajara → León',
    origin: 'Guadalajara',
    destination: 'León',
    operator: 'Miguel Ángel Soto',
    operatorId: 'OP-004',
    status: 'en_ruta',
    date: '2025-01-17',
    unitNumber: 'TR-089',
  },
  {
    id: 'SRV-2025-005',
    clientId: 'CLI-002',
    clientName: 'Macro Centro Distribución',
    route: 'Manzanillo → CDMX',
    origin: 'Manzanillo',
    destination: 'CDMX',
    operator: 'Fernando García Vega',
    operatorId: 'OP-005',
    status: 'en_ruta',
    date: '2025-01-17',
    unitNumber: 'TR-201',
  },
  {
    id: 'SRV-2025-006',
    clientId: 'CLI-001',
    clientName: 'Corporativo Logístico Alfa',
    route: 'Querétaro → Monterrey',
    origin: 'Querétaro',
    destination: 'Monterrey',
    operator: 'Luis Ramírez Torres',
    operatorId: 'OP-006',
    status: 'entregado',
    date: '2025-01-16',
    unitNumber: 'TR-210',
  },
  {
    id: 'SRV-2025-007',
    clientId: 'CLI-003',
    clientName: 'AutoPartes Premium MX',
    route: 'Silao → Puebla',
    origin: 'Silao',
    destination: 'Puebla',
    operator: 'Pedro Sánchez Villa',
    operatorId: 'OP-007',
    status: 'programado',
    date: '2025-01-18',
    unitNumber: 'TR-145',
  },
  {
    id: 'SRV-2025-008',
    clientId: 'CLI-002',
    clientName: 'Macro Centro Distribución',
    route: 'CDMX → Aguascalientes',
    origin: 'CDMX',
    destination: 'Aguascalientes',
    operator: 'Antonio López Cruz',
    operatorId: 'OP-008',
    status: 'retraso',
    date: '2025-01-17',
    unitNumber: 'TR-178',
  },
  {
    id: 'SRV-2025-009',
    clientId: 'CLI-004',
    clientName: 'Farmacias Unidas del Norte',
    route: 'Monterrey → Saltillo',
    origin: 'Monterrey',
    destination: 'Saltillo',
    operator: 'Juan Pérez González',
    operatorId: 'OP-001',
    status: 'entregado',
    date: '2025-01-16',
    unitNumber: 'TR-204',
  },
  {
    id: 'SRV-2025-010',
    clientId: 'CLI-005',
    clientName: 'Sabino del Bene Logistics',
    route: 'CDMX → Veracruz',
    origin: 'CDMX',
    destination: 'Veracruz',
    operator: 'Roberto Martínez Luna',
    operatorId: 'OP-002',
    status: 'en_ruta',
    date: '2025-01-17',
    unitNumber: 'TR-118',
  },
];

// Chart data for On-Time vs Late pie chart
export const getOnTimeVsLateData = (stats: ServiceStats) => [
  { name: 'A Tiempo', value: stats.onTimeCount, fill: 'hsl(var(--brand-green))' },
  { name: 'Tardíos', value: stats.lateCount, fill: 'hsl(var(--brand-red))' },
];

// Chart data for top clients bar chart
export const getTopClientsChartData = (clients: ClientServiceCount[]) =>
  clients.slice(0, 5).map((c) => ({
    name: c.shortName,
    servicios: c.count,
    ingresos: c.revenue,
  }));

// Chart data for operator trips bar chart
export const getOperatorTripsData = (operators: OperatorStats[]) =>
  operators.slice(0, 5).map((o) => ({
    name: o.shortName,
    viajes: o.trips,
  }));

// Chart data for operator incidents bar chart
export const getOperatorIncidentsData = (operators: OperatorStats[]) =>
  [...operators]
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 5)
    .map((o) => ({
      name: o.shortName,
      incidencias: o.incidents,
    }));
