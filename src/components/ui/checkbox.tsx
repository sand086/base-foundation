"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox Industrial Premium - macOS Tahoe Edition
 * * Refactorización Rápidos 3T:
 * 1. Reactividad Total: Soporte nativo dark: y light:
 * 2. Estética: Glassmorphism Líquido (backdrop-blur-xl)
 * 3. Haptic: Transición de 300ms y escalado sutil.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Estructura y Ergonomía (5 unidades para maquinaria pesada)
      "peer h-5 w-5 shrink-0 rounded-[6px] transition-all duration-300 ease-out outline-none",

      // BORDES HD Y GLASSMORPHISM (REGLA DE ORO)
      "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",
      "border border-slate-200/80 dark:border-white/10 shadow-sm",

      // HOVER & HAPTIC
      "hover:scale-[1.05] hover:border-brand-red/50 dark:hover:border-brand-red/40",
      "hover:shadow-[0_0_15px_rgba(190,8,17,0.1)]",

      // ESTADO CHECKED (IDENTIDAD DE MARCA)
      "data-[state=checked]:bg-brand-red data-[state=checked]:border-brand-red data-[state=checked]:text-white",
      "data-[state=checked]:shadow-[0_0_12px_rgba(190,8,17,0.3)]",

      // FOCUS & DISABLED
      "focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        "flex items-center justify-center text-current",
        // Animación de entrada Tahoe
        "animate-in fade-in zoom-in-75 duration-300 ease-out",
      )}
    >
      {/* Icono con stroke grueso para sensación industrial */}
      <Check className="h-3.5 w-3.5 stroke-[4px]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
