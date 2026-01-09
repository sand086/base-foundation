// Mock Data for Rápidos 3T - TMS

export interface Trip {
  id: string;
  clientName: string;
  unitNumber: string;
  operator: string;
  origin: string;
  destination: string;
  status: 'en_ruta' | 'detenido' | 'retraso' | 'entregado';
  lastUpdate: string;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  time: string;
  event: string;
  type: 'checkpoint' | 'alert' | 'info';
}

export interface Client {
  id: string;
  razónSocial: string;
  rfc: string;
  contactoPrincipal: string;
  telefono: string;
  estatus: 'activo' | 'pendiente' | 'incompleto';
  subClientes: number;
  tarifasActivas: string[];
}

export interface SubClient {
  id: string;
  clientId: string;
  nombre: string;
  alias: string;
  direccion: string;
  estado: string;
  municipio: string;
  tipoOperacion: 'importación' | 'exportación' | 'nacional';
  estatus: 'activo' | 'incompleto';
}

export interface Unit {
  id: string;
  numeroEconomico: string;
  placas: string;
  vin: string;
  modelo: string;
  marca: string;
  year: number;
  status: 'disponible' | 'en_ruta' | 'mantenimiento' | 'bloqueado';
  tires: Tire[];
  documents: Document[];
}

export interface Tire {
  id: string;
  position: string;
  marca: string;
  profundidad: number; // mm
  estado: 'normal' | 'ponchada' | 'desgastada';
  renovado: number;
  marcajeInterno: string;
}

export interface Document {
  name: string;
  vencimiento: string;
  obligatorio: boolean;
  estatus: 'vigente' | 'próximo' | 'vencido';
}

export interface FuelRecord {
  id: string;
  viajeId: string;
  fecha: string;
  unidad: string;
  operador: string;
  kmsRecorridos: number;
  litrosECM: number;
  litrosTicket: number;
  diferenciaPorcentaje: number;
  estatus: 'conciliado' | 'pendiente' | 'vale_cobro';
}

export interface Invoice {
  id: string;
  folio: string;
  cliente: string;
  monto: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estatus: 'pagada' | 'por_vencer' | 'vencida';
  diasVencida?: number;
}

// Mock Trips Data
export const mockTrips: Trip[] = [
  {
    id: 'SRV-2025-001',
    clientName: 'Corporativo Logístico Alfa',
    unitNumber: 'TR-204',
    operator: 'Juan Pérez González',
    origin: 'CDMX',
    destination: 'Monterrey',
    status: 'en_ruta',
    lastUpdate: '2025-01-09 14:30',
    timeline: [
      { time: '08:00', event: 'Salida de origen - CDMX', type: 'checkpoint' },
      { time: '10:15', event: 'Caseta Cuautitlán - TAG', type: 'checkpoint' },
      { time: '12:30', event: 'Caseta Palmillas - Efectivo', type: 'checkpoint' },
      { time: '14:30', event: 'En tránsito - San Luis Potosí', type: 'info' },
    ],
  },
  {
    id: 'SRV-2025-002',
    clientName: 'Sabino del Bene Logistics',
    unitNumber: 'TR-118',
    operator: 'Roberto Martínez Luna',
    origin: 'Veracruz',
    destination: 'Guadalajara',
    status: 'detenido',
    lastUpdate: '2025-01-09 13:45',
    timeline: [
      { time: '06:00', event: 'Salida de origen - Puerto Veracruz', type: 'checkpoint' },
      { time: '09:00', event: 'Caseta La Tinaja - TAG', type: 'checkpoint' },
      { time: '11:30', event: 'Parada técnica - Puebla', type: 'info' },
      { time: '13:45', event: 'Detenido - Revisión mecánica', type: 'alert' },
    ],
  },
  {
    id: 'SRV-2025-003',
    clientName: 'AutoPartes Premium MX',
    unitNumber: 'TR-156',
    operator: 'Carlos Hernández Ruiz',
    origin: 'Laredo',
    destination: 'Querétaro',
    status: 'retraso',
    lastUpdate: '2025-01-09 12:00',
    timeline: [
      { time: '04:00', event: 'Cruce frontera - Laredo', type: 'checkpoint' },
      { time: '07:30', event: 'Caseta Monterrey Norte - TAG', type: 'checkpoint' },
      { time: '10:00', event: 'Retraso por tráfico - Saltillo', type: 'alert' },
      { time: '12:00', event: '2 horas de retraso estimado', type: 'alert' },
    ],
  },
  {
    id: 'SRV-2025-004',
    clientName: 'Farmacias Unidas del Norte',
    unitNumber: 'TR-089',
    operator: 'Miguel Ángel Soto',
    origin: 'Guadalajara',
    destination: 'León',
    status: 'en_ruta',
    lastUpdate: '2025-01-09 15:00',
    timeline: [
      { time: '13:00', event: 'Salida de origen - GDL', type: 'checkpoint' },
      { time: '14:15', event: 'Caseta Zapotlanejo - TAG', type: 'checkpoint' },
      { time: '15:00', event: 'Estimado llegada 16:30', type: 'info' },
    ],
  },
  {
    id: 'SRV-2025-005',
    clientName: 'Macro Centro Distribución',
    unitNumber: 'TR-201',
    operator: 'Fernando García Vega',
    origin: 'Manzanillo',
    destination: 'CDMX',
    status: 'en_ruta',
    lastUpdate: '2025-01-09 14:45',
    timeline: [
      { time: '05:00', event: 'Carga en puerto - Manzanillo', type: 'checkpoint' },
      { time: '08:00', event: 'Salida hacia CDMX', type: 'checkpoint' },
      { time: '12:00', event: 'Caseta Atlacomulco - TAG', type: 'checkpoint' },
      { time: '14:45', event: 'Avance 75% de ruta', type: 'info' },
    ],
  },
];

