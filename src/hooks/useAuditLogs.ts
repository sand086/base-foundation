import { useState, useCallback } from "react";
import { auditService, AuditLog } from "@/services/auditService";
import { toast } from "sonner";

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAll();
      setLogs(data);
    } catch (error) {
      console.error("Error al cargar auditoría:", error);
      toast.error("No se pudo cargar el registro de auditoría");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logs, isLoading, fetchLogs };
};
