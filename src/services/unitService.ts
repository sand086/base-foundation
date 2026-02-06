import axiosClient from "@/api/axiosClient";

// 1. Interfaces Base
// CORRECCIÓN: Usamos snake_case para coincidir con Python/Postgres
export interface Unidad {
  id: number;
  public_id: string;
  numero_economico: string;
  placas: string;
  vin?: string;
  marca: string;
  modelo: string;
  year?: number;
  tipo: string;

  // Campos técnicos
  tipo_1?: string;
  tipo_carga?: string;
  numero_serie_motor?: string;
  marca_motor?: string;
  capacidad_carga?: number;

  status: string;

  // Alertas
  documentos_vencidos: number;
  llantas_criticas: number;

  // Fechas (Strings ISO)
  seguro_vence?: string;
  verificacion_humo_vence?: string;
  verificacion_fisico_mecanica_vence?: string;
  verificacion_vence?: string;
  permiso_sct_vence?: string;

  // URLs de Documentos
  tarjeta_circulacion_url?: string;
  permiso_doble_articulado_url?: string;
  poliza_seguro_url?: string;
  verificacion_humo_url?: string;
  verificacion_fisico_mecanica_url?: string;

  created_at?: string;
  updated_at?: string;
}

// 2. Interfaz Extendida
export interface UnidadDetalle extends Unidad {
  documents: Array<{
    key: string;
    name: string;
    url?: string; // Para botón ver
    estatus: "vigente" | "próximo" | "vencido";
    vencimiento: string;
    obligatorio: boolean;
  }>;
  tires: Array<{
    id?: number;
    position: string;
    marca?: string;
    profundidad: number;
    estado: string;
    renovado: number;
    tire_id?: string; // Serial físico
    marcajeInterno?: string; // Alias UI
  }>;
}

// 3. Servicio Completo
export const unitService = {
  getAll: async () => {
    const response = await axiosClient.get<Unidad[]>("/units");
    return response.data;
  },

  getBynumero_economico: async (term: string) => {
    const response = await axiosClient.get<Unidad>(`/units/${term}`);
    return response.data;
  },

  create: async (unit: Omit<Unidad, "id">) => {
    const response = await axiosClient.post<Unidad>("/units", unit);
    return response.data;
  },

  // OJO: Aquí 'unit' debe enviar snake_case al backend
  update: async (id: string | number, unit: Partial<Unidad>) => {
    const response = await axiosClient.put<Unidad>(`/units/${id}`, unit);
    return response.data;
  },

  delete: async (id: string | number) => {
    const response = await axiosClient.delete(`/units/${id}`);
    return response.data;
  },

  importBulk: async (file: File) => {
    console.log("--> SERVICIO: Iniciando carga de archivo", file.name);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axiosClient.post("/units/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("--> SERVICIO ERROR:", error);
      throw error;
    }
  },

  uploadDocument: async (
    numero_economico: string,
    docType: string,
    file: File,
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post(
      `/units/${numero_economico}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  updateTires: async (numero_economico: string, tires: any[]) => {
    const response = await axiosClient.put(
      `/units/${numero_economico}/tires`,
      tires,
    );
    return response.data;
  },
};