// Mock Clients Data
export const mockClients: Client[] = [
  {
    id: 'CLI-001',
    razónSocial: 'Corporativo Logístico Alfa S.A. de C.V.',
    rfc: 'CLA021001AA1',
    contactoPrincipal: 'Lic. María García',
    telefono: '55 1234 5678',
    estatus: 'activo',
    subClientes: 5,
    tarifasActivas: ['Ruta Troncal Norte', 'Última Milla CDMX'],
  },
  {
    id: 'CLI-002',
    razónSocial: 'Macro Centro Distribución S.A.',
    rfc: 'MCD990215BB2',
    contactoPrincipal: 'Ing. Roberto López',
    telefono: '33 9876 5432',
    estatus: 'pendiente',
    subClientes: 12,
    tarifasActivas: ['Norte', 'CDMX', 'Bajío'],
  },
  {
    id: 'CLI-003',
    razónSocial: 'AutoPartes Premium MX',
    rfc: 'APM110701CC3',
    contactoPrincipal: 'Lic. Ana Martínez',
    telefono: '81 5555 4444',
    estatus: 'activo',
    subClientes: 3,
    tarifasActivas: ['Recolecciones Urgentes'],
  },
  {
    id: 'CLI-004',
    razónSocial: 'Farmacias Unidas del Norte',
    rfc: 'FUN040303DD4',
    contactoPrincipal: 'Dr. Carlos Sánchez',
    telefono: '81 3333 2222',
    estatus: 'activo',
    subClientes: 8,
    tarifasActivas: ['Distribución Nocturna', 'Cadena Fría'],
  },
  {
    id: 'CLI-005',
    razónSocial: 'Sabino del Bene Logistics',
    rfc: 'SBL150812EE5',
    contactoPrincipal: 'Ing. Patricia Vega',
    telefono: '55 7777 8888',
    estatus: 'incompleto',
    subClientes: 2,
    tarifasActivas: [],
  },
];

// Mock Unit with Tires Data
export const mockUnit: Unit = {
  id: 'UNIT-001',
  numeroEconomico: 'TR-204',
  placas: 'AAA-000-A',
  vin: '1HGBH41JXMN109186',
  modelo: 'Freightliner Cascadia',
  marca: 'Freightliner',
  year: 2022,
  status: 'en_ruta',
  tires: [
    { id: 'TL-8821', position: 'Eje 1 - Izq', marca: 'Michelin', profundidad: 4, estado: 'ponchada', renovado: 0, marcajeInterno: '3T-1125-361' },
    { id: 'TL-8822', position: 'Eje 1 - Der', marca: 'Bridgestone', profundidad: 9, estado: 'normal', renovado: 0, marcajeInterno: '3T-1126-105' },
    { id: 'TL-8823', position: 'Eje 2 - Izq', marca: 'Goodyear', profundidad: 12, estado: 'normal', renovado: 2, marcajeInterno: '3T-1201-221' },
    { id: 'TL-8824', position: 'Eje 2 - Der', marca: 'Continental', profundidad: 6, estado: 'normal', renovado: 0, marcajeInterno: '3T-1201-222' },
    { id: 'TL-8825', position: 'Eje 3 - Izq Ext', marca: 'Michelin', profundidad: 11, estado: 'normal', renovado: 1, marcajeInterno: '3T-1202-301' },
    { id: 'TL-8826', position: 'Eje 3 - Izq Int', marca: 'Michelin', profundidad: 10, estado: 'normal', renovado: 1, marcajeInterno: '3T-1202-302' },
    { id: 'TL-8827', position: 'Eje 3 - Der Int', marca: 'Bridgestone', profundidad: 8, estado: 'normal', renovado: 0, marcajeInterno: '3T-1202-303' },
    { id: 'TL-8828', position: 'Eje 3 - Der Ext', marca: 'Bridgestone', profundidad: 7, estado: 'normal', renovado: 0, marcajeInterno: '3T-1202-304' },
  ],
  documents: [
    { name: 'Tarjeta de Circulación', vencimiento: '2025-07-10', obligatorio: true, estatus: 'vigente' },
    { name: 'Póliza de Seguro', vencimiento: '2025-03-15', obligatorio: true, estatus: 'próximo' },
    { name: 'Verificación Ambiental', vencimiento: '2024-12-01', obligatorio: true, estatus: 'vencido' },
    { name: 'Permiso SCT', vencimiento: '2026-01-01', obligatorio: true, estatus: 'vigente' },
  ],
};

