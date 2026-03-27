import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
// Importación del activo desde la carpeta de assets
import truckLoading from "@/assets/img/loading_3T.gif";

/**
 * Configuración de Comportamiento Premium
 */
interface ProgressOptions {
  variant?: "line" | "truck" | "both";
  className?: string;
}

/**
 * GlobalProgressBar - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Dual-Mode: Barra de progreso superior (Safari) + Animación de Flota (3T Truck).
 * 2. Glassmorphism: El loader del camión se encapsula en un panel de cristal líquido.
 * 3. Haptic Feel: Transiciones suaves de opacidad y escala.
 */
export function GlobalProgressBar({
  variant = "line",
  className,
}: ProgressOptions) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      setIsVisible(true);
      previousPathRef.current = location.pathname;

      // Duración extendida ligeramente si hay animación para permitir que el camión "corra"
      const duration = variant === "line" ? 400 : 1200;
      const timeout = setTimeout(() => setIsVisible(false), duration);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, variant]);

  if (!isVisible) return null;

  return (
    <>
      {/* Variante 1: Barra Safari Estándar */}
      {(variant === "line" || variant === "both") && (
        <div className={cn("progress-bar-container z-[100]", className)}>
          <div className="progress-bar-indeterminate" />
        </div>
      )}

      {/* Variante 2: Industrial Truck Animation (Overlay de Cristal) */}
      {(variant === "truck" || variant === "both") && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none animate-in fade-in duration-300">
          <div className="glass-panel p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 bg-white/40 backdrop-blur-xl border-white/20">
            <div className="relative">
              <img
                src={truckLoading}
                alt="Cargando Flota..."
                className="h-24 w-auto drop-shadow-2xl"
              />
              {/* Reflejo de luz dinámico bajo el camión */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-2 bg-brand-red/20 blur-xl rounded-full animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-navy/60 animate-pulse">
              Sincronizando Logística...
            </span>
          </div>
        </div>
      )}
    </>
  );
}

// Hook para control manual (Mantiene lógica original)
export function useGlobalProgress() {
  const [isLoading, setIsLoading] = useState(false);
  const startProgress = () => setIsLoading(true);
  const stopProgress = () => setIsLoading(false);
  return { isLoading, startProgress, stopProgress };
}

/**
 * ManualProgressBar - Versión Refactorizada
 */
export function ManualProgressBar({
  isLoading,
  variant = "line",
  className,
}: ManualProgressBarProps & ProgressOptions) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div className="contents">
      {/* Barra de línea (Safari) */}
      {(variant === "line" || variant === "both") && (
        <div className={cn("progress-bar-container z-[100]", className)}>
          <div className="progress-bar-indeterminate" />
        </div>
      )}

      {/* Loader de Camión Centrado */}
      {(variant === "truck" || variant === "both") && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-navy/5 backdrop-blur-[2px] animate-in fade-in duration-500">
          <div className="glass-panel p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 border-white/30">
            <img
              src={truckLoading}
              alt="Procesando..."
              className="h-28 w-auto mix-blend-multiply opacity-90"
            />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-red">
                Carga de Datos
              </span>
              <div className="h-0.5 w-12 bg-brand-red/20 mt-2 overflow-hidden rounded-full">
                <div className="h-full bg-brand-red animate-progress-indeterminate w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ManualProgressBarProps {
  isLoading: boolean;
  className?: string;
}
