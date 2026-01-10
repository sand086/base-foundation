// Operators/Drivers Data Interfaces and Mock Data

export interface Operador {
  id: string;
  name: string;
  license_number: string;
  license_type: 'A' | 'B' | 'C' | 'D' | 'E';
  license_expiry: string;
  medical_check_expiry: string;
  phone: string;
  status: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  assigned_unit: string | null;
  hire_date: string;
  emergency_contact: string;
  emergency_phone: string;
}

// Helper to calculate days until expiry
export function getDaysUntilExpiry(dateString: string): number {
  const today = new Date();
  const expiryDate = new Date(dateString);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get expiry status for visual alerts
export function getExpiryStatus(dateString: string): 'danger' | 'warning' | 'success' {
  const days = getDaysUntilExpiry(dateString);
  if (days < 0) return 'danger'; // Expired
  if (days <= 30) return 'warning'; // Expiring soon
  return 'success'; // Valid
}

export function getExpiryLabel(dateString: string): string {
  const days = getDaysUntilExpiry(dateString);
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoy';
  if (days <= 30) return `Vence en ${days}d`;
  return 'Vigente';
}

// Mock Operators Data
export const mockOperadores: Operador[] = [
  {
    id: 'OP-001',
    name: 'Juan Pérez González',
    license_number: 'LIC-2024-78451',
    license_type: 'E',
    license_expiry: '2025-08-15',
    medical_check_expiry: '2025-03-20',
    phone: '+52 55 1234 5678',
    status: 'activo',
    assigned_unit: 'TR-204',
    hire_date: '2019-03-15',
    emergency_contact: 'María González',
    emergency_phone: '+52 55 8765 4321',
  },
  {
    id: 'OP-002',
    name: 'Fernando García Vega',
    license_number: 'LIC-2023-65234',
    license_type: 'E',
    license_expiry: '2025-02-01', // Expiring soon
    medical_check_expiry: '2025-06-10',
    phone: '+52 55 2345 6789',
    status: 'activo',
    assigned_unit: 'TR-201',
    hire_date: '2020-07-22',
    emergency_contact: 'Laura Vega',
    emergency_phone: '+52 55 9876 5432',
  },
  {
    id: 'OP-003',
    name: 'Roberto Martínez López',
    license_number: 'LIC-2022-41256',
    license_type: 'D',
    license_expiry: '2024-12-15', // Expired
    medical_check_expiry: '2024-11-30', // Expired
    phone: '+52 55 3456 7890',
    status: 'inactivo',
    assigned_unit: null,
    hire_date: '2018-01-10',
    emergency_contact: 'Ana López',
    emergency_phone: '+52 55 0987 6543',
  },
  {
    id: 'OP-004',
    name: 'Miguel Ángel Sánchez',
    license_number: 'LIC-2024-89123',
    license_type: 'E',
    license_expiry: '2026-05-20',
    medical_check_expiry: '2025-01-25', // Expiring very soon
    phone: '+52 55 4567 8901',
    status: 'activo',
    assigned_unit: null,
    hire_date: '2021-11-05',
    emergency_contact: 'Carmen Sánchez',
    emergency_phone: '+52 55 1098 7654',
  },
  {
    id: 'OP-005',
    name: 'Carlos Hernández Ruiz',
    license_number: 'LIC-2024-56789',
    license_type: 'E',
    license_expiry: '2026-09-30',
    medical_check_expiry: '2025-12-15',
    phone: '+52 55 5678 9012',
    status: 'vacaciones',
    assigned_unit: null,
    hire_date: '2017-06-20',
    emergency_contact: 'Elena Ruiz',
    emergency_phone: '+52 55 2109 8765',
  },
  {
    id: 'OP-006',
    name: 'José Luis Torres',
    license_number: 'LIC-2023-34567',
    license_type: 'D',
    license_expiry: '2025-04-10',
    medical_check_expiry: '2025-07-20',
    phone: '+52 55 6789 0123',
    status: 'activo',
    assigned_unit: 'TR-089',
    hire_date: '2022-02-14',
    emergency_contact: 'Patricia Torres',
    emergency_phone: '+52 55 3210 9876',
  },
  {
    id: 'OP-007',
    name: 'Ricardo Morales Díaz',
    license_number: 'LIC-2024-12345',
    license_type: 'E',
    license_expiry: '2027-01-15',
    medical_check_expiry: '2025-09-30',
    phone: '+52 55 7890 1234',
    status: 'incapacidad',
    assigned_unit: null,
    hire_date: '2020-09-01',
    emergency_contact: 'Sofía Díaz',
    emergency_phone: '+52 55 4321 0987',
  },
  {
    id: 'OP-008',
    name: 'Eduardo Ramírez Castro',
    license_number: 'LIC-2024-67890',
    license_type: 'E',
    license_expiry: '2026-11-25',
    medical_check_expiry: '2025-05-15',
    phone: '+52 55 8901 2345',
    status: 'activo',
    assigned_unit: 'TR-156',
    hire_date: '2019-12-10',
    emergency_contact: 'Rosa Castro',
    emergency_phone: '+52 55 5432 1098',
  },
];

// Available units for assignment (mock)
export const unidadesDisponibles = [
  { id: 'TR-204', label: 'TR-204 - Freightliner Cascadia' },
  { id: 'TR-118', label: 'TR-118 - Kenworth T680' },
  { id: 'TR-156', label: 'TR-156 - Volvo VNL 760' },
  { id: 'TR-089', label: 'TR-089 - International LT625' },
  { id: 'TR-201', label: 'TR-201 - Freightliner Cascadia' },
];
