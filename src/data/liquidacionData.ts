// Mock data for Trip Settlement (Liquidación de Viaje)

import { mockCargasCombustible, CargaCombustible } from './combustibleData';

export interface ConceptoPago {
  id: string;
  tipo: 'ingreso' | 'deduccion';
  categoria: 'base' | 'bono' | 'anticipo' | 'combustible' | 'caseta' | 'viatico' | 'otro';
  descripcion: string;
  monto: number;
  esAutomatico: boolean; // If calculated from other module
  referencia?: string;
}

export interface TripSettlement {
  viajeId: string;
  operadorId: string;
  operadorNombre: string;
  unidadNumero: string;
  ruta: string;
  fechaViaje: string;
  kmsRecorridos: number;
  // Fuel reconciliation data
  consumoEsperadoLitros: number; // Expected based on km and efficiency
  consumoRealLitros: number; // Actual reported loads
  diferenciaLitros: number; // Difference (positive = excess, negative = saving)
  precioPorLitro: number;
  deduccionCombustible: number; // Money deduction if excess
  // Pay breakdown
  conceptos: ConceptoPago[];
  // Totals
  totalIngresos: number;
  totalDeducciones: number;
  netoAPagar: number;
  // Status
  estatus: 'pendiente' | 'autorizado' | 'liquidado';
  fechaAutorizacion?: string;
  autorizadoPor?: string;
}

// Calculate expected fuel consumption based on kms and fuel efficiency
export const calcularConsumoEsperado = (kms: number, rendimientoKmPorLitro: number = 3.2): number => {
  return Math.round(kms / rendimientoKmPorLitro);
};

// Get fuel loads for a specific trip/operator/unit
export const getCargasCombustibleViaje = (
  operadorId: string,
  fechaInicio: string,
  fechaFin: string
): CargaCombustible[] => {
  // Filter fuel loads for the operator within the trip date range
  return mockCargasCombustible.filter(carga => {
    const cargaDate = new Date(carga.fechaHora);
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return carga.operadorId === operadorId && cargaDate >= inicio && cargaDate <= fin;
  });
};

// Calculate fuel deduction based on excess consumption
export const calcularDeduccionCombustible = (
  diferenciaLitros: number,
  precioPorLitro: number,
  toleranciaPorcentaje: number = 5
): number => {
  // Only deduct if excess is beyond tolerance
  if (diferenciaLitros <= 0) return 0; // No excess, no deduction
  return diferenciaLitros * precioPorLitro;
};

// Mock settlement data for the current trip
export const mockTripSettlement: TripSettlement = {
  viajeId: 'SRV-2025-001',
  operadorId: 'OP-001',
  operadorNombre: 'Juan Pérez González',
  unidadNumero: 'TR-204',
  ruta: 'CDMX → Monterrey',
  fechaViaje: '2025-01-08',
  kmsRecorridos: 942,
  // Fuel reconciliation - simulating 7.5% excess consumption
  consumoEsperadoLitros: 294, // 942 km / 3.2 km/L
  consumoRealLitros: 316, // Actual loads
  diferenciaLitros: 22, // 22L excess (7.5%)
  precioPorLitro: 23.85,
  deduccionCombustible: 524.70, // 22L * $23.85
  conceptos: [
    {
      id: 'CP-001',
      tipo: 'ingreso',
      categoria: 'base',
      descripcion: 'Sueldo Base Viaje (Tarifa por km)',
      monto: 4710.00, // $5.00 per km * 942 km
      esAutomatico: true,
      referencia: '942 km × $5.00',
    },
    {
      id: 'CP-002',
      tipo: 'ingreso',
      categoria: 'bono',
      descripcion: 'Bono Entrega a Tiempo',
      monto: 500.00,
      esAutomatico: true,
    },
    {
      id: 'CP-003',
      tipo: 'ingreso',
      categoria: 'viatico',
      descripcion: 'Viáticos Autorizados',
      monto: 850.00,
      esAutomatico: false,
    },
    {
      id: 'CP-004',
      tipo: 'deduccion',
      categoria: 'anticipo',
      descripcion: 'Anticipo Entregado',
      monto: 1500.00,
      esAutomatico: false,
    },
    {
      id: 'CP-005',
      tipo: 'deduccion',
      categoria: 'combustible',
      descripcion: 'Exceso de Consumo (Deducción Diesel)',
      monto: 524.70,
      esAutomatico: true,
      referencia: '22L × $23.85 = Vale de Cobro',
    },
    {
      id: 'CP-006',
      tipo: 'deduccion',
      categoria: 'anticipo',
      descripcion: 'Anticipo de Liquidación',
      monto: 200.00,
      esAutomatico: false,
      referencia: 'Abono 3/6',
    },
  ],
  totalIngresos: 6060.00,
  totalDeducciones: 2224.70,
  netoAPagar: 3835.30,
  estatus: 'pendiente',
};

// Helper to get total by type
export const getTotalByTipo = (conceptos: ConceptoPago[], tipo: 'ingreso' | 'deduccion'): number => {
  return conceptos
    .filter(c => c.tipo === tipo)
    .reduce((sum, c) => sum + c.monto, 0);
};

// Helper to get category totals
export const getTotalsByCategoria = (conceptos: ConceptoPago[]): Record<string, number> => {
  return conceptos.reduce((acc, c) => {
    const key = `${c.tipo}_${c.categoria}`;
    acc[key] = (acc[key] || 0) + c.monto;
    return acc;
  }, {} as Record<string, number>);
};
