// Centralized Fleet Units Data for Dispatch Module Integration
// This file exports the fleet data to be consumed by multiple modules

import { Unidad } from '@/features/flota/AddUnidadModal';

// Mock fleet data - Single source of truth
export const mockFleetUnits: Unidad[] = [
  {
    id: 'UNIT-001',
    numeroEconomico: 'TR-204',
    placas: 'AAA-000-A',
    marca: 'Freightliner',
    modelo: 'Cascadia',
    year: 2022,
    tipo: 'full',
    status: 'en_ruta',
    operador: 'Juan Pérez González',
    documentosVencidos: 1,
    llantasCriticas: 1,
  },
  {
    id: 'UNIT-002',
    numeroEconomico: 'TR-118',
    placas: 'BBB-111-B',
    marca: 'Kenworth',
    modelo: 'T680',
    year: 2021,
    tipo: 'full',
    status: 'disponible',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-003',
    numeroEconomico: 'TR-156',
    placas: 'CCC-222-C',
    marca: 'Volvo',
    modelo: 'VNL 760',
    year: 2023,
    tipo: 'sencillo',
    status: 'disponible',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-004',
    numeroEconomico: 'TR-089',
    placas: 'DDD-333-D',
    marca: 'International',
    modelo: 'LT625',
    year: 2020,
    tipo: 'rabon',
    status: 'disponible',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-005',
    numeroEconomico: 'TR-201',
    placas: 'EEE-444-E',
    marca: 'Freightliner',
    modelo: 'Cascadia',
    year: 2022,
    tipo: 'full',
    status: 'en_ruta',
    operador: 'Fernando García Vega',
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-006',
    numeroEconomico: 'TR-305',
    placas: 'FFF-555-F',
    marca: 'Kenworth',
    modelo: 'W900',
    year: 2023,
    tipo: 'sencillo',
    status: 'disponible',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-007',
    numeroEconomico: 'TR-410',
    placas: 'GGG-666-G',
    marca: 'Peterbilt',
    modelo: '579',
    year: 2021,
    tipo: 'full',
    status: 'bloqueado',
    operador: null,
    documentosVencidos: 2,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-008',
    numeroEconomico: 'TR-512',
    placas: 'HHH-777-H',
    marca: 'Volvo',
    modelo: 'VNR 400',
    year: 2024,
    tipo: 'rabon',
    status: 'disponible',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
];

// Helper functions for filtering
export function getAvailableUnits(): Unidad[] {
  return mockFleetUnits.filter(u => u.status === 'disponible' && u.documentosVencidos === 0);
}

export function getUnitsByType(tipo: 'sencillo' | 'full' | 'rabon'): Unidad[] {
  return mockFleetUnits.filter(u => u.tipo === tipo);
}

export function getAvailableUnitsByType(tipo: 'sencillo' | 'full' | 'rabon'): Unidad[] {
  return mockFleetUnits.filter(
    u => u.tipo === tipo && u.status === 'disponible' && u.documentosVencidos === 0
  );
}

// Get unit type label for display
export function getUnitTypeLabel(tipo: 'sencillo' | 'full' | 'rabon'): string {
  const labels = {
    sencillo: '🚛 Sencillo (5 ejes)',
    full: '🚛🚛 Full (9 ejes)',
    rabon: '📦 Rabón (3 ejes)',
  };
  return labels[tipo] || tipo;
}

// Get unit type emoji
export function getUnitTypeEmoji(tipo: 'sencillo' | 'full' | 'rabon'): string {
  const emojis = {
    sencillo: '🚛',
    full: '🚛🚛',
    rabon: '📦',
  };
  return emojis[tipo] || '🚛';
}
