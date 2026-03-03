// src/hooks/useSatCatalogs.ts
import { useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get("/catalogs/sat-products");
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching SAT products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading };
};
