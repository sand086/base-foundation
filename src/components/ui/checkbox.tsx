"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox Industrial Premium - macOS Tahoe Edition
 * * Refactorización:
 * 1. Estética: Glassmorphism con bordes de alta definición (white/20).
 * 2. Estado Checked: Graduación dinámica con el brand-red y sombra interna.
 * 3. Animación: Entrada de indicador con zoom-in y fade-in suave.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Estructura Base: Ligeramente más grande (h-5) para ergonomía industrial
      "peer h-5 w-5 shrink-0 rounded-[6px] border border-white/20",
      // Estilo Tahoe: Glassmorphism y sombras de profundidad
      "glass-card ring-offset-background transition-all duration-200",
      // Estado Hover: Brillo perimetral sutil
      "hover:border-brand-red/40 hover:shadow-[0_0_10px_rgba(190,8,17,0.1)]",
      // Estado Checked: Aplicación de gradiente primario y eliminación de borde claro
      "data-[state=checked]:bg-brand-red data-[state=checked]:text-white data-[state=checked]:border-brand-red data-[state=checked]:shadow-inner",
      // Focus & Disabled
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-30 disabled:grayscale",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        "flex items-center justify-center text-current",
        // Animación de entrada premium
        "animate-in fade-in zoom-in-75 duration-200 ease-out",
      )}
    >
      <Check className="h-3.5 w-3.5 stroke-[4px]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
