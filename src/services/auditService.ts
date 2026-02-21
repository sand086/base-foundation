import axiosClient from "@/api/axiosClient";

export interface AuditLog {
  id: string;
  usuario: string;
  accion: string;
  tipoAccion: string;
  modulo: string;
  detalles: string;
  ip: string;
  fechaHora: string;
  dispositivo: string;
}

export const auditService = {
  getAll: async (): Promise<AuditLog[]> => {
    // Ya apuntamos al endpoint real de FastAPI
    const { data } = await axiosClient.get("/audit-logs");
    return data;
  },
};
