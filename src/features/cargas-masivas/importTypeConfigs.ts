/**
 * Import Type Configurations for Bulk Upload Module
 * Synchronized with backend models (backend/models.py) and schemas (backend/schemas.py)
 */

import {
  Landmark,
  Users,
  Package,
  Truck,
  MapPin,
  UserCog,
} from 'lucide-react';

// ============= ENUMS (Mirror of backend/schemas.py) =============

export const UnitTypeEnum = {
  SENCILLO: 'sencillo',
  FULL: 'full',
  RABON: 'rabon',
} as const;

export const UnitStatusEnum = {
  DISPONIBLE: 'disponible',
  EN_RUTA: 'en_ruta',
  MANTENIMIENTO: 'mantenimiento',
  BLOQUEADO: 'bloqueado',
} as const;

export const OperatorStatusEnum = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  VACACIONES: 'vacaciones',
  INCAPACIDAD: 'incapacidad',
} as const;

export const ClientStatusEnum = {
  ACTIVO: 'activo',
  PENDIENTE: 'pendiente',
  INCOMPLETO: 'incompleto',
} as const;

// ============= COLUMN METADATA =============

export interface ColumnMeta {
  name: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean';
  required: boolean;
  enumValues?: string[];
  pattern?: RegExp;
  patternMessage?: string;
  minLength?: number;
  maxLength?: number;
}

// ============= IMPORT TYPE INTERFACE =============

export interface ImportTypeConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  columns: ColumnMeta[];
  sampleData: string[][];
  recordCount?: number;
  backendEndpoint: string;
}

// ============= IMPORT CONFIGURATIONS =============

