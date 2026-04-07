import axiosClient from "@/api/axiosClient";
import { AuditLog } from "@/features/audit/types";

export const auditService = {
  getAll: async (): Promise<AuditLog[]> => {
    // Ya apuntamos al endpoint real de FastAPI
    //const { data } = await axiosClient.get("/api/users/audit-logs");
    return [];
  },
};
