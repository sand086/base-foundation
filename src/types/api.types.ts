// src/types/api.types.ts

// ==========================================
// ENUMS Y TIPOS LITERALES
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

export type FormaPago = "TAG" | "EFECTIVO" | "AMBOS";

export type ClasificacionFinanciera =
  | "costo_directo_viaje"
  | "costo_mantenimiento"
  | "gasto_indirecto_fijo"
  | "gasto_indirecto_variable"
  | "ingreso_flete"
  | "maniobras";

// ==========================================
// INTERFACES (Ids Numéricos)
// ==========================================

export interface Unit {
  id: number;
  public_id: string;
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
  tipo_1?: string;
  tipo_carga?: string | null;
  numero_serie_motor?: string | null;
  marca_motor?: string | null;
  capacidad_carga?: number | null;
  capacidad_tanque_diesel?: number | string | null;
  capacidad_tanque_urea?: number | string | null;
  documentos_vencidos: number;
  llantas_criticas: number;
  seguro_vence?: string | null;
  verificacion_humo_vence?: string | null;
  verificacion_fisico_mecanica_vence?: string | null;
  verificacion_vence?: string | null;
  permiso_sct_vence?: string | null;
  tarjeta_circulacion_url?: string | null;
  poliza_seguro_url?: string | null;
  verificacion_humo_url?: string | null;
  verificacion_fisico_mecanica_url?: string | null;
  permiso_doble_articulado_url?: string | null;
  tarjeta_circulacion_folio?: string | null;
  created_at?: string;
  updated_at?: string;
  is_loaded?: boolean;
}

export interface UnitDocument {
  key: string;
  name: string;
  url?: string;
  estatus: "vigente" | "próximo" | "vencido";
  vencimiento: string;
  obligatorio: boolean;
}

export interface UnitTire {
  id: number;
  codigo_interno: string;
  marca?: string;
  modelo?: string;
  medida?: string;
  dot?: string;
  unit_id?: number | null;
  posicion?: string;
  estado: string;
  estado_fisico: string;
  profundidad_actual: number;
  profundidad_original: number;
  km_recorridos: number;
  fecha_compra?: string;
  precio_compra?: number;
  costo_acumulado?: number;
  proveedor?: string;
  unidad_actual_id?: number | null;
  unidad_actual_economico?: string | null;
  historial?: any[];
}

export interface Operator {
  id: number;
  public_id?: string;
  name: string;
  phone?: string;
  status: OperatorStatus;
  license_number: string;
  license_type: string;
  license_expiry: string;
  medical_check_expiry: string;
  emergency_contact?: string;
  emergency_phone?: string;
  hire_date?: string;
  assigned_unit_id?: number | null;
  unit_economico?: string;
  foto_url?: string | null;
  licencia_url?: string | null;
  ine_url?: string | null;
  apto_medico_url?: string | null;
  comprobante_domicilio_url?: string | null;
}

// --- COMERCIAL (Clientes, Subclientes, Tarifas) ---

export interface Tariff {
  id: number;
  sub_client_id: number;
  rate_template_id?: number | null;
  nombre_ruta: string;
  tipo_unidad: string;
  tarifa_base: number;
  costo_casetas: number;
  distancia_km?: number;
  iva_porcentaje: number;
  retencion_porcentaje: number;
  moneda: string;
  vigencia: string;
  estatus: string;
}

export interface SubClient {
  id: number;
  client_id: number;
  nombre: string;
  alias?: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigo_postal?: string;
  tipo_operacion: string;
  contacto?: string;
  telefono?: string;
  horario_recepcion?: string;
  dias_credito?: number;
  requiere_contrato: boolean;
  convenio_especial: boolean;
  tariffs: Tariff[];
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
  dias_credito?: number;
  constancia_fiscal_url?: string | null;
  acta_constitutiva_url?: string | null;
  comprobante_domicilio_url?: string | null;
  sub_clients: any[];
}

// ==========================================
// AUTH & SYSTEM
// ==========================================

export interface User {
  id: number;
  nombre: string;
  email: string;
  role_id?: number | null;
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
  forma_pago: FormaPago;
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
  client_id: number | null;
  origen: string;
  destino: string;
  tipo_unidad: "5ejes" | "9ejes" | string;
  distancia_total_km: number;
  tiempo_total_minutos: number;
  costo_total_sencillo: number;
  costo_total_full: number;
  created_at: string;
  segments: RateSegment[];
}

// ==========================================
// Cuentas por Pagar (CxP) y Cuentas por Cobrar (CxC)
// ==========================================

export interface Supplier {
  id: number;
  razon_social: string;
  rfc: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigo_postal?: string;
  dias_credito: number;
  limite_credito: number;
  contacto_principal?: string;
  categoria?: string;
  tipo_proveedor?: string;
  zonas_cobertura?: string;
  banco?: string;
  cuenta_bancaria?: string;
  clabe?: string;
  estatus: "activo" | "inactivo" | "suspendido";
  created_at?: string;
  updated_at?: string;
}

export interface InvoicePayment {
  id?: number;
  invoice_id?: number;
  fecha_pago: string; // YYYY-MM-DD
  monto: number;
  metodo_pago?: string;
  referencia?: string;
  cuenta_retiro?: string;
  complemento_uuid?: string;
}

