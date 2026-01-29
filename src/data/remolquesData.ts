// Mock data for trailers (remolques) and dollies

export interface Remolque {
  id: string;
  numero: string;
  tipo: 'caja_seca' | 'plataforma' | 'refrigerada' | 'tanque' | 'tolva';
  capacidad: string;
  status: 'disponible' | 'en_uso' | 'mantenimiento';
  descripcion: string;
}

export interface Dolly {
  id: string;
  numero: string;
  tipo: 'dolly_a' | 'dolly_b';
  status: 'disponible' | 'en_uso' | 'mantenimiento';
}

export const mockRemolques: Remolque[] = [
  {
    id: 'rem-1',
    numero: 'REM-001',
    tipo: 'caja_seca',
    capacidad: "53'",
    status: 'disponible',
    descripcion: "Caja Seca 53'",
  },
  {
    id: 'rem-2',
    numero: 'REM-002',
    tipo: 'caja_seca',
    capacidad: "53'",
    status: 'disponible',
    descripcion: "Caja Seca 53'",
  },
  {
    id: 'rem-3',
    numero: 'REM-003',
    tipo: 'plataforma',
    capacidad: "48'",
    status: 'disponible',
    descripcion: "Plataforma 48'",
  },
  {
    id: 'rem-4',
    numero: 'REM-004',
    tipo: 'refrigerada',
    capacidad: "53'",
    status: 'disponible',
    descripcion: "Refrigerada 53'",
  },
  {
    id: 'rem-5',
    numero: 'REM-005',
    tipo: 'caja_seca',
    capacidad: "40'",
    status: 'disponible',
    descripcion: "Caja Seca 40'",
  },
  {
    id: 'rem-6',
    numero: 'REM-006',
    tipo: 'plataforma',
    capacidad: "53'",
    status: 'en_uso',
    descripcion: "Plataforma 53'",
  },
  {
    id: 'rem-7',
    numero: 'REM-007',
    tipo: 'tanque',
    capacidad: '40,000L',
    status: 'disponible',
    descripcion: 'Tanque 40,000L',
  },
  {
    id: 'rem-8',
    numero: 'REM-008',
    tipo: 'tolva',
    capacidad: '35 Ton',
    status: 'mantenimiento',
    descripcion: 'Tolva Granelera 35 Ton',
  },
];

export const mockDollies: Dolly[] = [
  {
    id: 'dolly-1',
    numero: 'DOLLY-A01',
    tipo: 'dolly_a',
    status: 'disponible',
  },
  {
    id: 'dolly-2',
    numero: 'DOLLY-A02',
    tipo: 'dolly_a',
    status: 'disponible',
  },
  {
    id: 'dolly-3',
    numero: 'DOLLY-B01',
    tipo: 'dolly_b',
    status: 'disponible',
  },
  {
    id: 'dolly-4',
    numero: 'DOLLY-B02',
    tipo: 'dolly_b',
    status: 'en_uso',
  },
];

export const getTipoRemolqueLabel = (tipo: Remolque['tipo']): string => {
  const labels: Record<Remolque['tipo'], string> = {
    caja_seca: 'Caja Seca',
    plataforma: 'Plataforma',
    refrigerada: 'Refrigerada',
    tanque: 'Tanque',
    tolva: 'Tolva',
  };
  return labels[tipo];
};
