import * as React from "react";
import { cn } from "@/lib/utils";
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // BASE: Estructura técnica y área de interacción táctil
          "flex min-h-[100px] w-full px-4 py-3 text-sm",

          // REGLA 1: Glassmorphism Líquido y Reactividad Total (Dark Mode)
          "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",

          // REGLA 2: Bordes de Alta Definición (HD) y Radios macOS Tahoe
          "border border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm",

          // REGLA 3: Tipografía Industrial para datos (tracking-tight y font-medium)
          "font-medium tracking-tight text-slate-900 dark:text-slate-100 leading-relaxed",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500",

          // REGLA 4 & 5: Haptic Feedback y Foco con Identidad de Marca (Brand Red)
          "transition-all duration-300 ease-out outline-none",
          "hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:border-brand-red",

          // ESTADOS DESHABILITADOS: Look industrial inactivo / Grayscale
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50 dark:disabled:bg-white/5 disabled:grayscale",

          // SCROLLBAR PERSONALIZADA: Acorde al sistema
          "custom-scrollbar resize-none",

          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
