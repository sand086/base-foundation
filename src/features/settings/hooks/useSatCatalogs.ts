import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";

export interface SatProduct {
  id: number;
  clave: string;
  descripcion: string;
  es_material_peligroso: string;
}

export const useSatCatalogs = () => {
  const [products, setProducts] = useState<SatProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Envolvemos el fetch en useCallback para poder llamarlo después de guardar/eliminar si lo deseamos
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/catalogs-sat/sat-products");
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching SAT products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Función para Crear o Actualizar
  const saveProduct = async (
    productData: Omit<SatProduct, "id"> & { id?: number },
  ) => {
    try {
      // Si el ID es mayor a 0, significa que ya existe en BD, hacemos PUT
      if (productData.id && productData.id > 0) {
        const response = await axiosClient.put(
          `/catalogs-sat/sat-products/${productData.id}`,
          productData,
        );
        return response.data;
      } else {
        // Si el ID es 0 o no existe, es un registro nuevo, hacemos POST
        // Removemos el ID temporal antes de enviarlo al backend
        const { id, ...dataToCreate } = productData;
        const response = await axiosClient.post(
          "/catalogs-sat/sat-products",
          dataToCreate,
        );
        return response.data;
      }
    } catch (error) {
      console.error("Error saving SAT product:", error);
      throw error; // Lanzamos el error para que el componente muestre el toast.error
    }
  };

  // Función para Eliminar
  const deleteProduct = async (id: number) => {
    try {
      await axiosClient.delete(`/catalogs-sat/sat-products/${id}`);
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
