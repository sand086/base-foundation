import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    // 1. Identificamos si es un campo protegido que NO debe ir en mayúsculas
    const excludedTypes = ["password", "email", "url", "number"];
    const isExcludedType = excludedTypes.includes(type || "text");

    // 2. Nuestro "middleware" interno que intercepta la escritura
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isExcludedType) {
        // Convertimos el valor en tiempo real para que react-hook-form lo reciba en mayúscula
        e.target.value = e.target.value.toUpperCase();
      }

      // Ejecutamos el evento original
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          // BASE: Altura base estándar (h-10) que puede ser sobreescrita a h-11 desde el Form
          "flex h-10 w-full px-3 py-2 text-sm",

          // AÑADIDO: Fuerza visualmente las mayúsculas al instante (sólo en inputs permitidos)
          !isExcludedType && "uppercase",

          // REGLA 1: Glassmorphism Líquido y Reactividad Total (Dark Mode)
          "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",

          // REGLA 2: Bordes de Alta Definición (HD) y radios orgánicos
          "border border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm",

          // REGLA 3: Tipografía Industrial para la captura de datos (tracking ajustado)
          "font-medium tracking-tight text-slate-900 dark:text-white",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500",

          // REGLA 4 & 5: Haptic Feedback y foco con Identidad de Marca (Brand Red)
          "transition-all duration-300 ease-out",
          "hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-red))]/50 focus-visible:border-[hsl(var(--brand-red))]",

          // ESTADOS DESHABILITADOS: Atenuación táctica en ambos modos
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50 dark:disabled:bg-white/5 disabled:grayscale",

          // ARCHIVOS: Si es type="file", el botón interno recibe la tipografía industrial pesada
          "file:border-0 file:bg-transparent file:text-[10px] file:font-black file:uppercase file:tracking-[0.2em] file:text-brand-navy dark:file:text-slate-300 file:cursor-pointer",

          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
