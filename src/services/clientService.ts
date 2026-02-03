import axiosClient from "@/api/axiosClient";

// --- Interfaces (Coinciden con schemas.py) ---

export interface Tariff {
  id: string;
  nombre_ruta: string;
  tipo_unidad: string;
  tarifa_base: number;
  costo_casetas: number;
  moneda: string;
  vigencia: string; // YYYY-MM-DD
  estatus: string;
}

export interface SubClient {
  id: string;
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
  tariffs: Tariff[]; // Nota: backend usa 'tariffs' en inglés en el response
}

export interface Client {
  id: string;
  razon_social: string;
  rfc: string;
  regimen_fiscal?: string;
  uso_cfdi?: string;
  contacto_principal?: string;
  telefono?: string;
  email?: string;
  direccion_fiscal?: string;
  codigo_postal_fiscal?: string;
  estatus: string;
  contrato_url?: string;
  dias_credito?: number;
  sub_clients: SubClient[];
}

export const clientService = {
  getClients: async (): Promise<Client[]> => {
    const { data } = await axiosClient.get("/clientes");
    return data;
  },

  getClient: async (id: string): Promise<Client> => {
    const { data } = await axiosClient.get(`/clientes/${id}`);
    return data;
  },

  createClient: async (client: any): Promise<Client> => {
    const { data } = await axiosClient.post("/clientes", client);
    return data;
  },

  updateClient: async (id: string, client: any): Promise<Client> => {
    const { data } = await axiosClient.put(`/clientes/${id}`, client);
    return data;
  },

  deleteClient: async (id: string): Promise<void> => {
    await axiosClient.delete(`/clientes/${id}`);
  },
};
