"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  indicatorClassName?: string;
}

/**
 * Progress UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Carril con Glassmorphism y sombra interior (depth).
 * 2. Indicador: Acepta color dinámico (indicatorClassName) o Brand Red por defecto.
 * 3. Theme Awareness: Fondos reactivos al Dark Mode.
 * 4. Animación: Transición fluida estilo 'líquido'.
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2.5 w-full overflow-hidden rounded-full transition-all duration-500",
      // 🌓 CARRIL (Track): Glassmorphism HD
      "bg-slate-200/50 dark:bg-black/40 backdrop-blur-sm",
      "border border-slate-300/20 dark:border-white/5 shadow-inner",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]",
        "relative after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] after:animate-shimmer",
        // 🔴 INDICADOR: Color dinámico (si se pasa) o Brand Red con glow por defecto
        indicatorClassName ||
          "bg-brand-red shadow-[0_0_10px_rgba(190,8,17,0.5)]",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
