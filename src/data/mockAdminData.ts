// Mock data for Administration module - aligned with Python/SQLAlchemy models

export interface UserProfile {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  puesto: string;
  rol: 'admin' | 'operativo' | 'finanzas' | 'supervisor' | 'taller';
  avatar?: string;
  empresa: string;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  ultimoAcceso: string;
  creadoEn: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'app' | 'sms' | 'email';
  twoFactorSecret?: string;
}

export interface SystemConfig {
  id: string;
  categoria: 'empresa' | 'operacion' | 'notificaciones' | 'integraciones';
  clave: string;
  valor: string;
  tipo: 'text' | 'number' | 'boolean' | 'select' | 'password';
  opciones?: string[];
  descripcion: string;
}

export interface NotificationEvent {
  id: string;
  nombre: string;
  descripcion: string;
  canales: {
    email: boolean;
    push: boolean;
    whatsapp: boolean;
  };
}

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  modulo: string;
  detalles: string;
  ip: string;
  fecha: string;
}

// Current logged user profile
export const currentUserProfile: UserProfile = {
  id: 'USR-001',
  nombre: 'Carlos',
  apellidos: 'Mendoza García',
  email: 'c.mendoza@rapidos3t.com',
  telefono: '+52 55 1234 5678',
  puesto: 'Gerente de Operaciones',
  rol: 'admin',
  avatar: undefined,
  empresa: 'Rápidos 3T',
  estado: 'activo',
  ultimoAcceso: '2026-01-16 09:15',
  creadoEn: '2024-03-15',
  twoFactorEnabled: false,
  twoFactorMethod: undefined,
  twoFactorSecret: undefined,
};

// All users for admin management
export const mockUsers: UserProfile[] = [
  currentUserProfile,
  {
    id: 'USR-002',
    nombre: 'María Elena',
    apellidos: 'Rodríguez Sánchez',
    email: 'm.rodriguez@rapidos3t.com',
    telefono: '+52 55 9876 5432',
    puesto: 'Contadora General',
    rol: 'finanzas',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-16 08:45',
    creadoEn: '2024-04-20',
    twoFactorEnabled: true,
    twoFactorMethod: 'app',
  },
  {
    id: 'USR-003',
    nombre: 'Roberto',
    apellidos: 'Sánchez López',
    email: 'r.sanchez@rapidos3t.com',
    telefono: '+52 55 5555 1234',
    puesto: 'Despachador',
    rol: 'operativo',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-15 18:30',
    creadoEn: '2024-06-10',
    twoFactorEnabled: false,
  },
  {
    id: 'USR-004',
    nombre: 'Ana Patricia',
    apellidos: 'Flores Herrera',
    email: 'a.flores@rapidos3t.com',
    telefono: '+52 55 4444 5678',
    puesto: 'Supervisora de Flota',
    rol: 'supervisor',
    empresa: 'Rápidos 3T',
    estado: 'inactivo',
    ultimoAcceso: '2025-12-20 09:00',
    creadoEn: '2024-02-28',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
  },
  {
    id: 'USR-005',
    nombre: 'Fernando',
    apellidos: 'Torres Ruiz',
    email: 'f.torres@rapidos3t.com',
    telefono: '+52 55 3333 9012',
    puesto: 'Coordinador Logístico',
    rol: 'operativo',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-16 07:20',
    creadoEn: '2024-08-05',
    twoFactorEnabled: false,
  },
  {
    id: 'USR-006',
    nombre: 'Lucía',
    apellidos: 'Hernández Vega',
    email: 'l.hernandez@rapidos3t.com',
    telefono: '+52 55 2222 3456',
    puesto: 'Auxiliar Contable',
    rol: 'finanzas',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-14 16:50',
    creadoEn: '2024-09-12',
    twoFactorEnabled: false,
  },
  {
    id: 'USR-007',
    nombre: 'Miguel Ángel',
    apellidos: 'Ramírez Ortiz',
    email: 'm.ramirez@rapidos3t.com',
    telefono: '+52 55 1111 7890',
    puesto: 'Jefe de Taller',
    rol: 'taller',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-16 06:00',
    creadoEn: '2024-01-10',
    twoFactorEnabled: true,
    twoFactorMethod: 'app',
  },
];

