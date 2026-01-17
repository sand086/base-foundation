// Mock data for Tesorería - Bank Accounts & Movements

export interface BankAccount {
  id: string;
  banco: string;
  bancoLogo: string;
  numeroCuenta: string;
  clabe: string;
  moneda: 'MXN' | 'USD';
  alias: string;
  saldo?: number;
  estatus: 'activo' | 'inactivo';
  tipo: 'operativa' | 'cobranza'; // New: to categorize accounts
}

export interface MovimientoBancario {
  id: string;
  fecha: string;
  concepto: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  moneda: 'MXN' | 'USD';
  cuentaBancariaId: string;
  cuentaBancaria: string;
  banco: string;
  referenciaBancaria: string;
  origenModulo: 'CxC' | 'CxP' | 'Ajuste' | 'Transferencia';
  facturaRelacionada?: string;
  facturaFolio?: string;
  registradoPor: string;
  fechaRegistro: string;
  conciliado: boolean;
  fechaConciliacion?: string;
}

export const bankLogos: Record<string, string> = {
  'Banamex': '🏦',
  'BBVA': '💙',
  'Banorte': '🔴',
  'Santander': '🔥',
  'HSBC': '🔷',
  'Scotiabank': '⭐',
  'Inbursa': '🏛️',
  'Banco Azteca': '🦅',
};

export const mockBankAccounts: BankAccount[] = [
  {
    id: 'BANK-001',
    banco: 'Banamex',
    bancoLogo: '🏦',
    numeroCuenta: '7890123456',
    clabe: '002180012345678901',
    moneda: 'MXN',
    alias: 'Operativa Principal',
    saldo: 2850000,
    estatus: 'activo',
    tipo: 'operativa',
  },
  {
    id: 'BANK-002',
    banco: 'Santander',
    bancoLogo: '🔥',
    numeroCuenta: '0112233445',
    clabe: '014180098765432109',
    moneda: 'MXN',
    alias: 'Cobranza Clientes',
    saldo: 645000,
    estatus: 'activo',
    tipo: 'cobranza',
  },
  {
    id: 'BANK-003',
    banco: 'Banorte',
    bancoLogo: '🔴',
    numeroCuenta: '5566778899',
    clabe: '072180011223344556',
    moneda: 'MXN',
    alias: 'Cobranza Secundaria',
    saldo: 325000,
    estatus: 'activo',
    tipo: 'cobranza',
  },
  {
    id: 'BANK-004',
    banco: 'BBVA',
    bancoLogo: '💙',
    numeroCuenta: '9988776655',
    clabe: '012180099887766554',
    moneda: 'USD',
    alias: 'Comercio Exterior',
    saldo: 125000,
    estatus: 'activo',
    tipo: 'operativa',
  },
];