export interface PayableInvoice {
  id: number;
  supplier_id?: number | null;

  supplier_razon_social?: string;
  viaje_id?: number | null;
  unit_id?: number | null;
  categoria_indirecto_id?: number | null;
  uuid?: string | null;
  folio_interno?: string;
  subtotal?: number;
  iva?: number;
  retenciones?: number;
  monto_total: number;
  saldo_pendiente: number;
  dias_credito?: number;
  moneda: string;
  fecha_emision: string; // YYYY-MM-DD
  fecha_vencimiento: string; // YYYY-MM-DD
  concepto?: string;
  clasificacion?: string;
  estatus: "pendiente" | "pago_parcial" | "pagado" | "cancelado";
  pdf_url?: string;
  xml_url?: string;
  orden_compra_id?: string;
  orden_compra_folio?: string;
  payments?: InvoicePayment[];
}

// ==========================================
// UTILIDADES PARA MODALES (Prefills, Lites, Payloads)
// ==========================================

export interface TripLite {
  id: number;
  folio: string;
  origin: string;
  destination: string;
}

export interface UnitLite {
  id: number;
  numero_economico: string;
  tipo: string;
  placas: string;
}

export interface IndirectCategory {
  id: number;
  nombre: string;
  tipo: "fijo" | "variable";
  estatus?: "activo" | "inactivo" | string;
}

export interface BankAccount {
  id: number;
  name: string;
  last_digits?: string;
  currency?: string;
}

export interface PrefillData {
  proveedor: string;
  proveedorId: string;
  concepto: string;
  montoTotal: number;
  ordenCompraId: string;
  ordenCompraFolio: string;
}

export interface RegisterExpensePayload {
  supplier_id: number | null;
  concepto: string;
  monto_total: number;
  moneda: "MXN" | "USD";
  uuid: string | null;
  fecha_emision: string;
  dias_credito: number;
  fecha_vencimiento: string;
  clasificacion: ClasificacionFinanciera | string;
  viaje_id: number | null;
  unidad_id: number | null;
  categoria_indirecto_id: number | null;
  orden_compra_id: string | null;
  orden_compra_folio: string | null;
  pdf_url: string | null;
  xml_url: string | null;
}

export interface RegisterPaymentPayload {
  fecha_pago: string;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
  cuenta_retiro: number;
}

// ==========================================
// DESPACHO / VIAJES (Trips & Legs)
// ==========================================

export type TripStatus =
  | "creado"
  | "en_transito"
  | "detenido"
  | "retraso"
  | "entregado"
  | "cerrado"
  | "accidente"
  | "bloqueado";

export type TripLegType = "carga_muelle" | "ruta_carretera" | "entrega_vacio";

export interface TripTimelineEvent {
  id?: number;
  time: string;
  event: string;
  event_type: string;
}

// 🚀 EL NUEVO TRAMO (Esta es la nueva "Tarjeta" del Kanban)
export interface TripLeg {
  id: number;
  trip_id: number;
  leg_type: TripLegType;
  status: TripStatus;

  unit_id?: number | null;
  operator_id?: number | null;

  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;
  otros_anticipos: number;
  saldo_operador: number;

  odometro_inicial: number;
  nivel_tanque_inicial: number;

  start_date?: string | null;
  actual_arrival?: string | null;
  last_location?: string | null;
  last_update?: string | null;

  timeline_events?: TripTimelineEvent[];
  unit?: Unit;
  operator?: Operator;
  trip?: Trip; // Referencia al viaje padre (opcional)
}

// 🚀 EL VIAJE PADRE (Contenedor general)
export interface Trip {
  id: number;
  public_id?: string;
  client_id: number;
  sub_client_id: number;
  tariff_id?: number | null;

  remolque_1_id?: number | null;
  dolly_id?: number | null;
  remolque_2_id?: number | null;

  origin: string;
  destination: string;
  route_name?: string;
  status: TripStatus;

  tarifa_base: number;
  costo_casetas: number;

  descripcion_mercancia: string; // "Clave - Descripción" del SAT
  peso_toneladas: number;
  es_material_peligroso: boolean;
  clase_imo?: string | null;

  start_date: string;
  closed_at?: string | null;

  // Relaciones
  client?: Client;
  sub_client?: SubClient;
  remolque_1?: Unit;
  dolly?: Unit;
  remolque_2?: Unit;

  legs?: TripLeg[]; // Lista de tramos de este viaje
}

export interface TripLegCreatePayload {
  leg_type: TripLegType;
  unit_id?: number | null;
  operator_id?: number | null;
  odometro_inicial: number;
  nivel_tanque_inicial: number;
  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;
}

export interface TripCreatePayload {
  client_id: number;
  sub_client_id: number;
  tariff_id?: number | null;
  origin: string;
  destination: string;
  route_name?: string | null;

  remolque_1_id?: number | null;
  dolly_id?: number | null;
  remolque_2_id?: number | null;

  tarifa_base: number;
  costo_casetas?: number;
  status: TripStatus;
  start_date: string;

  initial_leg: TripLegCreatePayload; // ✅ Requisito de tu backend
}

export interface Brand {
  id: number;
  nombre: string;
  tipo_activo: string;
}
