"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/**
 * Slider UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Carril (Track): Efecto de "ranura" con Glassmorphism y sombra interior.
 * 2. Rango (Range): Brand Red vibrante para indicar el nivel activo.
 * 3. Pomo (Thumb): Botón físico con elevación (shadow-md) y haptic feedback.
 * 4. Reactividad: Soporte dinámico para Light/Dark Mode.
 */

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    {/* EL CARRIL: Una cavidad de cristal grabada en el panel */}
    <SliderPrimitive.Track
      className={cn(
        "relative h-1.5 w-full grow overflow-hidden rounded-full transition-all",
        "bg-slate-200/50 dark:bg-black/40 backdrop-blur-sm shadow-inner",
        "border border-slate-300/10 dark:border-white/5",
      )}
    >
      {/* EL RANGO: El flujo de energía/dato en Brand Red */}
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full bg-brand-red shadow-[0_0_10px_rgba(190,8,17,0.4)]",
          "after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] after:animate-shimmer",
        )}
      />
    </SliderPrimitive.Track>

    {/* EL POMO: Control físico de precisión */}
    <SliderPrimitive.Thumb
      className={cn(
        "block h-5 w-5 rounded-full border-2 transition-all outline-none",
        // 🌓 COLORES & ELEVACIÓN
        "bg-white dark:bg-slate-100 border-white dark:border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
        // ⚡ INTERACCIÓN HÁPTICA
        "hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing",
        "hover:border-brand-red dark:hover:border-brand-red",
        // Foco de seguridad
        "focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    />
  </SliderPrimitive.Root>
));

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
