import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";
import { SettlementConcept } from "@/types/api.types";
import { toast } from "sonner";

export function useSettlementConcepts() {
  const [concepts, setConcepts] = useState<SettlementConcept[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/catalogs/settlement-concepts");
      setConcepts(data);
    } catch (error) {
      toast.error("Error al cargar conceptos de pago");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConcepts = async (payload: SettlementConcept[]) => {
    try {
      await axiosClient.post("/catalogs/settlement-concepts/bulk", payload);
      await fetchConcepts();
      return true;
    } catch (error) {
      toast.error("Error al guardar conceptos");
      return false;
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  return { concepts, loading, saveConcepts, refresh: fetchConcepts };
}