export const mockMovimientos: MovimientoBancario[] = [
  // Ingresos (from CxC)
  {
    id: 'MOV-001',
    fecha: '2025-01-15',
    concepto: 'Pago Factura A-2025-001 - Corporativo Logístico Alfa',
    tipo: 'ingreso',
    monto: 45000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-002',
    cuentaBancaria: 'Cobranza Clientes',
    banco: 'Santander',
    referenciaBancaria: 'TRF-2025-001',
    origenModulo: 'CxC',
    facturaRelacionada: 'FAC-002',
    facturaFolio: 'A-2025-001',
    registradoPor: 'María García',
    fechaRegistro: '2025-01-15 10:30',
    conciliado: true,
    fechaConciliacion: '2025-01-15',
  },
  {
    id: 'MOV-002',
    fecha: '2025-01-14',
    concepto: 'Anticipo Factura A-2024-102 - Corporativo Logístico Alfa',
    tipo: 'ingreso',
    monto: 20000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-003',
    cuentaBancaria: 'Cobranza Secundaria',
    banco: 'Banorte',
    referenciaBancaria: 'DEP-2024-155',
    origenModulo: 'CxC',
    facturaRelacionada: 'FAC-004',
    facturaFolio: 'A-2024-102',
    registradoPor: 'Roberto López',
    fechaRegistro: '2025-01-14 14:22',
    conciliado: true,
    fechaConciliacion: '2025-01-14',
  },
  {
    id: 'MOV-003',
    fecha: '2025-01-13',
    concepto: 'Pago Combustibles Nacionales MX - Factura CXP-005',
    tipo: 'egreso',
    monto: 50000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-001',
    cuentaBancaria: 'Operativa Principal',
    banco: 'Banamex',
    referenciaBancaria: 'REF-2025-002',
    origenModulo: 'CxP',
    facturaRelacionada: 'CXP-005',
    facturaFolio: 'FC-8821',
    registradoPor: 'Ana Torres',
    fechaRegistro: '2025-01-13 11:45',
    conciliado: true,
    fechaConciliacion: '2025-01-13',
  },
  {
    id: 'MOV-004',
    fecha: '2025-01-12',
    concepto: 'Pago Taller Mecánico García - Mantenimiento',
    tipo: 'egreso',
    monto: 45000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-001',
    cuentaBancaria: 'Operativa Principal',
    banco: 'Banamex',
    referenciaBancaria: 'REF-2025-001',
    origenModulo: 'CxP',
    facturaRelacionada: 'CXP-003',
    facturaFolio: 'A-4521',
    registradoPor: 'María García',
    fechaRegistro: '2025-01-12 09:15',
    conciliado: false,
  },
  {
    id: 'MOV-005',
    fecha: '2025-01-11',
    concepto: 'Pago Factura A-2024-098 - AutoPartes Premium MX',
    tipo: 'ingreso',
    monto: 35000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-002',
    cuentaBancaria: 'Cobranza Clientes',
    banco: 'Santander',
    referenciaBancaria: 'TRF-2025-008',
    origenModulo: 'CxC',
    facturaRelacionada: 'FAC-003',
    facturaFolio: 'A-2024-098',
    registradoPor: 'Carlos Mendoza',
    fechaRegistro: '2025-01-11 16:30',
    conciliado: false,
  },
  {
    id: 'MOV-006',
    fecha: '2025-01-10',
    concepto: 'Pago Llantas Premium del Norte - 8 llantas',
    tipo: 'egreso',
    monto: 85000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-001',
    cuentaBancaria: 'Operativa Principal',
    banco: 'Banamex',
    referenciaBancaria: 'CHQ-001234',
    origenModulo: 'CxP',
    facturaRelacionada: 'CXP-001',
    facturaFolio: 'B-1298',
    registradoPor: 'Ana Torres',
    fechaRegistro: '2025-01-10 10:00',
    conciliado: true,
    fechaConciliacion: '2025-01-10',
  },
  {
    id: 'MOV-007',
    fecha: '2025-01-09',
    concepto: 'Cobro Macro Centro Distribución - Flete Manzanillo',
    tipo: 'ingreso',
    monto: 52000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-002',
    cuentaBancaria: 'Cobranza Clientes',
    banco: 'Santander',
    referenciaBancaria: 'DEP-2025-003',
    origenModulo: 'CxC',
    facturaRelacionada: 'FAC-006',
    facturaFolio: 'A-2025-003',
    registradoPor: 'Roberto López',
    fechaRegistro: '2025-01-09 15:20',
    conciliado: false,
  },
  {
    id: 'MOV-008',
    fecha: '2025-01-08',
    concepto: 'Ajuste de saldo inicial',
    tipo: 'ingreso',
    monto: 100000,
    moneda: 'MXN',
    cuentaBancariaId: 'BANK-001',
    cuentaBancaria: 'Operativa Principal',
    banco: 'Banamex',
    referenciaBancaria: 'AJUSTE-001',
    origenModulo: 'Ajuste',
    registradoPor: 'Sistema',
    fechaRegistro: '2025-01-08 08:00',
    conciliado: true,
    fechaConciliacion: '2025-01-08',
  },
];

export const bancos = [
  'Banamex',
  'BBVA',
  'Banorte',
  'Santander',
  'HSBC',
  'Scotiabank',
  'Inbursa',
  'Banco Azteca',
];
