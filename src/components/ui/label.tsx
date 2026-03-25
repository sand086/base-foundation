"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  // Base: Tipografía nítida y alineación perfecta
  "text-sm font-semibold leading-none transition-colors duration-200",
  {
    variants: {
      variant: {
        // Estándar: Gris oscuro elegante (Tahoe Style)
        default: "text-slate-700 tracking-tight",
        // Brand: Con un toque del Rojo Kemper
        brand:
          "text-brand-navy font-black uppercase text-[11px] tracking-widest",
        // Muted: Para descripciones secundarias
        muted: "text-slate-500 font-medium",
      },
      // Estado deshabilitado heredado de Radix
      state: {
        disabled:
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-disabled:text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      labelVariants({ variant }),
      // Añadimos la lógica de peer-disabled por fuera del CVA para asegurar compatibilidad
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
