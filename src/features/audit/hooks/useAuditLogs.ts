import { useState, useCallback } from "react";
import { auditService } from "@/features/audit/services/auditService";
import { toast } from "sonner";

import { AuditLog } from "@/features/audit/types";

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
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logs, isLoading, fetchLogs };
};