// System configuration
export const mockSystemConfig: SystemConfig[] = [
  // Empresa
  { id: 'CFG-001', categoria: 'empresa', clave: 'razon_social', valor: 'Transportes Rápidos 3T S.A. de C.V.', tipo: 'text', descripcion: 'Razón social de la empresa' },
  { id: 'CFG-002', categoria: 'empresa', clave: 'rfc', valor: 'TR3T920815XY9', tipo: 'text', descripcion: 'RFC de la empresa' },
  { id: 'CFG-003', categoria: 'empresa', clave: 'direccion_fiscal', valor: 'Av. Central #1250, Col. Industrial, CDMX, CP 02230', tipo: 'text', descripcion: 'Dirección fiscal completa' },
  { id: 'CFG-004', categoria: 'empresa', clave: 'telefono_corporativo', valor: '+52 55 5555 0000', tipo: 'text', descripcion: 'Teléfono corporativo' },
  { id: 'CFG-005', categoria: 'empresa', clave: 'email_corporativo', valor: 'contacto@rapidos3t.com', tipo: 'text', descripcion: 'Email corporativo' },
  
  // Operación
  { id: 'CFG-010', categoria: 'operacion', clave: 'moneda_default', valor: 'MXN', tipo: 'select', opciones: ['MXN', 'USD'], descripcion: 'Moneda predeterminada para tarifas' },
  { id: 'CFG-011', categoria: 'operacion', clave: 'iva_porcentaje', valor: '16', tipo: 'number', descripcion: 'Porcentaje de IVA aplicable' },
  { id: 'CFG-012', categoria: 'operacion', clave: 'dias_vencimiento_facturas', valor: '30', tipo: 'number', descripcion: 'Días para vencimiento de facturas' },
  { id: 'CFG-013', categoria: 'operacion', clave: 'tolerancia_combustible', valor: '5', tipo: 'number', descripcion: 'Tolerancia (%) para diferencia de combustible' },
  { id: 'CFG-014', categoria: 'operacion', clave: 'dias_alerta_documentos', valor: '30', tipo: 'number', descripcion: 'Días de anticipación para alertas de vencimiento' },
  
  // Integraciones
  { id: 'CFG-020', categoria: 'integraciones', clave: 'google_maps_api_key', valor: '', tipo: 'password', descripcion: 'API Key de Google Maps' },
  { id: 'CFG-021', categoria: 'integraciones', clave: 'gps_provider_api', valor: '', tipo: 'password', descripcion: 'API de proveedor GPS (Traccar/Sinotrack)' },
  { id: 'CFG-022', categoria: 'integraciones', clave: 'smtp_host', valor: 'smtp.gmail.com', tipo: 'text', descripcion: 'Servidor SMTP para correos' },
  { id: 'CFG-023', categoria: 'integraciones', clave: 'smtp_port', valor: '587', tipo: 'number', descripcion: 'Puerto SMTP' },
  { id: 'CFG-024', categoria: 'integraciones', clave: 'smtp_user', valor: 'notificaciones@rapidos3t.com', tipo: 'text', descripcion: 'Usuario SMTP' },
  { id: 'CFG-025', categoria: 'integraciones', clave: 'smtp_password', valor: '', tipo: 'password', descripcion: 'Contraseña SMTP' },
  { id: 'CFG-026', categoria: 'integraciones', clave: 'whatsapp_api_token', valor: '', tipo: 'password', descripcion: 'Token de API WhatsApp Business' },
];

// Notification events configuration
export const mockNotificationEvents: NotificationEvent[] = [
  { id: 'NOT-001', nombre: 'Viaje Creado', descripcion: 'Se notifica cuando se crea un nuevo viaje', canales: { email: true, push: true, whatsapp: false } },
  { id: 'NOT-002', nombre: 'Viaje Iniciado', descripcion: 'El operador inicia el viaje', canales: { email: true, push: true, whatsapp: true } },
  { id: 'NOT-003', nombre: 'Viaje Completado', descripcion: 'El viaje llega a destino', canales: { email: true, push: true, whatsapp: true } },
  { id: 'NOT-004', nombre: 'Retraso Detectado', descripcion: 'El viaje presenta retraso significativo', canales: { email: true, push: true, whatsapp: true } },
  { id: 'NOT-005', nombre: 'Documento por Vencer', descripcion: 'Licencia, seguro o verificación próxima a vencer', canales: { email: true, push: true, whatsapp: false } },
  { id: 'NOT-006', nombre: 'Documento Vencido', descripcion: 'Alerta crítica de documento vencido', canales: { email: true, push: true, whatsapp: true } },
  { id: 'NOT-007', nombre: 'Factura Emitida', descripcion: 'Nueva factura generada para cliente', canales: { email: true, push: false, whatsapp: false } },
  { id: 'NOT-008', nombre: 'Factura Vencida', descripcion: 'Factura pasó su fecha de vencimiento', canales: { email: true, push: true, whatsapp: false } },
  { id: 'NOT-009', nombre: 'Mantenimiento Programado', descripcion: 'Unidad requiere mantenimiento', canales: { email: true, push: true, whatsapp: false } },
  { id: 'NOT-010', nombre: 'Desviación de Combustible', descripcion: 'Diferencia mayor a tolerancia en litros', canales: { email: true, push: true, whatsapp: true } },
];

// Audit log
export const mockAuditLog: AuditLog[] = [
  { id: 'LOG-001', usuarioId: 'USR-001', usuarioNombre: 'Carlos Mendoza', accion: 'LOGIN', modulo: 'Auth', detalles: 'Inicio de sesión exitoso', ip: '192.168.1.100', fecha: '2026-01-16 09:15:00' },
  { id: 'LOG-002', usuarioId: 'USR-001', usuarioNombre: 'Carlos Mendoza', accion: 'CREATE', modulo: 'Viajes', detalles: 'Viaje VJ-2026-0089 creado', ip: '192.168.1.100', fecha: '2026-01-16 09:20:00' },
  { id: 'LOG-003', usuarioId: 'USR-002', usuarioNombre: 'María Elena Rodríguez', accion: 'UPDATE', modulo: 'Clientes', detalles: 'RFC actualizado para cliente CLI-001', ip: '192.168.1.105', fecha: '2026-01-16 08:50:00' },
  { id: 'LOG-004', usuarioId: 'USR-003', usuarioNombre: 'Roberto Sánchez', accion: 'LOGIN', modulo: 'Auth', detalles: 'Inicio de sesión exitoso', ip: '192.168.1.110', fecha: '2026-01-15 18:30:00' },
  { id: 'LOG-005', usuarioId: 'USR-007', usuarioNombre: 'Miguel Ángel Ramírez', accion: 'UPDATE', modulo: 'Flota', detalles: 'Cambio de llantas en unidad T-001', ip: '192.168.1.120', fecha: '2026-01-16 06:15:00' },
];

// Generate TOTP secret simulation
export const generateTOTPSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

// Generate QR code URL for TOTP (using a public chart API for demo)
export const generateTOTPQRUrl = (secret: string, email: string): string => {
  const issuer = 'Rapidos3T';
  const otpAuthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
};
