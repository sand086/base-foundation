// Tipos de Unidad - Configuración dinámica del sistema

export interface TipoUnidad {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string; // emoji o nombre de icono
  activo: boolean;
  createdAt: string;
}

// Tipos de unidad predeterminados del sistema
export const defaultTiposUnidad: TipoUnidad[] = [
  {
    id: 'tipo-sencillo',
    nombre: 'Sencillo',
    descripcion: 'Tractocamión con un solo remolque',
    icono: '🚛',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-full',
    nombre: 'Full',
    descripcion: 'Tractocamión con doble remolque',
    icono: '🚚',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-rabon',
    nombre: 'Rabón',
    descripcion: 'Camión rígido de 3 ejes',
    icono: '📦',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-caja-seca',
    nombre: 'Caja Seca',
    descripcion: 'Remolque cerrado para carga general',
    icono: '📦',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-refrigerado',
    nombre: 'Refrigerado',
    descripcion: 'Remolque con sistema de refrigeración',
    icono: '❄️',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-plataforma',
    nombre: 'Plataforma',
    descripcion: 'Remolque abierto para carga pesada',
    icono: '🛻',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-cama-baja',
    nombre: 'Cama Baja',
    descripcion: 'Plataforma baja para maquinaria',
    icono: '🏗️',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-montacargas',
    nombre: 'Montacargas',
    descripcion: 'Equipo de maniobras interno',
    icono: '🏭',
    activo: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'tipo-utilitario',
    nombre: 'Utilitario',
    descripcion: 'Vehículos ligeros de apoyo',
    icono: '🚗',
    activo: true,
    createdAt: '2024-01-01',
  },
];

// Activos patrimoniales mock para vista Patrimonial
export interface ActivoPatrimonial {
  id: string;
  numeroEconomico: string;
  tipoUnidad: string;
  marca: string;
  modelo: string;
  year: number;
  vin: string;
  valorAdquisicion: number;
  fechaAdquisicion: string;
  estatus: 'operativo' | 'baja_venta' | 'baja_siniestro' | 'baja_chatarra' | 'en_tramite';
  fechaBaja?: string;
  motivoBaja?: string;
  observaciones?: string;
}

export const mockActivosPatrimoniales: ActivoPatrimonial[] = [
  {
    id: 'ACT-001',
    numeroEconomico: 'TR-204',
    tipoUnidad: 'full',
    marca: 'Freightliner',
    modelo: 'Cascadia',
    year: 2022,
    vin: '1FUJGBDV8DLBP1234',
    valorAdquisicion: 2850000,
    fechaAdquisicion: '2022-03-15',
    estatus: 'operativo',
  },
  {
    id: 'ACT-002',
    numeroEconomico: 'TR-118',
    tipoUnidad: 'full',
    marca: 'Kenworth',
    modelo: 'T680',
    year: 2021,
    vin: '1XKYD49X6LJ123456',
    valorAdquisicion: 3100000,
    fechaAdquisicion: '2021-06-20',
    estatus: 'operativo',
  },
  {
    id: 'ACT-003',
    numeroEconomico: 'TR-156',
    tipoUnidad: 'sencillo',
    marca: 'Volvo',
    modelo: 'VNL 760',
    year: 2023,
    vin: '4V4NC9EH2PN789012',
    valorAdquisicion: 3250000,
    fechaAdquisicion: '2023-01-10',
    estatus: 'operativo',
  },
  {
    id: 'ACT-004',
    numeroEconomico: 'TR-089',
    tipoUnidad: 'Rabón',
    marca: 'International',
    modelo: 'LT625',
    year: 2020,
    vin: '3HSDJSJR0LN654321',
    valorAdquisicion: 1850000,
    fechaAdquisicion: '2020-08-05',
    estatus: 'operativo',
  },
  {
    id: 'ACT-005',
    numeroEconomico: 'TR-201',
    tipoUnidad: 'full',
    marca: 'Freightliner',
    modelo: 'Cascadia',
    year: 2022,
    vin: '1FUJGBDV8DLBP5678',
    valorAdquisicion: 2850000,
    fechaAdquisicion: '2022-04-01',
    estatus: 'operativo',
  },
  {
    id: 'ACT-006',
    numeroEconomico: 'REM-001',
    tipoUnidad: 'Caja Seca',
    marca: 'Utility',
    modelo: '4000DX',
    year: 2021,
    vin: '1UYFS2483LA123456',
    valorAdquisicion: 650000,
    fechaAdquisicion: '2021-02-15',
    estatus: 'operativo',
  },
  {
    id: 'ACT-007',
    numeroEconomico: 'REM-002',
    tipoUnidad: 'Caja Seca',
    marca: 'Wabash',
    modelo: 'DuraPlate',
    year: 2020,
    vin: '1JJV532D0LL654321',
    valorAdquisicion: 580000,
    fechaAdquisicion: '2020-09-10',
    estatus: 'operativo',
  },
  {
    id: 'ACT-008',
    numeroEconomico: 'REM-003',
    tipoUnidad: 'Refrigerado',
    marca: 'Great Dane',
    modelo: 'Champion CL',
    year: 2022,
    vin: '1GRAA0628CB789012',
    valorAdquisicion: 1250000,
    fechaAdquisicion: '2022-07-20',
    estatus: 'operativo',
  },
  {
    id: 'ACT-009',
    numeroEconomico: 'PLAT-001',
    tipoUnidad: 'Plataforma',
    marca: 'Fontaine',
    modelo: 'Flatbed 48ft',
    year: 2019,
    vin: '13N14830XK1234567',
    valorAdquisicion: 420000,
    fechaAdquisicion: '2019-11-05',
    estatus: 'baja_venta',
    fechaBaja: '2024-06-15',
    motivoBaja: 'Venta a terceros',
    observaciones: 'Vendido a Transportes del Bajío',
  },
  {
    id: 'ACT-010',
    numeroEconomico: 'MONT-001',
    tipoUnidad: 'Montacargas',
    marca: 'Toyota',
    modelo: '8FGU25',
    year: 2021,
    vin: '7FGCU2501234',
    valorAdquisicion: 450000,
    fechaAdquisicion: '2021-04-10',
    estatus: 'operativo',
  },
  {
    id: 'ACT-011',
    numeroEconomico: 'CAM-001',
    tipoUnidad: 'Cama Baja',
    marca: 'Landoll',
    modelo: '440A',
    year: 2020,
    vin: '4L6CA1625LG123456',
    valorAdquisicion: 780000,
    fechaAdquisicion: '2020-12-01',
    estatus: 'operativo',
  },
  {
    id: 'ACT-012',
    numeroEconomico: 'TR-050',
    tipoUnidad: 'full',
    marca: 'Kenworth',
    modelo: 'T800',
    year: 2018,
    vin: '1XKYD49X6JL987654',
    valorAdquisicion: 2500000,
    fechaAdquisicion: '2018-05-20',
    estatus: 'baja_siniestro',
    fechaBaja: '2024-01-10',
    motivoBaja: 'Accidente en carretera',
    observaciones: 'Pérdida total, reclamación de seguro en proceso',
  },
];
