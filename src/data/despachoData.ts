// Dispatch module data
export interface DispatchUnit {
  id: string;
  numero: string;
  marca: string;
  modelo: string;
  tipo: '5ejes' | '9ejes';
  documentStatus: 'vigente' | 'por_vencer' | 'vencido';
  documentoVencido?: string;
}

export interface Driver {
  id: string;
  nombre: string;
  licencia: string;
  licenciaStatus: 'vigente' | 'por_vencer' | 'vencido';
  telefono: string;
}

export interface DispatchRoute {
  id: string;
  nombre: string;
  origen: string;
  destino: string;
  clienteId: string;
  precio5Ejes: number;
  precio9Ejes: number;
  casetasIncluidas: number;
}

export interface SubCliente {
  id: string;
  clienteId: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  cp: string;
}

export const mockDispatchUnits: DispatchUnit[] = [
  {
    id: 'unit-1',
    numero: 'TR-201',
    marca: 'Freightliner',
    modelo: 'Cascadia 2022',
    tipo: '5ejes',
    documentStatus: 'vigente',
  },
  {
    id: 'unit-2',
    numero: 'TR-202',
    marca: 'Kenworth',
    modelo: 'T680 2021',
    tipo: '9ejes',
    documentStatus: 'vencido',
    documentoVencido: 'Verificación Ambiental',
  },
  {
    id: 'unit-3',
    numero: 'TR-203',
    marca: 'International',
    modelo: 'LT 2023',
    tipo: '5ejes',
    documentStatus: 'vigente',
  },
  {
    id: 'unit-4',
    numero: 'TR-204',
    marca: 'Volvo',
    modelo: 'VNL 760 2022',
    tipo: '9ejes',
    documentStatus: 'por_vencer',
  },
  {
    id: 'unit-5',
    numero: 'TR-205',
    marca: 'Peterbilt',
    modelo: '579 2021',
    tipo: '5ejes',
    documentStatus: 'vencido',
    documentoVencido: 'Seguro de Carga',
  },
];

export const mockDrivers: Driver[] = [
  {
    id: 'driver-1',
    nombre: 'José Luis Martínez Hernández',
    licencia: 'Tipo E - Federal',
    licenciaStatus: 'vigente',
    telefono: '55 1234 5678',
  },
  {
    id: 'driver-2',
    nombre: 'Carlos Eduardo Ramírez López',
    licencia: 'Tipo E - Federal',
    licenciaStatus: 'vigente',
    telefono: '55 2345 6789',
  },
  {
    id: 'driver-3',
    nombre: 'Miguel Ángel Torres García',
    licencia: 'Tipo E - Federal',
    licenciaStatus: 'por_vencer',
    telefono: '55 3456 7890',
  },
  {
    id: 'driver-4',
    nombre: 'Francisco Javier Díaz Ruiz',
    licencia: 'Tipo E - Federal',
    licenciaStatus: 'vencido',
    telefono: '55 4567 8901',
  },
];

export const mockDispatchRoutes: DispatchRoute[] = [
  {
    id: 'route-1',
    nombre: 'CDMX - Veracruz Puerto',
    origen: 'CDMX (Nave Industrial Tlalnepantla)',
    destino: 'Veracruz Puerto (Terminal Marítima)',
    clienteId: 'cliente-1',
    precio5Ejes: 18500,
    precio9Ejes: 24500,
    casetasIncluidas: 3,
  },
  {
    id: 'route-2',
    nombre: 'Querétaro - CDMX',
    origen: 'Querétaro (CEDIS Norte)',
    destino: 'CDMX (Centro de Distribución)',
    clienteId: 'cliente-2',
    precio5Ejes: 12800,
    precio9Ejes: 16500,
    casetasIncluidas: 2,
  },
  {
    id: 'route-3',
    nombre: 'Guadalajara - Monterrey',
    origen: 'Guadalajara (Zona Industrial)',
    destino: 'Monterrey (Parque Industrial)',
    clienteId: 'cliente-1',
    precio5Ejes: 32000,
    precio9Ejes: 42000,
    casetasIncluidas: 5,
  },
  {
    id: 'route-4',
    nombre: 'Puebla - CDMX',
    origen: 'Puebla (Zona Automotriz)',
    destino: 'CDMX (Nave Industrial)',
    clienteId: 'cliente-3',
    precio5Ejes: 8500,
    precio9Ejes: 11200,
    casetasIncluidas: 1,
  },
];

export const mockSubClientes: SubCliente[] = [
  {
    id: 'sub-1',
    clienteId: 'cliente-1',
    nombre: 'Planta Veracruz',
    direccion: 'Av. Puerto Industrial 1250',
    ciudad: 'Veracruz',
    estado: 'Veracruz',
    cp: '91700',
  },
  {
    id: 'sub-2',
    clienteId: 'cliente-1',
    nombre: 'Bodega Monterrey',
    direccion: 'Blvd. Industrial Norte 890',
    ciudad: 'Monterrey',
    estado: 'Nuevo León',
    cp: '64000',
  },
  {
    id: 'sub-3',
    clienteId: 'cliente-2',
    nombre: 'CEDIS Central',
    direccion: 'Calle Logística 456',
    ciudad: 'CDMX',
    estado: 'CDMX',
    cp: '07800',
  },
  {
    id: 'sub-4',
    clienteId: 'cliente-3',
    nombre: 'Almacén Puebla',
    direccion: 'Zona Industrial VW Km 5',
    ciudad: 'Puebla',
    estado: 'Puebla',
    cp: '72000',
  },
];

export const mockDispatchClientes = [
  { id: 'cliente-1', nombre: 'Sabino del Bene', rfc: 'SDB850101ABC' },
  { id: 'cliente-2', nombre: 'DHL Supply Chain', rfc: 'DHL900215XYZ' },
  { id: 'cliente-3', nombre: 'Maersk Logistics', rfc: 'MAE880520DEF' },
  { id: 'cliente-4', nombre: 'FedEx Freight', rfc: 'FED950630GHI' },
];
