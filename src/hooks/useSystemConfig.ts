import { useState, useEffect } from "react";
import { configService } from "@/services/configService";
import { SystemConfig } from "@/types/api.types";

// 🚀 Nuestro "Salvavidas": Si la base de datos se borra, el sistema sigue funcionando
export const DEFAULT_CONFIGS = {
  empresa_nombre: "Transportes TMS",
  iva_porcentaje: "16",
  retencion_porcentaje: "4",
  dias_credito_default: "15",
  rendimiento_diesel_esperado: "3.2",
  tolerancia_diesel_pct: "0.05",
} as const;

export type ConfigKey = keyof typeof DEFAULT_CONFIGS | string;

// 🧠 CACHÉ GLOBAL: Evita saturar el servidor con múltiples peticiones
let globalCache: SystemConfig[] | null = null;
let fetchPromise: Promise<SystemConfig[]> | null = null;

export function useSystemConfig(key: ConfigKey) {
  // Iniciamos el estado con el valor por defecto como protección
  const [configValue, setConfigValue] = useState<string>(
    DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS] || "",
  );
  const [isLoading, setIsLoading] = useState(!globalCache);

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      // 1. Si ya tenemos la caché, la usamos de inmediato
      if (globalCache) {
        const found = globalCache.find((c) => c.key === key);
        if (found && isMounted) {
          setConfigValue(found.value);
          setIsLoading(false);
        }
        return;
      }

      // 2. Si no hay caché, iniciamos UNA SOLA petición al servidor
      if (!fetchPromise) {
        fetchPromise = configService.getAll();
      }

      try {
        const data = await fetchPromise;
        globalCache = data; // Guardamos en memoria global

        const found = data.find((c) => c.key === key);
        if (found && isMounted) {
          setConfigValue(found.value);
        }
      } catch (error) {
        console.error("Error al obtener configuraciones globales", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchConfig();

    return () => {
      isMounted = false;
    };
  }, [key]);

  return {
    value: configValue,
    // 🚀 Helper matemático (convierte "16" a 16 automáticamente)
    valueAsNumber: Number(configValue) || 0,
    isLoading,
  };
}
