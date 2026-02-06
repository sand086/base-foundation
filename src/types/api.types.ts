// Basado en UnitResponse de schemas.py
//

export type UnitTipo =
  | "sencillo"
  | "full"
  | "rabon"
  | "tractocamion"
  | "remolque"
  | "camioneta"
  | "camion"
  | "otro";

export type UnitStatus =
  | "disponible"
  | "en_ruta"
  | "mantenimiento"
  | "bloqueado";

export interface Unidad {
  id: number;
  public_id: string;

  numero_economico: string;
  placas: string;
  vin?: string | null;
  marca: string;
  modelo: string;
  year?: number;

  tipo: "sencillo" | "full" | "rabon" | "tractocamion" | "remolque" | "otro";

  status: "disponible" | "en_ruta" | "mantenimiento" | "bloqueado";

  // Campos técnicos
  tipo_1?: string;
  tipo_carga?: string | null;
  numero_serie_motor?: string | null;
  marca_motor?: string | null;
  capacidad_carga?: number | null;

  // Alertas
  documentos_vencidos: number;
  llantas_criticas: number;

  // Fechas (Strings ISO YYYY-MM-DD)
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

  created_at?: string;
  updated_at?: string;
}

// Basado en OperatorResponse
export interface Operator {
  id: string;
  name: string;
  license_number: string;
  license_expiry: string;
  medical_check_expiry: string;
  phone?: string;
  status: "activo" | "inactivo" | "vacaciones" | "incapacidad";
  assigned_unit_id?: string;
}

// Basado en ClientResponse
export interface Client {
  id: string;
  razon_social: string;
  rfc: string;
  estatus: "activo" | "pendiente" | "incompleto";
  sub_clients_count?: number; // Para listados
}

export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  require_2fa?: boolean;
  temp_token?: string;
  user: {
    id?: string;
    nombre: string;
    email: string;
    role_id?: string;
  };
}
