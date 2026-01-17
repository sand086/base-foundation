// Catálogo de Rutas Autorizadas

export interface RutaAutorizada {
  id: string;
  origen: string;
  destino: string;
  descripcion?: string;
  distanciaKm?: number;
  tiempoEstimadoHoras?: number;
  activo: boolean;
  fechaCreacion: string;
}

export const defaultRutasAutorizadas: RutaAutorizada[] = [
  {
    id: 'ruta-1',
    origen: 'CDMX',
    destino: 'Veracruz Puerto',
    descripcion: 'Ruta principal hacia el puerto de Veracruz',
    distanciaKm: 420,
    tiempoEstimadoHoras: 6,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-2',
    origen: 'Querétaro',
    destino: 'CDMX',
    descripcion: 'Corredor industrial Querétaro-CDMX',
    distanciaKm: 220,
    tiempoEstimadoHoras: 3,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-3',
    origen: 'Guadalajara',
    destino: 'Monterrey',
    descripcion: 'Conexión occidente-noreste',
    distanciaKm: 710,
    tiempoEstimadoHoras: 9,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-4',
    origen: 'Puebla',
    destino: 'CDMX',
    descripcion: 'Corredor automotriz Puebla',
    distanciaKm: 130,
    tiempoEstimadoHoras: 2,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-5',
    origen: 'Monterrey',
    destino: 'Laredo',
    descripcion: 'Frontera norte - Comercio exterior',
    distanciaKm: 220,
    tiempoEstimadoHoras: 3,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-6',
    origen: 'CDMX',
    destino: 'Hermosillo',
    descripcion: 'Ruta larga hacia el noroeste',
    distanciaKm: 1850,
    tiempoEstimadoHoras: 22,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-7',
    origen: 'Veracruz Villa',
    destino: 'Hermosillo',
    descripcion: 'Corredor costa-noroeste',
    distanciaKm: 2100,
    tiempoEstimadoHoras: 26,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
  {
    id: 'ruta-8',
    origen: 'León',
    destino: 'Tijuana',
    descripcion: 'Ruta del Bajío a frontera Baja California',
    distanciaKm: 2400,
    tiempoEstimadoHoras: 28,
    activo: true,
    fechaCreacion: '2024-01-15',
  },
];
