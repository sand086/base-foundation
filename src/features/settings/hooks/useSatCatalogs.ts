import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

// Importamos tus servicios autogenerados exactos
import {
  SatProductosCpService,
  SatCartaPorteService,
  SatUbicacionesService,
} from "@/api/generated";

// Importamos el tipo para retrocompatibilidad
import type { SatProductResponse } from "@/api/generated";

export type SatProduct = SatProductResponse;

// =========================================================================
// PATRÓN ADAPTER: Diccionario que mapea el string del endpoint del UI
// con la función estática exacta autogenerada de OpenAPI.
// =========================================================================
type CatalogMethods = {
  getAll: () => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: number, data: any) => Promise<any>;
  delete: (id: number) => Promise<any>;
};

const CATALOG_ADAPTERS: Record<string, CatalogMethods> = {
  // ---------------- PRODUCTOS ----------------
  "sat-products": {
    getAll: () => SatProductosCpService.getAllApiSatSatProductsGet(),
    create: (data) =>
      SatProductosCpService.createItemApiSatSatProductsPost(data),
    update: (id, data) =>
      SatProductosCpService.updateItemApiSatSatProductsItemIdPut(id, data),
    delete: (id) =>
      SatProductosCpService.deleteItemApiSatSatProductsItemIdDelete(id),
  },

  // ---------------- CARTA PORTE ----------------
  "sat-services": {
    getAll: () => SatCartaPorteService.getAllApiSatSatServicesGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatServicesPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatServicesItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatServicesItemIdDelete(id),
  },
  "sat-cargo-types": {
    getAll: () => SatCartaPorteService.getAllApiSatSatCargoTypesGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatCargoTypesPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatCargoTypesItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatCargoTypesItemIdDelete(id),
  },
  "sat-trailer-subtypes": {
    getAll: () => SatCartaPorteService.getAllApiSatSatTrailerSubtypesGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatTrailerSubtypesPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatTrailerSubtypesItemIdPut(
        id,
        data,
      ),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatTrailerSubtypesItemIdDelete(id),
  },
  "sat-truck-configs": {
    getAll: () => SatCartaPorteService.getAllApiSatSatTruckConfigsGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatTruckConfigsPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatTruckConfigsItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatTruckConfigsItemIdDelete(id),
  },
  "sat-permit-types": {
    getAll: () => SatCartaPorteService.getAllApiSatSatPermitTypesGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatPermitTypesPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatPermitTypesItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatPermitTypesItemIdDelete(id),
  },
  "sat-packaging-types": {
    getAll: () => SatCartaPorteService.getAllApiSatSatPackagingTypesGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatPackagingTypesPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatPackagingTypesItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatPackagingTypesItemIdDelete(id),
  },
  "sat-hazardous-materials": {
    getAll: () => SatCartaPorteService.getAllApiSatSatHazardousMaterialsGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatHazardousMaterialsPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatHazardousMaterialsItemIdPut(
        id,
        data,
      ),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatHazardousMaterialsItemIdDelete(
        id,
      ),
  },
  "sat-stations": {
    getAll: () => SatCartaPorteService.getAllApiSatSatStationsGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatStationsPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatStationsItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatStationsItemIdDelete(id),
  },
  "sat-unit-weights": {
    getAll: () => SatCartaPorteService.getAllApiSatSatUnitWeightsGet(),
    create: (data) =>
      SatCartaPorteService.createItemApiSatSatUnitWeightsPost(data),
    update: (id, data) =>
      SatCartaPorteService.updateItemApiSatSatUnitWeightsItemIdPut(id, data),
    delete: (id) =>
      SatCartaPorteService.deleteItemApiSatSatUnitWeightsItemIdDelete(id),
  },

  // ---------------- UBICACIONES ----------------
  "sat-municipalities": {
    getAll: () => SatUbicacionesService.getAllApiSatSatMunicipalitiesGet(),
    create: (data) =>
      SatUbicacionesService.createItemApiSatSatMunicipalitiesPost(data),
    update: (id, data) =>
      SatUbicacionesService.updateItemApiSatSatMunicipalitiesItemIdPut(
        id,
        data,
      ),
    delete: (id) =>
      SatUbicacionesService.deleteItemApiSatSatMunicipalitiesItemIdDelete(id),
  },
  "sat-localities": {
    getAll: () => SatUbicacionesService.getAllApiSatSatLocalitiesGet(),
    create: (data) =>
      SatUbicacionesService.createItemApiSatSatLocalitiesPost(data),
    update: (id, data) =>
      SatUbicacionesService.updateItemApiSatSatLocalitiesItemIdPut(id, data),
    delete: (id) =>
      SatUbicacionesService.deleteItemApiSatSatLocalitiesItemIdDelete(id),
  },
  "sat-neighborhoods": {
    getAll: () => SatUbicacionesService.getAllApiSatSatNeighborhoodsGet(),
    create: (data) =>
      SatUbicacionesService.createItemApiSatSatNeighborhoodsPost(data),
    update: (id, data) =>
      SatUbicacionesService.updateItemApiSatSatNeighborhoodsItemIdPut(id, data),
    delete: (id) =>
      SatUbicacionesService.deleteItemApiSatSatNeighborhoodsItemIdDelete(id),
  },
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
      // Separamos la data para que coincida con el schema de creación puro
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

    // Al no usar try/catch aquí, el catch en el Súper Gestor lo atrapa
    // y muestra el mensaje de error validado de tu backend.
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
