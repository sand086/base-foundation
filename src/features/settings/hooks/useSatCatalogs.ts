import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";

// Tipo base para retrocompatibilidad
export type SatProduct = {
  id?: number;
  clave: string;
  descripcion: string;
  es_material_peligroso?: string;
  activo?: boolean;
};

type CatalogMethods = {
  getAll: () => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: number, data: any) => Promise<any>;
  delete: (id: number) => Promise<any>;
};

// =========================================================================
// PATRÓN ADAPTER SIMPLIFICADO: Consumimos directamente la API con Axios
// para evitar que los nombres autogenerados de Swagger rompan la UI.
// =========================================================================

// Esta pequeña función genera mágicamente el CRUD para cualquier catálogo SAT
const createAdapter = (endpointPath: string): CatalogMethods => ({
  getAll: () => axiosClient.get(`/api/sat/${endpointPath}`).then((r) => r.data),
  create: (data) =>
    axiosClient.post(`/api/sat/${endpointPath}`, data).then((r) => r.data),
  update: (id, data) =>
    axiosClient.put(`/api/sat/${endpointPath}/${id}`, data).then((r) => r.data),
  delete: (id) =>
    axiosClient.delete(`/api/sat/${endpointPath}/${id}`).then((r) => r.data),
});

// ¡Mira qué limpio queda el diccionario ahora!
const CATALOG_ADAPTERS: Record<string, CatalogMethods> = {
  "sat-products": createAdapter("sat-products"),
  "sat-services": createAdapter("sat-services"),
  "sat-cargo-types": createAdapter("sat-cargo-types"),
  "sat-trailer-subtypes": createAdapter("sat-trailer-subtypes"),
  "sat-truck-configs": createAdapter("sat-truck-configs"),
  "sat-permit-types": createAdapter("sat-permit-types"),
  "sat-packaging-types": createAdapter("sat-packaging-types"),
  "sat-hazardous-materials": createAdapter("sat-hazardous-materials"),
  "sat-stations": createAdapter("sat-stations"),
  "sat-unit-weights": createAdapter("sat-unit-weights"),
  "sat-municipalities": createAdapter("sat-municipalities"),
  "sat-localities": createAdapter("sat-localities"),
  "sat-neighborhoods": createAdapter("sat-neighborhoods"),
  "sat-location-codes": createAdapter("sat-location-codes"),
};

export const useSatCatalogs = () => {
  const [products, setProducts] = useState<SatProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // =========================================================
  // RETROCOMPATIBILIDAD (Para no romper el modal de Despacho)
  // =========================================================
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CATALOG_ADAPTERS["sat-products"].getAll();
      setProducts(data as SatProduct[]);
    } catch (error) {
      console.error("Error fetching SAT products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const saveProduct = async (
    productData: Omit<SatProduct, "id"> & { id?: number },
  ) => {
    const adapter = CATALOG_ADAPTERS["sat-products"];
    if (productData.id && productData.id > 0) {
      return await adapter.update(Number(productData.id), productData);
    } else {
      const { id, ...dataToCreate } = productData;
      return await adapter.create(dataToCreate);
    }
  };

  const deleteProduct = async (id: number) => {
    await CATALOG_ADAPTERS["sat-products"].delete(id);
    return true;
  };

  // =========================================================
  // MÉTODOS DINÁMICOS (Para el Gestor Multi-Catálogo)
  // =========================================================
  const fetchCatalog = useCallback(
    async <T = any>(endpoint: string): Promise<T[]> => {
      if (!CATALOG_ADAPTERS[endpoint]) {
        toast.error(`Catálogo ${endpoint} no configurado.`);
        return [];
      }

      setLoading(true);
      try {
        const data = await CATALOG_ADAPTERS[endpoint].getAll();
        return data as T[];
      } catch (error: any) {
        console.error(`Error fetching ${endpoint}:`, error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const saveItem = async <T = any>(
    endpoint: string,
    itemData: any,
  ): Promise<T> => {
    const payload = { ...itemData };
    const id = payload.id;

    // Eliminamos metadatos de UI para no romper Pydantic en FastAPI
    delete payload.id;
    delete payload.activo;

    const adapter = CATALOG_ADAPTERS[endpoint];
    if (!adapter) throw new Error("Catálogo no soportado");

    if (id && id !== 0) {
      const data = await adapter.update(id, payload);
      return data as T;
    } else {
      const data = await adapter.create(payload);
      return data as T;
    }
  };

  const deleteItem = async (endpoint: string, id: number): Promise<boolean> => {
    const adapter = CATALOG_ADAPTERS[endpoint];
    if (!adapter) throw new Error("Catálogo no soportado");

    await adapter.delete(id);
    return true;
  };

  return {
    products,
    loading,
    saveProduct,
    deleteProduct,
    refreshProducts: fetchProducts,
    fetchCatalog,
    saveItem,
    deleteItem,
  };
};
