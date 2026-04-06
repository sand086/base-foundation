import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";
import { Insurer } from "@/types/api.types";
import { toast } from "sonner";

export function useInsurers() {
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsurers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/catalogs/insurers");
      setInsurers(data);
    } catch (error) {
      toast.error("Error al cargar aseguradoras");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInsurers = async (payload: Insurer[]) => {
    try {
      await axiosClient.post("/catalogs/insurers/bulk", payload);
      await fetchInsurers();
      return true;
    } catch (error) {
      toast.error("Error al guardar aseguradoras");
      return false;
    }
  };

  useEffect(() => {
    fetchInsurers();
  }, [fetchInsurers]);

  return { insurers, loading, saveInsurers, refresh: fetchInsurers };
}
