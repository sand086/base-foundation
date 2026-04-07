import { useState, useEffect, useCallback } from "react";
import { DefaultService } from "@/api/generated";

export interface SatProduct {
  id: number;
  clave: string;
  descripcion: string;
  es_material_peligroso: string;
}

export const useSatCatalogs = () => {
  const [products, setProducts] = useState<SatProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await DefaultService.getSatProductsApiSatSatProductsGet();
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
    try {
      if (productData.id && productData.id > 0) {
        return await DefaultService.updateSatProductApiSatSatProductsProductIdPut(
          Number(productData.id),
          productData as any,
        );
      } else {
        const { id, ...dataToCreate } = productData;
        return await DefaultService.createSatProductApiSatSatProductsPost(dataToCreate as any);
      }
    } catch (error) {
      console.error("Error saving SAT product:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await DefaultService.deleteSatProductApiSatSatProductsProductIdDelete(Number(id));
      return true;
    } catch (error) {
      console.error("Error deleting SAT product:", error);
      throw error;
    }
  };

  return {
    products,
    loading,
    saveProduct,
    deleteProduct,
    refreshProducts: fetchProducts,
  };
};
