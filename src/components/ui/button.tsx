// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Definimos las variantes con toda la jerarquía que pediste
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96] haptic-press",
  {
    variants: {
      variant: {
        // 🔴 PRIMARY - Rojo Kemper Premium
        default: "btn-primary-gradient text-white shadow-md border-none",

        // 🔵 SECONDARY - Navy / Azul Obscuro Premium
        secondary: "btn-secondary-gradient text-white shadow-md border-none",

        // ⚪ TERTIARY - Gris/Plata sutil (macOS style)
        tertiary:
          "btn-tertiary-gradient text-slate-700 border border-slate-200 shadow-sm",

        // 🟢 SUCCESS - Verde para acciones positivas
        success: "btn-success-gradient text-white shadow-md border-none",

        // 🟠 WARNING - Ámbar para alertas o pausas
        warning: "btn-warning-gradient text-black shadow-md border-none",

        // 🔵 INFO - Azul para detalles o información
        info: "btn-info-gradient text-white shadow-md border-none",

        // 🔴 DANGER - Rojo brillante para errores o eliminar
        destructive: "btn-danger-gradient text-white shadow-md border-none",

        // ✨ ACTION - Alias de Success para mantener compatibilidad
        action: "btn-success-gradient text-white shadow-md border-none",

        // 🌑 DARK - Negro profundo premium
        dark: "bg-brand-dark text-white hover:bg-black shadow-lg border-none",

        // ⚪ WHITE - Blanco puro con sombra
        white:
          "bg-white text-slate-900 hover:bg-slate-50 shadow-md border border-slate-100",

        // Estilos planos (No gradientes)
        outline:
          "border border-input bg-background hover:bg-slate-50 hover:text-accent-foreground hover:border-slate-300 shadow-sm",
        ghost: "hover:bg-slate-100 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-10 text-base uppercase tracking-wider",
        xl: "h-14 rounded-2xl px-12 text-lg font-black uppercase tracking-[0.1em]",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

// Exportamos ambos. El comentario de la línea 1 evita el error de Fast Refresh.
export { Button, buttonVariants };
