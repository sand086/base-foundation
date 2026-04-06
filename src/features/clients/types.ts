import { FormaPago } from "@/features/billing/types";
// ==========================================
// COMERCIAL: CLIENTES Y TARIFAS
// ==========================================
export type ClientStatus = "activo" | "pendiente" | "incompleto";

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

export interface AuthorizedRoute {
  id: number;
  origen: string;
  destino: string;
  kilometros?: number;
  tarifa_base?: number;
  cliente_id?: number;
  sub_cliente_id?: number;
  activo: boolean;
}
