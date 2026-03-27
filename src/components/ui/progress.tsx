"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/**
 * Progress UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Carril con Glassmorphism y sombra interior (depth).
 * 2. Indicador: Brand Red con glow dinámico para alta visibilidad.
 * 3. Theme Awareness: Fondos reactivos al Dark Mode.
 * 4. Animación: Transición fluida estilo 'líquido'.
 */

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
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
        // 🔴 INDICADOR: Brand Red con gradiente sutil y glow
        "bg-brand-red shadow-[0_0_10px_rgba(190,8,17,0.5)]",
        "relative after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] after:animate-shimmer",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
