"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base: Tamaño y forma de píldora
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300",
      // Colores: Rojo Kemper al activar, gris suave al desactivar
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200",
      // Focus: Halo de luz característico de tu sistema
      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
      // Estados
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // El "botoncito" interno
        "pointer-events-none block h-5 w-5 rounded-full bg-white transition-transform duration-300",
        // Sombra profunda para que se vea "encima" del riel (macOS Style)
        "shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
        // Movimiento
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        // Micro-interacción: se siente elástico
        "active:scale-90",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