// Mock Fuel Records
export const mockFuelRecords: FuelRecord[] = [
  { id: 'FUEL-001', viajeId: 'SRV-2025-001', fecha: '2025-01-09', unidad: 'TR-204', operador: 'Juan Pérez', kmsRecorridos: 450, litrosECM: 180.5, litrosTicket: 185.0, diferenciaPorcentaje: 2.5, estatus: 'conciliado' },
  { id: 'FUEL-002', viajeId: 'SRV-2025-002', fecha: '2025-01-08', unidad: 'TR-118', operador: 'Roberto Martínez', kmsRecorridos: 380, litrosECM: 152.0, litrosTicket: 168.0, diferenciaPorcentaje: 10.5, estatus: 'vale_cobro' },
  { id: 'FUEL-003', viajeId: 'SRV-2025-003', fecha: '2025-01-08', unidad: 'TR-156', operador: 'Carlos Hernández', kmsRecorridos: 520, litrosECM: 208.0, litrosTicket: 212.5, diferenciaPorcentaje: 2.2, estatus: 'conciliado' },
  { id: 'FUEL-004', viajeId: 'SRV-2025-004', fecha: '2025-01-07', unidad: 'TR-089', operador: 'Miguel Soto', kmsRecorridos: 290, litrosECM: 116.0, litrosTicket: 130.0, diferenciaPorcentaje: 12.1, estatus: 'vale_cobro' },
  { id: 'FUEL-005', viajeId: 'SRV-2025-005', fecha: '2025-01-07', unidad: 'TR-201', operador: 'Fernando García', kmsRecorridos: 680, litrosECM: 272.0, litrosTicket: 278.0, diferenciaPorcentaje: 2.2, estatus: 'conciliado' },
  { id: 'FUEL-006', viajeId: 'SRV-2025-006', fecha: '2025-01-06', unidad: 'TR-204', operador: 'Juan Pérez', kmsRecorridos: 410, litrosECM: 164.0, litrosTicket: 180.0, diferenciaPorcentaje: 9.8, estatus: 'vale_cobro' },
];

// Mock Invoices
export const mockInvoices: Invoice[] = [
  { id: 'INV-001', folio: 'A-2025-0001', cliente: 'Corporativo Logístico Alfa', monto: 125000, fechaEmision: '2024-12-15', fechaVencimiento: '2025-01-15', estatus: 'por_vencer', diasVencida: 0 },
  { id: 'INV-002', folio: 'A-2025-0002', cliente: 'Macro Centro Distribución', monto: 89500, fechaEmision: '2024-11-20', fechaVencimiento: '2024-12-20', estatus: 'vencida', diasVencida: 20 },
  { id: 'INV-003', folio: 'A-2025-0003', cliente: 'AutoPartes Premium MX', monto: 67800, fechaEmision: '2024-12-01', fechaVencimiento: '2024-12-31', estatus: 'vencida', diasVencida: 9 },
  { id: 'INV-004', folio: 'A-2025-0004', cliente: 'Farmacias Unidas', monto: 234500, fechaEmision: '2024-12-28', fechaVencimiento: '2025-01-28', estatus: 'por_vencer', diasVencida: 0 },
  { id: 'INV-005', folio: 'A-2025-0005', cliente: 'Sabino del Bene', monto: 156000, fechaEmision: '2024-12-10', fechaVencimiento: '2025-01-10', estatus: 'por_vencer', diasVencida: 0 },
  { id: 'INV-006', folio: 'A-2024-0098', cliente: 'Corporativo Logístico Alfa', monto: 98000, fechaEmision: '2024-11-01', fechaVencimiento: '2024-12-01', estatus: 'pagada' },
];

// Dashboard KPIs
export const dashboardKPIs = {
  onTimeDelivery: 94.2,
  fuelEfficiency: 3.8, // km/L
  activeTrips: 12,
  unitsInMaintenance: 3,
  pendingInvoices: 4,
  totalVencido: 157300,
  totalPorVencer: 515500,
};
