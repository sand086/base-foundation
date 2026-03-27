"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-semibold leading-none transition-colors duration-200",
  {
    variants: {
      variant: {
        // Estándar: Gris oscuro elegante
        default: "text-slate-700 tracking-tight",
        // Brand: Vibe Tahoe Industrial (la que usamos en los modales)
        brand:
          "text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]",
        // Muted: Para descripciones secundarias
        muted: "text-slate-500 font-medium",
      },
      state: {
        disabled:
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-disabled:text-slate-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// 1. Agregamos 'required' a la interfaz de Props
interface LabelProps
  extends
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      labelVariants({ variant }),
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 flex items-center",
      className,
    )}
    {...props}
  >
    {/* Renderizamos los hijos (el texto del label) */}
    {children}

    {/* 2. La Magia del Asterisco Tahoe */}
    {required && (
      <span
        className="text-brand-red ml-1.5 text-[14px] leading-none select-none animate-pulse-slow font-bold"
        title="Este campo es obligatorio"
      >
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
