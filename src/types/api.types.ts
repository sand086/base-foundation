// ==========================================
// ENUMS (Coinciden con models.py)
// ==========================================

export type UnitTipo = string;

export type UnitStatus =
  | "disponible"
  | "en_ruta"
  | "mantenimiento"
  | "bloqueado";

export type OperatorStatus =
  | "activo"
  | "inactivo"
  | "vacaciones"
  | "incapacidad";

export type ClientStatus = "activo" | "pendiente" | "incompleto";

// ==========================================
// INTERFACES (Ids Numéricos)
// ==========================================

export interface Unidad {
  id: number; // <--- INTEGER
  public_id: string; // ID Visual (ej. UNIT-001)

  numero_economico: string;
  placas: string;
  vin?: string | null;
  marca: string;
  modelo: string;
  year?: number;

  tipo: UnitTipo;
  status: UnitStatus;

  permiso_sct_folio?: string;
  permiso_sct_url?: string | null;
  caat_folio?: string;
  caat_vence?: string;
  caat_url?: string | null;

  // Campos técnicos
  tipo_1?: string;
  tipo_carga?: string | null;
  numero_serie_motor?: string | null;
  marca_motor?: string | null;
  capacidad_carga?: number | null;

  // Alertas
  documentos_vencidos: number;
  llantas_criticas: number;

  // Fechas (Strings ISO YYYY-MM-DD que vienen del JSON)
  seguro_vence?: string | null;
  verificacion_humo_vence?: string | null;
  verificacion_fisico_mecanica_vence?: string | null;
  verificacion_vence?: string | null;
  permiso_sct_vence?: string | null;

  // Documentos URLs
  tarjeta_circulacion_url?: string | null;
  poliza_seguro_url?: string | null;
  verificacion_humo_url?: string | null;
  verificacion_fisico_mecanica_url?: string | null;
  permiso_doble_articulado_url?: string | null;

  tarjeta_circulacion_folio?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface Operator {
  id: number; // <--- INTEGER
  public_id?: string; // Opcional (ej. OP-001)

  name: string;
  license_number: string;
  license_expiry: string;
  medical_check_expiry: string;
  phone?: string;

  status: OperatorStatus;

  assigned_unit_id?: number | null; // <--- INTEGER (Relación FK)

  // Datos opcionales para visualización
  unit_economico?: string;
}

// --- COMERCIAL (Clientes, Subclientes, Tarifas) ---

export interface Tariff {
  id: number; // <--- INTEGER
  sub_client_id: number;
  nombre_ruta: string;
  tipo_unidad: string; // O UnitTipo si el backend lo valida estricto
  tarifa_base: number;
  costo_casetas: number;
  moneda: string;
  vigencia: string; // YYYY-MM-DD
  estatus: string;
}

export interface SubClient {
  id: number; // <--- INTEGER
  client_id: number;

  nombre: string;
  alias?: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigo_postal?: string;

  tipo_operacion: string; // 'nacional', 'importacion', etc.
  contacto?: string;
  telefono?: string;
  horario_recepcion?: string;
  dias_credito?: number;

  requiere_contrato: boolean;
  convenio_especial: boolean;

  tariffs: Tariff[]; // Array de tarifas anidadas
}

export interface Client {
  id: number; // <--- INTEGER
  public_id?: string; // Opcional (ej. CLI-001)

  razon_social: string;
  rfc: string;
  regimen_fiscal?: string;
  uso_cfdi?: string;
  estatus: ClientStatus;

  contacto_principal?: string;
  telefono?: string;
  email?: string;

  direccion_fiscal?: string;
  codigo_postal_fiscal?: string;
  contrato_url?: string;
  dias_credito?: number;

  sub_clients: SubClient[]; // Array de subclientes anidados

  created_at?: string;
}

// ==========================================
// AUTH & SYSTEM
// ==========================================

export interface User {
  id: number; // <--- INTEGER
  nombre: string;
  email: string;
  role_id?: number | null; // <--- INTEGER
  avatar_url?: string;
  activo?: boolean;
}

export interface LoginResponse {
  access_token?: string;
  token_type?: string;

  // Flujo 2FA
  require_2fa?: boolean;
  temp_token?: string;

  user?: User;
}

export interface TwoFactorVerifyRequest {
  temp_token: string;
  code: string;
}

export interface TwoFactorVerifyResponse {
  access_token?: string;
  token_type?: string;

  user?: User;
}
