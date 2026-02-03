// Basado en UnitResponse de schemas.py
export interface Unit {
  id: string;
  numero_economico: string; // Nota: Python usa snake_case
  placas: string;
  vin?: string;
  marca: string;
  modelo: string;
  year?: number;
  tipo: "sencillo" | "full" | "rabon";
  status: "disponible" | "en_ruta" | "mantenimiento" | "bloqueado";
  documentos_vencidos: number;
  llantas_criticas: number;
  created_at?: string;
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
