import { PayableInvoice, Supplier } from './types';

export const mockSuppliers: Supplier[] = [
  { id: 'PROV-001', razonSocial: 'Llantas Premium del Norte S.A.', rfc: 'LPN150320AA1', contacto: 'Ing. Carlos Mendoza', telefono: '81 4433 2211', giro: 'Llantas y Refacciones', estatus: 'activo' },
  { id: 'PROV-002', razonSocial: 'Combustibles Nacionales MX', rfc: 'CNM100815BB2', contacto: 'Lic. Ana Torres', telefono: '55 8877 6655', giro: 'Combustible', estatus: 'activo' },
  { id: 'PROV-003', razonSocial: 'Taller Mecánico Automotriz García', rfc: 'TMA090422CC3', contacto: 'Roberto García', telefono: '33 1122 3344', giro: 'Mantenimiento', estatus: 'activo' },
  { id: 'PROV-004', razonSocial: 'Seguros y Fianzas del Bajío', rfc: 'SFB080101DD4', contacto: 'Lic. Patricia Vega', telefono: '442 555 6677', giro: 'Seguros', estatus: 'inactivo' },
  { id: 'PROV-005', razonSocial: 'Casetas TAG Services', rfc: 'CTS120630EE5', contacto: 'Ing. Miguel Ángel Soto', telefono: '55 9988 7766', giro: 'Servicios Carreteros', estatus: 'activo' },
];

export const initialPayableInvoices: PayableInvoice[] = [
  { 
    id: 'CXP-001', 
    proveedor: 'Llantas Premium del Norte', 
    proveedorId: 'PROV-001',
    concepto: 'Juego de 8 llantas 295/75R22.5 para Tractocamión',
    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
    fechaEmision: '2024-12-20', 
    diasCredito: 30,
    fechaVencimiento: '2025-01-20', 
    montoTotal: 85000, 
    saldoPendiente: 85000, 
    moneda: 'MXN',
    estatus: 'pendiente',
    pagos: []
  },
  { 
    id: 'CXP-002', 
    proveedor: 'Combustibles Nacionales MX', 
    proveedorId: 'PROV-002',
    concepto: 'Suministro de Diésel Premium - Diciembre',
    uuid: 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 
    fechaEmision: '2024-12-01', 
    diasCredito: 30,
    fechaVencimiento: '2024-12-31', 
    montoTotal: 125000, 
    saldoPendiente: 125000, 
    moneda: 'MXN',
    estatus: 'vencido',
    pagos: []
  },
  { 
    id: 'CXP-003', 
    proveedor: 'Taller Mecánico García', 
    proveedorId: 'PROV-003',
    concepto: 'Servicio completo de mantenimiento preventivo',
    uuid: 'c3d4e5f6-a7b8-9012-cdef-345678901234', 
    fechaEmision: '2024-12-15', 
    diasCredito: 30,
    fechaVencimiento: '2025-01-15', 
    montoTotal: 45000, 
    saldoPendiente: 0, 
    moneda: 'MXN',
    estatus: 'pagado',
    pagos: [
      { id: 'PAY-001', fecha: '2025-01-05', monto: 45000, cuentaRetiro: 'Banamex', referencia: 'REF-2025-001' }
    ]
  },
  { 
    id: 'CXP-004', 
    proveedor: 'Casetas TAG Services', 
    proveedorId: 'PROV-005',
    concepto: 'Recarga TAG mensual - Flotilla completa',
    uuid: 'd4e5f6a7-b8c9-0123-defa-456789012345', 
    fechaEmision: '2024-11-15', 
    diasCredito: 30,
    fechaVencimiento: '2024-12-15', 
    montoTotal: 67500, 
    saldoPendiente: 67500, 
    moneda: 'MXN',
    estatus: 'vencido',
    pagos: []
  },
  { 
    id: 'CXP-005', 
    proveedor: 'Combustibles Nacionales MX', 
    proveedorId: 'PROV-002',
    concepto: 'Suministro de Diésel Premium - Enero',
    uuid: 'e5f6a7b8-c9d0-1234-efab-567890123456', 
    fechaEmision: '2025-01-02', 
    diasCredito: 30,
    fechaVencimiento: '2025-02-01', 
    montoTotal: 98000, 
    saldoPendiente: 48000, 
    moneda: 'MXN',
    estatus: 'pago_parcial',
    pagos: [
      { id: 'PAY-002', fecha: '2025-01-10', monto: 50000, cuentaRetiro: 'Santander', referencia: 'REF-2025-002' }
    ]
  },
];

export const bankAccounts = [
  { id: 'BANAMEX-001', name: 'Banamex Empresarial', lastDigits: '4521' },
  { id: 'SANTANDER-001', name: 'Santander PyME', lastDigits: '7834' },
  { id: 'BANORTE-001', name: 'Banorte Comercial', lastDigits: '2198' },
];

export const creditDaysOptions = [
  { value: 0, label: 'Contado' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
];
