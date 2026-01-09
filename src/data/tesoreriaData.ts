// Mock data for Tesorería - Bank Accounts

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
    alias: 'Fiscal Principal',
    saldo: 2850000,
    estatus: 'activo',
  },
  {
    id: 'BANK-002',
    banco: 'BBVA',
    bancoLogo: '💙',
    numeroCuenta: '0112233445',
    clabe: '012180098765432109',
    moneda: 'MXN',
    alias: 'Operaciones Diarias',
    saldo: 645000,
    estatus: 'activo',
  },
  {
    id: 'BANK-003',
    banco: 'Banorte',
    bancoLogo: '🔴',
    numeroCuenta: '5566778899',
    clabe: '072180011223344556',
    moneda: 'USD',
    alias: 'Comercio Exterior',
    saldo: 125000,
    estatus: 'activo',
  },
  {
    id: 'BANK-004',
    banco: 'Santander',
    bancoLogo: '🔥',
    numeroCuenta: '9988776655',
    clabe: '014180099887766554',
    moneda: 'MXN',
    alias: 'Nómina',
    saldo: 180000,
    estatus: 'inactivo',
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
