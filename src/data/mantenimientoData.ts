// Inventario de Refacciones (Spare Parts Inventory)
export interface InventoryItem {
  id: string;
  sku: string;
  descripcion: string;
  categoria: 'Motor' | 'Frenos' | 'Eléctrico' | 'Suspensión' | 'Transmisión' | 'General';
  stockActual: number;
  stockMinimo: number;
  ubicacion: string;
  precioUnitario: number;
}

export interface WorkOrder {
  id: string;
  folio: string;
  unidadId: string;
  unidadNumero: string;
  mecanicoId: string;
  mecanicoNombre: string;
  descripcionProblema: string;
  status: 'abierta' | 'en_progreso' | 'cerrada';
  fechaApertura: string;
  fechaCierre?: string;
  partes: { itemId: string; sku: string; cantidad: number }[];
}

export interface Mechanic {
  id: string;
  nombre: string;
  especialidad: string;
}

export interface FleetUnit {
  id: string;
  numero: string;
  marca: string;
  modelo: string;
}

export const mockInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    sku: 'FIL-ACE-001',
    descripcion: 'Filtro de Aceite Motor Cummins ISX',
    categoria: 'Motor',
    stockActual: 45,
    stockMinimo: 20,
    ubicacion: 'Rack A-1',
    precioUnitario: 185,
  },
  {
    id: 'inv-2',
    sku: 'FIL-AIR-002',
    descripcion: 'Filtro de Aire Primario Donaldson',
    categoria: 'Motor',
    stockActual: 12,
    stockMinimo: 15,
    ubicacion: 'Rack A-2',
    precioUnitario: 520,
  },
  {
    id: 'inv-3',
    sku: 'BAL-FRE-001',
    descripcion: 'Balatas Freno Eje Delantero',
    categoria: 'Frenos',
    stockActual: 8,
    stockMinimo: 10,
    ubicacion: 'Rack B-1',
    precioUnitario: 1250,
  },
  {
    id: 'inv-4',
    sku: 'BAL-FRE-002',
    descripcion: 'Balatas Freno Eje Trasero',
    categoria: 'Frenos',
    stockActual: 24,
    stockMinimo: 10,
    ubicacion: 'Rack B-2',
    precioUnitario: 1450,
  },
  {
    id: 'inv-5',
    sku: 'BAT-ELE-001',
    descripcion: 'Batería 12V 1000 CCA',
    categoria: 'Eléctrico',
    stockActual: 3,
    stockMinimo: 5,
    ubicacion: 'Rack C-1',
    precioUnitario: 3200,
  },
  {
    id: 'inv-6',
    sku: 'ALT-ELE-001',
    descripcion: 'Alternador Delco Remy 24V',
    categoria: 'Eléctrico',
    stockActual: 2,
    stockMinimo: 3,
    ubicacion: 'Rack C-2',
    precioUnitario: 8500,
  },
  {
    id: 'inv-7',
    sku: 'AMO-SUS-001',
    descripcion: 'Amortiguador Cabina Delantero',
    categoria: 'Suspensión',
    stockActual: 18,
    stockMinimo: 8,
    ubicacion: 'Rack D-1',
    precioUnitario: 2100,
  },
  {
    id: 'inv-8',
    sku: 'BOL-SUS-001',
    descripcion: 'Bolsa de Aire Suspensión Trasera',
    categoria: 'Suspensión',
    stockActual: 6,
    stockMinimo: 6,
    ubicacion: 'Rack D-2',
    precioUnitario: 4800,
  },
  {
    id: 'inv-9',
    sku: 'ACE-GEN-001',
    descripcion: 'Aceite Motor 15W40 (Cubeta 19L)',
    categoria: 'General',
    stockActual: 32,
    stockMinimo: 20,
    ubicacion: 'Rack E-1',
    precioUnitario: 1850,
  },
  {
    id: 'inv-10',
    sku: 'FIL-COM-001',
    descripcion: 'Filtro Combustible Separador',
    categoria: 'Motor',
    stockActual: 5,
    stockMinimo: 12,
    ubicacion: 'Rack A-3',
    precioUnitario: 380,
  },
  {
    id: 'inv-11',
    sku: 'COR-TRA-001',
    descripcion: 'Correa Transmisión Ventilador',
    categoria: 'Transmisión',
    stockActual: 14,
    stockMinimo: 8,
    ubicacion: 'Rack F-1',
    precioUnitario: 650,
  },
  {
    id: 'inv-12',
    sku: 'EMB-TRA-001',
    descripcion: 'Kit Embrague Eaton Fuller',
    categoria: 'Transmisión',
    stockActual: 1,
    stockMinimo: 2,
    ubicacion: 'Rack F-2',
    precioUnitario: 18500,
  },
];

export const mockMechanics: Mechanic[] = [
  { id: 'mec-1', nombre: 'Juan Pérez García', especialidad: 'Motor y Transmisión' },
  { id: 'mec-2', nombre: 'Roberto Sánchez López', especialidad: 'Frenos y Suspensión' },
  { id: 'mec-3', nombre: 'Miguel Ángel Rodríguez', especialidad: 'Sistema Eléctrico' },
  { id: 'mec-4', nombre: 'Carlos Hernández Ruiz', especialidad: 'General' },
];

export const mockFleetUnits: FleetUnit[] = [
  { id: 'unit-1', numero: 'TR-201', marca: 'Freightliner', modelo: 'Cascadia 2022' },
  { id: 'unit-2', numero: 'TR-202', marca: 'Kenworth', modelo: 'T680 2021' },
  { id: 'unit-3', numero: 'TR-203', marca: 'International', modelo: 'LT 2023' },
  { id: 'unit-4', numero: 'TR-204', marca: 'Volvo', modelo: 'VNL 760 2022' },
  { id: 'unit-5', numero: 'TR-205', marca: 'Peterbilt', modelo: '579 2021' },
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'ot-1',
    folio: 'OT-2024-0156',
    unidadId: 'unit-1',
    unidadNumero: 'TR-201',
    mecanicoId: 'mec-1',
    mecanicoNombre: 'Juan Pérez García',
    descripcionProblema: 'Cambio de aceite y filtros programado',
    status: 'cerrada',
    fechaApertura: '2024-01-15',
    fechaCierre: '2024-01-15',
    partes: [
      { itemId: 'inv-1', sku: 'FIL-ACE-001', cantidad: 1 },
      { itemId: 'inv-9', sku: 'ACE-GEN-001', cantidad: 2 },
    ],
  },
  {
    id: 'ot-2',
    folio: 'OT-2024-0157',
    unidadId: 'unit-4',
    unidadNumero: 'TR-204',
    mecanicoId: 'mec-2',
    mecanicoNombre: 'Roberto Sánchez López',
    descripcionProblema: 'Revisión sistema de frenos - ruido anormal',
    status: 'en_progreso',
    fechaApertura: '2024-01-18',
    partes: [
      { itemId: 'inv-3', sku: 'BAL-FRE-001', cantidad: 2 },
    ],
  },
  {
    id: 'ot-3',
    folio: 'OT-2024-0158',
    unidadId: 'unit-2',
    unidadNumero: 'TR-202',
    mecanicoId: 'mec-3',
    mecanicoNombre: 'Miguel Ángel Rodríguez',
    descripcionProblema: 'Falla en alternador - no carga baterías',
    status: 'abierta',
    fechaApertura: '2024-01-20',
    partes: [],
  },
];