export const importTypeConfigs: ImportTypeConfig[] = [
  {
    id: 'casetas',
    title: 'Importar Casetas',
    description: 'Catálogo de casetas de peaje con costos por tipo de vehículo',
    icon: Landmark,
    color: 'text-status-info',
    backendEndpoint: '/toll-booths',
    columns: [
      { name: 'nombre', type: 'string', required: true, minLength: 1, maxLength: 100 },
      { name: 'autopista', type: 'string', required: true, minLength: 1, maxLength: 150 },
      { name: 'km', type: 'number', required: true },
      { name: 'costo_2_ejes', type: 'number', required: true },
      { name: 'costo_3_ejes', type: 'number', required: true },
      { name: 'costo_5_ejes', type: 'number', required: true },
      { name: 'acepta_tag', type: 'enum', required: true, enumValues: ['SI', 'NO'] },
    ],
    sampleData: [
      ['Caseta Cuautitlán', 'México-Querétaro', '25', '98', '145', '220', 'SI'],
      ['Caseta Palmillas', 'México-Querétaro', '85', '156', '210', '340', 'SI'],
      ['Caseta La Venta', 'Autopista del Sol', '12', '45', '68', '102', 'NO'],
    ],
    recordCount: 245,
  },
  {
    id: 'clientes',
    title: 'Importar Clientes',
    description: 'Datos de clientes con información fiscal completa (CFDI 4.0)',
    icon: Users,
    color: 'text-primary',
    backendEndpoint: '/clients',
    columns: [
      { name: 'razon_social', type: 'string', required: true, minLength: 1, maxLength: 200 },
      { 
        name: 'rfc', 
        type: 'string', 
        required: true, 
        minLength: 12, 
        maxLength: 13,
        pattern: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i,
        patternMessage: 'RFC debe tener formato válido (12-13 caracteres)'
      },
      { name: 'regimen_fiscal', type: 'string', required: false, maxLength: 10 },
      { name: 'uso_cfdi', type: 'string', required: true, maxLength: 10 },
      { name: 'contacto_principal', type: 'string', required: false, maxLength: 100 },
      { name: 'telefono', type: 'string', required: false, maxLength: 20 },
      { name: 'email', type: 'string', required: false, maxLength: 100 },
      { name: 'direccion_fiscal', type: 'string', required: false, maxLength: 300 },
      { name: 'codigo_postal_fiscal', type: 'string', required: true, minLength: 5, maxLength: 5 },
      { name: 'dias_credito', type: 'number', required: true },
      { 
        name: 'estatus', 
        type: 'enum', 
        required: false, 
        enumValues: Object.values(ClientStatusEnum)
      },
    ],
    sampleData: [
      ['Corporativo Alfa S.A. de C.V.', 'CAL021001AA1', '601', 'G03', 'María García', '55 1234 5678', 'contacto@alfa.com', 'Av. Reforma 123, Col. Centro', '06000', '30', 'activo'],
      ['Logística Beta S. de R.L.', 'LBE990215BB2', '601', 'G01', 'Roberto López', '33 9876 5432', 'info@beta.mx', 'Calle Norte 456, Guadalajara', '44100', '15', 'activo'],
      ['Distribuidora Gamma SA', 'DGA110701CC3', '603', 'G03', 'Ana Martínez', '81 5555 4444', 'ventas@gamma.com', 'Blvd. Sur 789, Monterrey', '64000', '45', 'pendiente'],
    ],
    recordCount: 128,
  },
  {
    id: 'refacciones',
    title: 'Catálogo de Refacciones',
    description: 'Inventario de refacciones y partes para mantenimiento',
    icon: Package,
    color: 'text-status-warning',
    backendEndpoint: '/spare-parts',
    columns: [
      { name: 'codigo', type: 'string', required: true, minLength: 1, maxLength: 50 },
      { name: 'descripcion', type: 'string', required: true, minLength: 1, maxLength: 200 },
      { name: 'marca', type: 'string', required: true, maxLength: 100 },
      { name: 'categoria', type: 'string', required: true, maxLength: 50 },
      { name: 'unidad', type: 'string', required: true, maxLength: 10 },
      { name: 'precio', type: 'number', required: true },
      { name: 'stock_minimo', type: 'number', required: true },
    ],
    sampleData: [
      ['REF-001', 'Filtro de aceite motor', 'Bosch', 'Motor', 'PZA', '450.00', '10'],
      ['REF-002', 'Balata delantera juego', 'Brembo', 'Frenos', 'JGO', '1200.00', '5'],
      ['REF-003', 'Llanta 295/80 R22.5', 'Michelin', 'Llantas', 'PZA', '8500.00', '8'],
    ],
    recordCount: 892,
  },
  {
    id: 'unidades',
    title: 'Importar Unidades',
    description: 'Flota de tractocamiones y remolques con datos técnicos y documentos',
    icon: Truck,
    color: 'text-status-success',
    backendEndpoint: '/units',
    columns: [
      { name: 'numero_economico', type: 'string', required: true, minLength: 1, maxLength: 20 },
      { name: 'placas', type: 'string', required: true, minLength: 1, maxLength: 15 },
      { name: 'vin', type: 'string', required: false, maxLength: 17 },
      { name: 'marca', type: 'string', required: true, maxLength: 50 },
      { name: 'modelo', type: 'string', required: true, maxLength: 50 },
      { name: 'year', type: 'number', required: false },
      { 
        name: 'tipo', 
        type: 'enum', 
        required: true, 
        enumValues: Object.values(UnitTypeEnum)
      },
      { 
        name: 'status', 
        type: 'enum', 
        required: false, 
        enumValues: Object.values(UnitStatusEnum)
      },
      { name: 'seguro_vence', type: 'date', required: false },
      { name: 'verificacion_vence', type: 'date', required: false },
      { name: 'permiso_sct_vence', type: 'date', required: false },
      { name: 'llantas_criticas', type: 'number', required: false },
    ],
    sampleData: [
      ['TR-204', 'AAA-000-A', '1HGBH41JXMN109186', 'Freightliner', 'Cascadia', '2022', 'full', 'disponible', '2026-06-15', '2026-03-20', '2026-12-31', '0'],
      ['TR-118', 'BBB-111-B', '2FMDK3GC4ABA12345', 'Kenworth', 'T680', '2021', 'full', 'disponible', '2026-08-10', '2026-05-15', '2026-11-30', '0'],
      ['RM-050', 'CCC-222-C', '3C6TRVDG5FE123456', 'Utility', '3000R', '2023', 'sencillo', 'mantenimiento', '2026-04-01', '2026-02-28', '2026-10-15', '2'],
    ],
    recordCount: 45,
  },
  {
    id: 'operadores',
    title: 'Importar Operadores',
    description: 'Conductores con licencias, exámenes médicos y datos de contacto',
    icon: UserCog,
    color: 'text-violet-500',
    backendEndpoint: '/operators',
    columns: [
      { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 100 },
      { name: 'license_number', type: 'string', required: true, minLength: 1, maxLength: 50 },
      { 
        name: 'license_type', 
        type: 'enum', 
        required: true, 
        enumValues: ['A', 'B', 'C', 'D', 'E']
      },
      { name: 'license_expiry', type: 'date', required: true },
      { name: 'medical_check_expiry', type: 'date', required: true },
      { name: 'phone', type: 'string', required: false, maxLength: 20 },
      { 
        name: 'status', 
        type: 'enum', 
        required: false, 
        enumValues: Object.values(OperatorStatusEnum)
      },
      { name: 'hire_date', type: 'date', required: false },
      { name: 'emergency_contact', type: 'string', required: false, maxLength: 100 },
      { name: 'emergency_phone', type: 'string', required: false, maxLength: 20 },
    ],
    sampleData: [
      ['Juan Pérez González', 'SCT-12345678', 'E', '2027-03-15', '2026-08-20', '55 1234 5678', 'activo', '2020-05-10', 'María Pérez', '55 8765 4321'],
      ['Fernando García Vega', 'SCT-87654321', 'E', '2026-11-30', '2026-06-15', '33 9876 5432', 'activo', '2019-08-22', 'Laura García', '33 1234 5678'],
      ['Ricardo Méndez López', 'SCT-11223344', 'C', '2026-09-25', '2026-12-01', '81 5555 4444', 'vacaciones', '2021-02-14', 'Ana Méndez', '81 4444 3333'],
    ],
    recordCount: 32,
  },
  {
    id: 'rutas',
    title: 'Importar Rutas',
    description: 'Rutas predefinidas con orígenes, destinos y tarifas base',
    icon: MapPin,
    color: 'text-status-danger',
    backendEndpoint: '/routes',
    columns: [
      { name: 'nombre_ruta', type: 'string', required: true, minLength: 1, maxLength: 200 },
      { name: 'origen', type: 'string', required: true, maxLength: 100 },
      { name: 'destino', type: 'string', required: true, maxLength: 100 },
      { name: 'km_aprox', type: 'number', required: true },
      { name: 'tiempo_hrs', type: 'number', required: true },
      { name: 'tarifa_base', type: 'number', required: true },
      { name: 'casetas_incluidas', type: 'string', required: false, maxLength: 500 },
    ],
    sampleData: [
      ['Norte Express', 'CDMX', 'Monterrey', '920', '10', '45000', 'Cuautitlán,Palmillas,Saltillo'],
      ['Bajío Central', 'Guadalajara', 'Querétaro', '280', '3', '15000', 'Zapotlanejo,La Piedad'],
      ['Costa Pacífico', 'Manzanillo', 'CDMX', '850', '9', '42000', 'Colima,Atlacomulco'],
    ],
    recordCount: 67,
  },
];

// Helper to get columns as string array for template
export function getTemplateColumns(config: ImportTypeConfig): string[] {
  return config.columns.map(col => col.name);
}
