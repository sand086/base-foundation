"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Switch - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Riel de Cristal: backdrop-blur-xl con bordes HD.
 * 2. Identidad: Estado activo en Brand Red con glow interno.
 * 3. Haptic: Thumb elástico y respuesta de escala al presionar.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // BASE: Forma de píldora y cursor
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 outline-none haptic-press",

      // REGLA 1 & 2: Glassmorphism y Bordes HD (Reactividad Total)
      "bg-slate-200 dark:bg-white/10 backdrop-blur-md",
      "border border-slate-300/50 dark:border-white/10 shadow-inner",

      // ESTADO ACTIVADO: Brand Red con profundidad
      "data-[state=checked]:bg-brand-red data-[state=checked]:border-brand-red",
      "data-[state=checked]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_12px_rgba(190,8,17,0.4)]",

      // FOCUS & DISABLED
      "focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale",

      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // EL INTERRUPTOR (THUMB): Estilo Apple Premium
        "pointer-events-none block h-5 w-5 rounded-full bg-white transition-all duration-300 ease-in-out",

        // SOMBRAS DE PROFUNDIDAD (Físico)
        "shadow-[0_2px_5px_rgba(0,0,0,0.3),0_0_1px_rgba(0,0,0,0.1)]",

        // POSICIONAMIENTO
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",

        // DETALLE DE DEFINICIÓN (Un borde microscópico interno)
        "border border-slate-100 dark:border-white/20",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
