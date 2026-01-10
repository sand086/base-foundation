// Mock Data for Rápidos 3T - TMS

export interface Trip {
  id: string;
  clientName: string;
  unitNumber: string;
  operator: string;
  origin: string;
  destination: string;
  status: 'en_ruta' | 'detenido' | 'retraso' | 'entregado' | 'accidente';
  lastUpdate: string;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  time: string;
  event: string;
  type: 'checkpoint' | 'alert' | 'info';
}

export interface SubClienteDetalle {
  id: string;
  nombre: string;
  alias: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  tipoOperacion: 'importación' | 'exportación' | 'nacional';
  contacto?: string;
  telefono?: string;
  horarioRecepcion?: string;
  estatus: 'activo' | 'inactivo';
}

export interface Client {
  id: string;
  razónSocial: string;
  rfc: string;
  regimenFiscal?: string;
  usoCFDI?: string;
  contactoPrincipal: string;
  telefono: string;
  email?: string;
  direccionFiscal?: string;
  estatus: 'activo' | 'pendiente' | 'incompleto';
  subClientes: number;
  subClientesDetalle: SubClienteDetalle[];
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

// Mock Clients Data with SubClientes Details
export const mockClients: Client[] = [
  {
    id: 'CLI-001',
    razónSocial: 'Corporativo Logístico Alfa S.A. de C.V.',
    rfc: 'CLA021001AA1',
    regimenFiscal: '601',
    usoCFDI: 'G03',
    contactoPrincipal: 'Lic. María García',
    telefono: '55 1234 5678',
    email: 'mgarcia@corplogalf.com',
    direccionFiscal: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, CP 03100',
    estatus: 'activo',
    subClientes: 5,
    subClientesDetalle: [
      {
        id: 'SUB-001-A',
        nombre: 'Planta Norte Monterrey',
        alias: 'Planta Norte',
        direccion: 'Blvd. Díaz Ordaz 500',
        ciudad: 'Monterrey',
        estado: 'Nuevo León',
        codigoPostal: '64000',
        tipoOperacion: 'nacional',
        contacto: 'Ing. Roberto Salinas',
        telefono: '81 5555 4444',
        horarioRecepcion: 'Lun-Vie 7:00-17:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-001-B',
        nombre: 'Centro de Distribución Sur',
        alias: 'CEDIS Sur',
        direccion: 'Carr. Tlalpan 3456',
        ciudad: 'CDMX',
        estado: 'Ciudad de México',
        codigoPostal: '14000',
        tipoOperacion: 'nacional',
        contacto: 'Lic. Ana Torres',
        telefono: '55 3333 2222',
        horarioRecepcion: 'Lun-Sab 6:00-22:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-001-C',
        nombre: 'Almacén Querétaro',
        alias: 'Almacén QRO',
        direccion: 'Parque Industrial Benito Juárez, Nave 12',
        ciudad: 'Querétaro',
        estado: 'Querétaro',
        codigoPostal: '76100',
        tipoOperacion: 'nacional',
        contacto: 'Carlos Mendoza',
        telefono: '442 123 4567',
        horarioRecepcion: 'Lun-Vie 8:00-18:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-001-D',
        nombre: 'Recinto Fiscal Nuevo Laredo',
        alias: 'Aduana NLD',
        direccion: 'Recinto Fiscalizado Estratégico',
        ciudad: 'Nuevo Laredo',
        estado: 'Tamaulipas',
        codigoPostal: '88000',
        tipoOperacion: 'importación',
        contacto: 'Agente Aduanal Pérez',
        telefono: '867 890 1234',
        horarioRecepcion: '24/7',
        estatus: 'activo',
      },
      {
        id: 'SUB-001-E',
        nombre: 'Terminal Manzanillo',
        alias: 'Puerto MZL',
        direccion: 'Terminal de Contenedores SSA',
        ciudad: 'Manzanillo',
        estado: 'Colima',
        codigoPostal: '28200',
        tipoOperacion: 'importación',
        contacto: 'Op. Portuarias',
        telefono: '314 567 8901',
        horarioRecepcion: '24/7',
        estatus: 'activo',
      },
    ],
    tarifasActivas: ['Ruta Troncal Norte', 'Última Milla CDMX'],
  },
  {
    id: 'CLI-002',
    razónSocial: 'Macro Centro Distribución S.A.',
    rfc: 'MCD990215BB2',
    regimenFiscal: '601',
    usoCFDI: 'G03',
    contactoPrincipal: 'Ing. Roberto López',
    telefono: '33 9876 5432',
    email: 'rlopez@macrocentro.mx',
    direccionFiscal: 'Av. Vallarta 2500, Zapopan, Jalisco, CP 45010',
    estatus: 'pendiente',
    subClientes: 3,
    subClientesDetalle: [
      {
        id: 'SUB-002-A',
        nombre: 'CEDIS Guadalajara',
        alias: 'CEDIS GDL',
        direccion: 'Periférico Sur 8000',
        ciudad: 'Tlaquepaque',
        estado: 'Jalisco',
        codigoPostal: '45600',
        tipoOperacion: 'nacional',
        contacto: 'Javier Ramírez',
        telefono: '33 1234 5678',
        horarioRecepcion: 'Lun-Dom 6:00-22:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-002-B',
        nombre: 'Almacén León',
        alias: 'Bodega León',
        direccion: 'Blvd. Torres Landa 1200',
        ciudad: 'León',
        estado: 'Guanajuato',
        codigoPostal: '37150',
        tipoOperacion: 'nacional',
        contacto: 'Martha Sánchez',
        telefono: '477 234 5678',
        horarioRecepcion: 'Lun-Vie 7:00-19:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-002-C',
        nombre: 'Cross-Dock Aguascalientes',
        alias: 'X-Dock AGS',
        direccion: 'Parque Industrial del Valle',
        ciudad: 'Aguascalientes',
        estado: 'Aguascalientes',
        codigoPostal: '20340',
        tipoOperacion: 'nacional',
        contacto: 'Pedro Hernández',
        telefono: '449 345 6789',
        horarioRecepcion: 'Lun-Sab 8:00-20:00',
        estatus: 'activo',
      },
    ],
    tarifasActivas: ['Norte', 'CDMX', 'Bajío'],
  },
  {
    id: 'CLI-003',
    razónSocial: 'AutoPartes Premium MX',
    rfc: 'APM110701CC3',
    regimenFiscal: '601',
    usoCFDI: 'G03',
    contactoPrincipal: 'Lic. Ana Martínez',
    telefono: '81 5555 4444',
    email: 'ana.martinez@autopartespremium.mx',
    direccionFiscal: 'Av. Ruiz Cortines 456, San Pedro, NL, CP 66220',
    estatus: 'activo',
    subClientes: 3,
    subClientesDetalle: [
      {
        id: 'SUB-003-A',
        nombre: 'Planta Ensamble Silao',
        alias: 'Planta Silao',
        direccion: 'Parque Industrial Puerto Interior',
        ciudad: 'Silao',
        estado: 'Guanajuato',
        codigoPostal: '36100',
        tipoOperacion: 'nacional',
        contacto: 'Ing. Luis Vega',
        telefono: '472 123 4567',
        horarioRecepcion: 'Lun-Sab 6:00-18:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-003-B',
        nombre: 'Línea de Producción Puebla',
        alias: 'Línea PUE',
        direccion: 'Complejo Automotriz VW',
        ciudad: 'Puebla',
        estado: 'Puebla',
        codigoPostal: '72000',
        tipoOperacion: 'nacional',
        contacto: 'Mónica Fuentes',
        telefono: '222 345 6789',
        horarioRecepcion: 'Lun-Vie 7:00-17:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-003-C',
        nombre: 'Centro JIT Monterrey',
        alias: 'JIT MTY',
        direccion: 'Parque FINSA Apodaca',
        ciudad: 'Apodaca',
        estado: 'Nuevo León',
        codigoPostal: '66600',
        tipoOperacion: 'nacional',
        contacto: 'Ricardo Treviño',
        telefono: '81 2345 6789',
        horarioRecepcion: '24/7',
        estatus: 'activo',
      },
    ],
    tarifasActivas: ['Recolecciones Urgentes'],
  },
  {
    id: 'CLI-004',
    razónSocial: 'Farmacias Unidas del Norte',
    rfc: 'FUN040303DD4',
    regimenFiscal: '601',
    usoCFDI: 'G03',
    contactoPrincipal: 'Dr. Carlos Sánchez',
    telefono: '81 3333 2222',
    email: 'csanchez@farmaunidas.com',
    direccionFiscal: 'Av. Constitución 1000, Centro, Monterrey, NL, CP 64000',
    estatus: 'activo',
    subClientes: 2,
    subClientesDetalle: [
      {
        id: 'SUB-004-A',
        nombre: 'CEDIS Farmacéutico MTY',
        alias: 'CEDIS Farma',
        direccion: 'Av. Lincoln 5000',
        ciudad: 'Monterrey',
        estado: 'Nuevo León',
        codigoPostal: '64310',
        tipoOperacion: 'nacional',
        contacto: 'Farm. Lucía Garza',
        telefono: '81 4444 5555',
        horarioRecepcion: 'Lun-Sab 7:00-21:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-004-B',
        nombre: 'Almacén Cadena Fría',
        alias: 'Cold Storage',
        direccion: 'Parque Logístico Norte',
        ciudad: 'Escobedo',
        estado: 'Nuevo León',
        codigoPostal: '66050',
        tipoOperacion: 'nacional',
        contacto: 'Ing. Frío Controlado',
        telefono: '81 6666 7777',
        horarioRecepcion: '24/7',
        estatus: 'activo',
      },
    ],
    tarifasActivas: ['Distribución Nocturna', 'Cadena Fría'],
  },
  {
    id: 'CLI-005',
    razónSocial: 'Sabino del Bene Logistics',
    rfc: 'SBL150812EE5',
    regimenFiscal: '601',
    usoCFDI: 'P01',
    contactoPrincipal: 'Ing. Patricia Vega',
    telefono: '55 7777 8888',
    email: 'pvega@sabinodelbene.com',
    direccionFiscal: 'WTC CDMX, Montecito 38, Nápoles, CDMX, CP 03810',
    estatus: 'incompleto',
    subClientes: 2,
    subClientesDetalle: [
      {
        id: 'SUB-005-A',
        nombre: 'Oficina Corporativa CDMX',
        alias: 'Corp CDMX',
        direccion: 'Paseo de la Reforma 250',
        ciudad: 'CDMX',
        estado: 'Ciudad de México',
        codigoPostal: '06600',
        tipoOperacion: 'nacional',
        contacto: 'Recepción General',
        telefono: '55 8888 9999',
        horarioRecepcion: 'Lun-Vie 9:00-18:00',
        estatus: 'activo',
      },
      {
        id: 'SUB-005-B',
        nombre: 'Almacén Consolidación',
        alias: 'Almacén Cons',
        direccion: 'Zona Industrial Vallejo',
        ciudad: 'CDMX',
        estado: 'Ciudad de México',
        codigoPostal: '07700',
        tipoOperacion: 'exportación',
        contacto: 'Coordinador Exportaciones',
        telefono: '55 2222 3333',
        horarioRecepcion: 'Lun-Vie 7:00-17:00',
        estatus: 'inactivo',
      },
    ],
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
