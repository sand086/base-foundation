import { useState, useEffect, useCallback } from 'react';
import { defaultTiposUnidad, type TipoUnidad } from '@/data/tiposUnidadData';

// Hook para acceder a los tipos de unidad configurados dinámicamente
export function useTiposUnidad() {
  const [tiposUnidad, setTiposUnidad] = useState<TipoUnidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // En el futuro esto vendría de la base de datos
    // Por ahora usamos localStorage para persistencia
    const stored = localStorage.getItem('tiposUnidad');
    if (stored) {
      try {
        setTiposUnidad(JSON.parse(stored));
      } catch {
        setTiposUnidad(defaultTiposUnidad);
      }
    } else {
      setTiposUnidad(defaultTiposUnidad);
    }
    setLoading(false);
  }, []);

  const saveTiposUnidad = useCallback((tipos: TipoUnidad[]) => {
    setTiposUnidad(tipos);
    localStorage.setItem('tiposUnidad', JSON.stringify(tipos));
  }, []);

  // Solo tipos activos para usar en selects
  const tiposActivos = tiposUnidad.filter(t => t.activo);

  // Función para obtener un tipo por ID o nombre
  const getTipo = useCallback((idOrNombre: string) => {
    return tiposUnidad.find(
      t => t.id === idOrNombre || t.nombre.toLowerCase() === idOrNombre.toLowerCase()
    );
  }, [tiposUnidad]);

  // Función para obtener el label con icono
  const getTipoLabel = useCallback((idOrNombre: string) => {
    const tipo = getTipo(idOrNombre);
    if (tipo) {
      return `${tipo.icono} ${tipo.nombre}`;
    }
    // Fallback para valores legacy
    const capitalizado = idOrNombre.charAt(0).toUpperCase() + idOrNombre.slice(1);
    return capitalizado;
  }, [getTipo]);

  // Función para obtener solo el icono
  const getTipoIcono = useCallback((idOrNombre: string) => {
    const tipo = getTipo(idOrNombre);
    return tipo?.icono || '🚛';
  }, [getTipo]);

  return {
    tiposUnidad,
    tiposActivos,
    loading,
    saveTiposUnidad,
    getTipo,
    getTipoLabel,
    getTipoIcono,
  };
}
