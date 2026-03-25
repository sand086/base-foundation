import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base: Altura estándar y ancho total
          "flex h-10 w-full px-3 py-2 text-base md:text-sm",
          // Estética Tahoe: Radios orgánicos y fondo limpio
          "rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200",
          // Tipografía: Apple Crisp
          "placeholder:text-slate-400 text-slate-700 font-medium",
          // Focus: Anillo con el Rojo Kemper y sutil brillo
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/5 focus-visible:border-primary",
          // Estados deshabilitados y archivos
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-brand-navy",
          // Combinación con clases externas (sin desmadrar lo existente)
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
