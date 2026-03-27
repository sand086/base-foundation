"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  // BASE: Transiciones suaves de 300ms para cambios de estado y foco
  "text-sm font-semibold leading-none transition-colors duration-300 ease-out",
  {
    variants: {
      variant: {
        // ESTÁNDAR: Textos nítidos con soporte dark mode
        default: "text-slate-700 dark:text-slate-200 tracking-tight",

        // REGLA DE ORO (BRAND): Tipografía Industrial de macOS Tahoe
        brand:
          "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400",

        // MUTED: Para descripciones o labels secundarios
        muted: "text-slate-500 dark:text-slate-400 font-medium tracking-tight",
      },
      state: {
        disabled:
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-40 peer-disabled:grayscale",
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
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-40 flex items-center",
      className,
    )}
    {...props}
  >
    {/* Renderizamos los hijos (el texto del label) */}
    {children}

    {/* 2. La Magia del Asterisco Tahoe (IDENTIDAD DE MARCA) */}
    {required && (
      <span
        className="text-brand-red dark:text-brand-red ml-1.5 text-[14px] leading-none select-none animate-pulse-slow font-black"
        title="Este campo es obligatorio"
      >
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
