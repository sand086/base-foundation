import axiosClient from "@/api/axiosClient";

// 1. Interfaces Base
export interface Unidad {
  id: string;
  numero_economico: string;
  placas: string;
  marca: string;
  modelo: string;
  year?: number;
  tipo: "sencillo" | "full" | "rabon";
  status: "disponible" | "en_ruta" | "mantenimiento" | "bloqueado";
  vin?: string;
  documentos_vencidos?: number;
  llantas_criticas?: number;
  seguro_vence?: string;
  verificacion_vence?: string;
  permiso_sct_vence?: string;
}

// 2. Interfaz Extendida para la Vista de Detalles (Incluye Docs y Llantas)
export interface UnidadDetalle extends Unidad {
  documents: Array<{
    name: string;
    estatus: "vigente" | "próximo" | "vencido";
    vencimiento: string;
    obligatorio: boolean;
  }>;
  tires: Array<{
    id: string;
    position: string;
    marca: string;
    profundidad: number;
    estado: "bueno" | "regular" | "malo";
    renovado: number;
    marcajeInterno: string;
  }>;
}

// 3. Servicio Completo
export const unitService = {
  // Obtener todas las unidades (para la tabla)
  getAll: async (): Promise<Unidad[]> => {
    const { data } = await axiosClient.get("/units");
    return data;
  },

  // Crear unidad
  create: async (unidad: Unidad): Promise<Unidad> => {
    const { data } = await axiosClient.post("/units", unidad);
    return data;
  },

  // Actualizar unidad
  update: async (id: string, unidad: Partial<Unidad>): Promise<Unidad> => {
    const { data } = await axiosClient.put(`/units/${id}`, unidad);
    return data;
  },

  // Eliminar unidad
  delete: async (id: string): Promise<void> => {
    await axiosClient.delete(`/units/${id}`);
  },

  // --- ¡ESTA ES LA FUNCIÓN QUE TE FALTABA! ---
  // Obtener detalle por Número Económico + Mock de datos faltantes en BD
  getByNumeroEconomico: async (num: string): Promise<UnidadDetalle> => {
    // 1. Obtenemos las unidades reales del backend
    const { data } = await axiosClient.get("/units");

    // 2. Buscamos la que coincida con el número económico
    const unit = data.find((u: Unidad) => u.numero_economico === num);

    if (!unit) throw new Error("Unidad no encontrada");

    // 3. Como el backend aún no guarda documentos ni llantas,
    // los simulamos aquí para que la vista de detalle no se rompa y se vea bonita.
    return {
      ...unit,
      // Mock de Documentos
      documents: [
        {
          name: "Póliza de Seguro",
          estatus: "vigente",
          vencimiento: "2026-12-31",
          obligatorio: true,
        },
        {
          name: "Verificación Físico-Mecánica",
          estatus: "próximo",
          vencimiento: "2026-03-15",
          obligatorio: true,
        },
        {
          name: "Tarjeta de Circulación",
          estatus: unit.documentos_vencidos ? "vencido" : "vigente",
          vencimiento: "2025-11-20",
          obligatorio: true,
        },
      ],
      // Mock de Llantas (Generamos datos visuales basados en el tipo)
      tires: [
        {
          id: "LL-101",
          position: "1 (Dir. Izq)",
          marca: "Michelin",
          profundidad: 14,
          estado: "bueno",
          renovado: 0,
          marcajeInterno: "M-101",
        },
        {
          id: "LL-102",
          position: "2 (Dir. Der)",
          marca: "Michelin",
          profundidad: 13,
          estado: "bueno",
          renovado: 0,
          marcajeInterno: "M-102",
        },
        {
          id: "LL-201",
          position: "3 (Trac. Izq)",
          marca: "Bridgestone",
          profundidad: 5,
          estado: "regular",
          renovado: 1,
          marcajeInterno: "B-205",
        },
        {
          id: "LL-202",
          position: "4 (Trac. Der)",
          marca: "Bridgestone",
          profundidad: unit.llantas_criticas ? 2 : 8,
          estado: unit.llantas_criticas ? "malo" : "bueno",
          renovado: 1,
          marcajeInterno: "B-206",
        },
      ],
    } as UnidadDetalle;
  },
};
