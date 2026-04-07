import { useState, useEffect, useCallback } from "react";
import { UnitType } from "@/features/settings/types";
import axiosClient from "@/api/axiosClient"; //  Importamos el cliente real
import { toast } from "sonner";

// 1. Definimos el valor por defecto AQUÍ MISMO para que no falle el tipado
// Esto solo se usará si el backend falla o está vacío.
const FALLBACK_TIPOS: UnitType[] = [
  { id: "tractocamion", nombre: "Tractocamión", icono: "🚛", activo: true },
  { id: "remolque", nombre: "Remolque", icono: "📦", activo: true },
  { id: "rabon", nombre: "Rabón", icono: "🚚", activo: true },
];

export function useUnitTypes() {
  const [tiposUnidad, setTiposUnidad] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Función para traer los datos reales de Python (FastAPI)
  const fetchTipos = useCallback(async () => {
    try {
      setLoading(true);
      // Asegúrate de tener este endpoint en tu backend
      const { data } = await axiosClient.get<UnitType[]>(
        "/api/catalogs/unit-types",
      );

      if (data && data.length > 0) {
        setTiposUnidad(data);
      } else {
        setTiposUnidad(FALLBACK_TIPOS);
      }
    } catch (error) {
      console.error("Error cargando tipos de unidad:", error);
      // Si falla la red, usamos el fallback para que la app no se rompa
      setTiposUnidad(FALLBACK_TIPOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTipos();
  }, [fetchTipos]);

  // 3. Función para guardar (Admin)
  const saveTiposUnidad = useCallback(async (tipos: UnitType[]) => {
    try {
      setLoading(true);
      await axiosClient.post("/api/catalogs/unit-types/bulk", tipos);
      setTiposUnidad(tipos);
      toast.success("Catálogo actualizado en el servidor");
    } catch (error) {
      toast.error("Error al guardar cambios");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Helpers de UI ---

  const tiposActivos = tiposUnidad.filter((t) => t.activo);

  const getTipo = useCallback(
    (idOrNombre: string) => {
      if (!idOrNombre) return null;
      return tiposUnidad.find(
        (t) =>
          t.id === idOrNombre ||
          t.nombre.toLowerCase() === idOrNombre.toLowerCase(),
      );
    },
    [tiposUnidad],
  );

  const getTipoLabel = useCallback(
    (idOrNombre: string) => {
      const tipo = getTipo(idOrNombre);
      if (tipo) return `${tipo.icono} ${tipo.nombre}`;

      return idOrNombre
        ? idOrNombre.charAt(0).toUpperCase() + idOrNombre.slice(1)
        : "N/A";
    },
    [getTipo],
  );

  const getTipoIcono = useCallback(
    (idOrNombre: string) => {
      const tipo = getTipo(idOrNombre);
      return tipo?.icono || "🚛";
    },
    [getTipo],
  );

  return {
    tiposUnidad,
    tiposActivos,
    loading,
    refreshTipos: fetchTipos,
    saveTiposUnidad,
    getTipo,
    getTipoLabel,
    getTipoIcono,
  };
}
