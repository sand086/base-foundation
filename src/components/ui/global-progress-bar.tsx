// eslint-disable-next-line react-refresh/only-export-components
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import truckLoading from "@/assets/img/loading_3T.gif";

/**
 * Configuración de Comportamiento Premium
 */
export interface ProgressOptions {
  variant?: "line" | "truck" | "both";
  className?: string;
}

export interface ManualProgressBarProps {
  isLoading: boolean;
  className?: string;
}

/**
 * GlobalProgressBar - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Theme Awareness: Fondos y textos reactivos (Light/Dark).
 * 2. Glassmorphism HD: Panel central con desenfoque masivo y bordes nítidos.
 * 3. Tipografía: Tracking industrial (0.3em) y font-black.
 * 4. Efectos: Glow dinámico bajo el camión adaptado al tema.
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

      const duration = variant === "line" ? 400 : 1200;
      const timeout = setTimeout(() => setIsVisible(false), duration);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, variant]);

  if (!isVisible) return null;

  return (
    <>
      {/* Variante 1: Barra Safari Estándar (Top Line) */}
      {(variant === "line" || variant === "both") && (
        <div className={cn("progress-bar-container z-[100]", className)}>
          <div className="progress-bar-indeterminate bg-brand-red shadow-[0_0_10px_rgba(190,8,17,0.5)]" />
        </div>
      )}

      {/* Variante 2: Industrial Truck Animation (Overlay de Cristal) */}
      {(variant === "truck" || variant === "both") && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none animate-in fade-in duration-500 bg-black/5 dark:bg-black/20 backdrop-blur-[2px]">
          <div
            className={cn(
              "glass-panel p-8 rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.2)] flex flex-col items-center gap-5 transition-colors duration-500",
              "bg-white/80 dark:bg-brand-navy/90 backdrop-blur-2xl border border-white/40 dark:border-white/10",
            )}
          >
            <div className="relative">
              <img
                src={truckLoading}
                alt="Cargando Flota..."
                className="h-24 w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:brightness-90"
              />
              {/* Glow dinámico de marca bajo el camión */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-3 bg-brand-red/30 dark:bg-brand-red/20 blur-2xl rounded-full animate-pulse" />
            </div>

            <div className="flex flex-col items-center gap-1 mt-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/40 animate-pulse">
                Sincronizando datos ...
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-brand-red/60 dark:text-brand-red/40">
                Espere por favor
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * ManualProgressBar - Edición Refactorizada para Cargas de Datos
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
      {/* Barra de línea (Safari Style) */}
      {(variant === "line" || variant === "both") && (
        <div className={cn("progress-bar-container z-[100]", className)}>
          <div className="progress-bar-indeterminate bg-brand-red" />
        </div>
      )}

      {/* Loader de Camión Centrado (Para peticiones pesadas) */}
      {(variant === "truck" || variant === "both") && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/20 dark:bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
          <div
            className={cn(
              "glass-panel p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6",
              "bg-white/90 dark:bg-brand-navy/95 border border-slate-200 dark:border-white/10",
            )}
          >
            <div className="relative">
              <img
                src={truckLoading}
                alt="Procesando..."
                className={cn(
                  "h-28 w-auto transition-all",
                  "dark:brightness-95 contrast-110",
                )}
              />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-4 bg-brand-red/20 dark:bg-brand-red/10 blur-3xl rounded-full" />
            </div>

            <div className="flex flex-col items-center space-y-3">
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-red">
                Carga de Datos
              </span>
              {/* Barra de progreso técnica */}
              <div className="h-1 w-20 bg-slate-200 dark:bg-white/5 overflow-hidden rounded-full border border-slate-300/20 dark:border-white/5">
                <div className="h-full bg-brand-red animate-progress-indeterminate w-full shadow-[0_0_8px_rgba(190,8,17,0.4)]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
