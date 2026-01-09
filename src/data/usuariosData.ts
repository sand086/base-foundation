// Mock data for Users & Security module

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'operativo' | 'finanzas' | 'supervisor';
  empresa: string;
  estado: 'activo' | 'inactivo';
  ultimoAcceso: string;
  avatar?: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  color: 'danger' | 'info' | 'warning' | 'success';
}

export interface Modulo {
  id: string;
  nombre: string;
  icono: string;
}

export interface Permiso {
  moduloId: string;
  ver: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface RolPermisos {
  rolId: string;
  permisos: Permiso[];
}

export const usuarios: Usuario[] = [
  {
    id: 'USR-001',
    nombre: 'Carlos Mendoza García',
    email: 'c.mendoza@rapidos3t.com',
    rol: 'admin',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-09 14:32',
  },
  {
    id: 'USR-002',
    nombre: 'María Elena Rodríguez',
    email: 'm.rodriguez@rapidos3t.com',
    rol: 'finanzas',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-09 12:15',
  },
  {
    id: 'USR-003',
    nombre: 'Roberto Sánchez López',
    email: 'r.sanchez@rapidos3t.com',
    rol: 'operativo',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-08 18:45',
  },
  {
    id: 'USR-004',
    nombre: 'Ana Patricia Flores',
    email: 'a.flores@rapidos3t.com',
    rol: 'supervisor',
    empresa: 'Rápidos 3T',
    estado: 'inactivo',
    ultimoAcceso: '2025-12-20 09:00',
  },
  {
    id: 'USR-005',
    nombre: 'Fernando Torres Ruiz',
    email: 'f.torres@rapidos3t.com',
    rol: 'operativo',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-09 08:20',
  },
  {
    id: 'USR-006',
    nombre: 'Lucía Hernández Vega',
    email: 'l.hernandez@rapidos3t.com',
    rol: 'finanzas',
    empresa: 'Rápidos 3T',
    estado: 'activo',
    ultimoAcceso: '2026-01-07 16:50',
  },
];

export const roles: Rol[] = [
  {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema',
    color: 'danger',
  },
  {
    id: 'operativo',
    nombre: 'Operativo',
    descripcion: 'Gestión de viajes y flota',
    color: 'info',
  },
  {
    id: 'finanzas',
    nombre: 'Finanzas',
    descripcion: 'Facturación y cuentas',
    color: 'success',
  },
  {
    id: 'supervisor',
    nombre: 'Supervisor',
    descripcion: 'Monitoreo y reportes',
    color: 'warning',
  },
];

export const modulos: Modulo[] = [
  { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard' },
  { id: 'monitoreo', nombre: 'Centro de Monitoreo', icono: 'Radio' },
  { id: 'clientes', nombre: 'Clientes', icono: 'Users' },
  { id: 'flota', nombre: 'Flota', icono: 'Truck' },
  { id: 'combustible', nombre: 'Combustible', icono: 'Fuel' },
  { id: 'tarifas', nombre: 'Tarifas', icono: 'DollarSign' },
  { id: 'despacho', nombre: 'Despacho', icono: 'FileText' },
  { id: 'cxc', nombre: 'Cuentas por Cobrar', icono: 'Receipt' },
  { id: 'cxp', nombre: 'Cuentas por Pagar', icono: 'CreditCard' },
  { id: 'reportes', nombre: 'Reportes', icono: 'BarChart3' },
  { id: 'usuarios', nombre: 'Usuarios', icono: 'Shield' },
];

export const permisosDefault: RolPermisos[] = [
  {
    rolId: 'admin',
    permisos: modulos.map(m => ({ moduloId: m.id, ver: true, editar: true, eliminar: true })),
  },
  {
    rolId: 'operativo',
    permisos: [
      { moduloId: 'dashboard', ver: true, editar: false, eliminar: false },
      { moduloId: 'monitoreo', ver: true, editar: true, eliminar: false },
      { moduloId: 'clientes', ver: true, editar: false, eliminar: false },
      { moduloId: 'flota', ver: true, editar: true, eliminar: false },
      { moduloId: 'combustible', ver: true, editar: true, eliminar: false },
      { moduloId: 'tarifas', ver: true, editar: false, eliminar: false },
      { moduloId: 'despacho', ver: true, editar: true, eliminar: false },
      { moduloId: 'cxc', ver: false, editar: false, eliminar: false },
      { moduloId: 'cxp', ver: false, editar: false, eliminar: false },
      { moduloId: 'reportes', ver: true, editar: false, eliminar: false },
      { moduloId: 'usuarios', ver: false, editar: false, eliminar: false },
    ],
  },
  {
    rolId: 'finanzas',
    permisos: [
      { moduloId: 'dashboard', ver: true, editar: false, eliminar: false },
      { moduloId: 'monitoreo', ver: true, editar: false, eliminar: false },
      { moduloId: 'clientes', ver: true, editar: true, eliminar: false },
      { moduloId: 'flota', ver: true, editar: false, eliminar: false },
      { moduloId: 'combustible', ver: true, editar: true, eliminar: true },
      { moduloId: 'tarifas', ver: true, editar: true, eliminar: true },
      { moduloId: 'despacho', ver: true, editar: false, eliminar: false },
      { moduloId: 'cxc', ver: true, editar: true, eliminar: true },
      { moduloId: 'cxp', ver: true, editar: true, eliminar: true },
      { moduloId: 'reportes', ver: true, editar: true, eliminar: false },
      { moduloId: 'usuarios', ver: false, editar: false, eliminar: false },
    ],
  },
  {
    rolId: 'supervisor',
    permisos: [
      { moduloId: 'dashboard', ver: true, editar: false, eliminar: false },
      { moduloId: 'monitoreo', ver: true, editar: true, eliminar: false },
      { moduloId: 'clientes', ver: true, editar: false, eliminar: false },
      { moduloId: 'flota', ver: true, editar: true, eliminar: false },
      { moduloId: 'combustible', ver: true, editar: false, eliminar: false },
      { moduloId: 'tarifas', ver: true, editar: false, eliminar: false },
      { moduloId: 'despacho', ver: true, editar: true, eliminar: false },
      { moduloId: 'cxc', ver: true, editar: false, eliminar: false },
      { moduloId: 'cxp', ver: true, editar: false, eliminar: false },
      { moduloId: 'reportes', ver: true, editar: true, eliminar: false },
      { moduloId: 'usuarios', ver: false, editar: false, eliminar: false },
    ],
  },
];
