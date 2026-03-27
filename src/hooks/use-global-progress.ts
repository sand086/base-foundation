// src/hooks/use-global-progress.ts
import { useState } from "react";

/**
 * Hook para control manual de estados de carga
 * Cumple con la regla react-refresh/only-export-components al estar en su propio archivo.
 */
export function useGlobalProgress() {
  const [isLoading, setIsLoading] = useState(false);
  const startProgress = () => setIsLoading(true);
  const stopProgress = () => setIsLoading(false);

  return { isLoading, startProgress, stopProgress };
}
