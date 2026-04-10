import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";
import { LicenseType } from "@/features/settings/types";
import { toast } from "sonner";

export function useLicenseTypes() {
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLicenseTypes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/api/catalogs/license-types");
      setLicenseTypes(data);
    } catch (error) {
      console.error("Error al cargar tipos de licencia");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveLicenseTypes = async (payload: LicenseType[]) => {
    try {
      await axiosClient.post("/api/catalogs/license-types/bulk", payload);
      await fetchLicenseTypes();
      return true;
    } catch (error) {
      console.error("Error al guardar licencias");
      return false;
    }
  };

  useEffect(() => {
    fetchLicenseTypes();
  }, [fetchLicenseTypes]);

  return {
    licenseTypes,
    loading,
    saveLicenseTypes,
    refresh: fetchLicenseTypes,
  };
}
