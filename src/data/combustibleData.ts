// Mock data for Fuel Loads (Cargas de Combustible)

export interface CargaCombustible {
  id: string;
  fechaHora: string;
  unidadId: string;
  unidadNumero: string;
  operadorId: string;
  operadorNombre: string;
  estacion: string;
  litros: number;
  precioPorLitro: number;
  total: number;
  odometro: number;
  evidenciaUrl?: string;
  tieneEvidencia: boolean;
  capacidadTanque: number;
  excedeTanque: boolean;
}

export interface UnidadCombustible {
  id: string;
  numero: string;
  capacidadTanque: number; // Litros
}

export interface OperadorCombustible {
  id: string;
  nombre: string;
  unidadAsignada: string;
}

export const unidadesCombustible: UnidadCombustible[] = [
  { id: 'U-001', numero: 'TR-204', capacidadTanque: 800 },
  { id: 'U-002', numero: 'TR-118', capacidadTanque: 600 },
  { id: 'U-003', numero: 'TR-156', capacidadTanque: 1000 },
  { id: 'U-004', numero: 'TR-089', capacidadTanque: 800 },
  { id: 'U-005', numero: 'TR-201', capacidadTanque: 1000 },
  { id: 'U-006', numero: 'TR-305', capacidadTanque: 600 },
];

export const operadoresCombustible: OperadorCombustible[] = [
  { id: 'OP-001', nombre: 'Juan Pérez González', unidadAsignada: 'TR-204' },
  { id: 'OP-002', nombre: 'Roberto Martínez Luna', unidadAsignada: 'TR-118' },
  { id: 'OP-003', nombre: 'Carlos Hernández Ruiz', unidadAsignada: 'TR-156' },
  { id: 'OP-004', nombre: 'Miguel Ángel Soto', unidadAsignada: 'TR-089' },
  { id: 'OP-005', nombre: 'Fernando García Vega', unidadAsignada: 'TR-201' },
  { id: 'OP-006', nombre: 'Antonio López Díaz', unidadAsignada: 'TR-305' },
];

export const mockCargasCombustible: CargaCombustible[] = [
  {
    id: 'CRG-001',
    fechaHora: '2026-01-09 14:32',
    unidadId: 'U-001',
    unidadNumero: 'TR-204',
    operadorId: 'OP-001',
    operadorNombre: 'Juan Pérez González',
    estacion: 'OXXO Gas - Querétaro Norte',
    litros: 450,
    precioPorLitro: 23.85,
    total: 10732.50,
    odometro: 245890,
    evidenciaUrl: '/ticket-001.jpg',
    tieneEvidencia: true,
    capacidadTanque: 800,
    excedeTanque: false,
  },
  {
    id: 'CRG-002',
    fechaHora: '2026-01-09 12:15',
    unidadId: 'U-002',
    unidadNumero: 'TR-118',
    operadorId: 'OP-002',
    operadorNombre: 'Roberto Martínez Luna',
    estacion: 'Pemex - Puebla Centro',
    litros: 380,
    precioPorLitro: 23.50,
    total: 8930.00,
    odometro: 189456,
    evidenciaUrl: '/ticket-002.jpg',
    tieneEvidencia: true,
    capacidadTanque: 600,
    excedeTanque: false,
  },
  {
    id: 'CRG-003',
    fechaHora: '2026-01-09 09:45',
    unidadId: 'U-003',
    unidadNumero: 'TR-156',
    operadorId: 'OP-003',
    operadorNombre: 'Carlos Hernández Ruiz',
    estacion: 'BP - Monterrey Sur',
    litros: 1150, // Exceeds tank capacity
    precioPorLitro: 24.10,
    total: 27715.00,
    odometro: 312780,
    tieneEvidencia: false,
    capacidadTanque: 1000,
    excedeTanque: true,
  },
  {
    id: 'CRG-004',
    fechaHora: '2026-01-08 18:20',
    unidadId: 'U-004',
    unidadNumero: 'TR-089',
    operadorId: 'OP-004',
    operadorNombre: 'Miguel Ángel Soto',
    estacion: 'Mobil - Guadalajara Periférico',
    litros: 520,
    precioPorLitro: 23.75,
    total: 12350.00,
    odometro: 278934,
    evidenciaUrl: '/ticket-004.jpg',
    tieneEvidencia: true,
    capacidadTanque: 800,
    excedeTanque: false,
  },
  {
    id: 'CRG-005',
    fechaHora: '2026-01-08 15:00',
    unidadId: 'U-005',
    unidadNumero: 'TR-201',
    operadorId: 'OP-005',
    operadorNombre: 'Fernando García Vega',
    estacion: 'OXXO Gas - CDMX Tepeyac',
    litros: 680,
    precioPorLitro: 23.90,
    total: 16252.00,
    odometro: 156234,
    evidenciaUrl: '/ticket-005.jpg',
    tieneEvidencia: true,
    capacidadTanque: 1000,
    excedeTanque: false,
  },
  {
    id: 'CRG-006',
    fechaHora: '2026-01-08 11:30',
    unidadId: 'U-006',
    unidadNumero: 'TR-305',
    operadorId: 'OP-006',
    operadorNombre: 'Antonio López Díaz',
    estacion: 'Pemex - León Industrial',
    litros: 720, // Exceeds tank capacity
    precioPorLitro: 23.60,
    total: 16992.00,
    odometro: 98765,
    tieneEvidencia: false,
    capacidadTanque: 600,
    excedeTanque: true,
  },
  {
    id: 'CRG-007',
    fechaHora: '2026-01-07 16:45',
    unidadId: 'U-001',
    unidadNumero: 'TR-204',
    operadorId: 'OP-001',
    operadorNombre: 'Juan Pérez González',
    estacion: 'Shell - San Luis Potosí',
    litros: 550,
    precioPorLitro: 24.00,
    total: 13200.00,
    odometro: 245120,
    evidenciaUrl: '/ticket-007.jpg',
    tieneEvidencia: true,
    capacidadTanque: 800,
    excedeTanque: false,
  },
  {
    id: 'CRG-008',
    fechaHora: '2026-01-07 08:00',
    unidadId: 'U-002',
    unidadNumero: 'TR-118',
    operadorId: 'OP-002',
    operadorNombre: 'Roberto Martínez Luna',
    estacion: 'Chevron - Veracruz Puerto',
    litros: 400,
    precioPorLitro: 23.45,
    total: 9380.00,
    odometro: 188890,
    evidenciaUrl: '/ticket-008.jpg',
    tieneEvidencia: true,
    capacidadTanque: 600,
    excedeTanque: false,
  },
];
