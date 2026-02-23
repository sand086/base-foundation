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

export interface Unit {
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
  razon_bloqueo?: string | null;
  ignore_blocking?: boolean | null;

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
  id: number;
  public_id?: string;
  name: string;
  phone?: string;
  status: OperatorStatus;

  // Datos de Licencia
  license_number: string;
  license_type: string;
  license_expiry: string; // YYYY-MM-DD

  // Salud y Emergencia
  medical_check_expiry: string; // YYYY-MM-DD
  emergency_contact?: string;
  emergency_phone?: string;
  hire_date?: string;

  // Relaciones
  assigned_unit_id?: number | null;
  unit_economico?: string;

  // ✅ URLs de Documentos (Sincronizado con el modelo nuevo)
  foto_url?: string | null;
  licencia_url?: string | null;
  ine_url?: string | null;
  apto_medico_url?: string | null;
  comprobante_domicilio_url?: string | null;
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
  id: number;
  public_id?: string;
  razon_social: string;
  rfc: string;
  regimen_fiscal?: string;
  uso_cfdi?: string;
  estatus: string;
  contacto_principal?: string;
  telefono?: string;
  email?: string;
  direccion_fiscal?: string;
  codigo_postal_fiscal?: string;
  contrato_url?: string;
  dias_credito?: number; // ✅ Campo importante
  // Campos de documentos para evitar error ts(2353)
  constancia_fiscal_url?: string | null;
  acta_constitutiva_url?: string | null;
  comprobante_domicilio_url?: string | null;
  sub_clients: any[];
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

export interface LoginRequest {
  email: string;
  password: string;
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

export interface Mechanic {
  id: number;
  nombre: string;
  apellido?: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  fecha_contratacion?: string;
  nss?: string;
  rfc?: string;
  salario_base?: number;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  activo: boolean;
  foto_url?: string;
}

export interface MechanicDocument {
  id: number;
  mechanic_id: number;
  tipo_documento: string;
  nombre_archivo: string;
  url_archivo: string;
  fecha_vencimiento?: string;
  subido_en: string;
}

export interface TollBooth {
  id: number;
  nombre: string;
  tramo: string;
  costo_5_ejes_sencillo: number;
  costo_5_ejes_full: number;
  costo_9_ejes_sencillo: number;
  costo_9_ejes_full: number;
  forma_pago: "TAG" | "EFECTIVO" | "AMBOS";
}
export interface RateSegment {
  id: number;
  nombre_segmento: string;
  estado: string;
  carretera: string;
  distancia_km: number;
  tiempo_minutos: number;
  toll_booth_id: number | null;
  costo_momento_sencillo: number;
  costo_momento_full: number;
  orden: number;
}
export interface RateTemplate {
  id: number;
  client_id: number;
  origen: string;
  destino: string;
  // ✅ AGREGA ESTA PROPIEDAD:
  tipo_unidad: "5ejes" | "9ejes" | string;
  distancia_total_km: number;
  tiempo_total_minutos: number;
  costo_total_sencillo: number;
  costo_total_full: number;

  created_at: string;
  segments: RateSegment[];
}
