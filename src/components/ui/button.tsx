// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Haptic Press: active:scale-[0.96] para sensación táctil.
 * 2. Dark Mode: Clases dinámicas para bordes y fondos.
 * 3. Tipografía: Tracking expansivo en tamaños LG y XL.
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96] haptic-press outline-none",
  {
    variants: {
      variant: {
        // 🔴 PRIMARY - Rojo Kemper / Brand Red
        default:
          "btn-primary-gradient text-white shadow-[0_4px_15px_rgba(190,8,17,0.4)] dark:shadow-[0_4px_20px_rgba(190,8,17,0.2)] border-none hover:brightness-110",

        // 🔵 SECONDARY - Navy Tahoe
        secondary:
          "btn-secondary-gradient text-white shadow-lg border-none hover:brightness-125 dark:bg-brand-navy dark:border dark:border-white/10",

        // ⚪ TERTIARY - Estilo Cristalería macOS
        tertiary:
          "bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10 backdrop-blur-sm hover:bg-white dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white",

        // 🟢 SUCCESS - Verde Industrial
        success:
          "btn-success-gradient text-white shadow-[0_4px_15px_rgba(0,151,64,0.3)] border-none hover:brightness-110",

        // 🟠 WARNING - Ámbar de Alerta
        warning:
          "btn-warning-gradient text-black font-black shadow-md border-none hover:brightness-110",

        // 🔵 INFO - Azul de Datos
        info: "btn-info-gradient text-white shadow-md border-none hover:brightness-110",

        // 🔴 DANGER - Rojo Crítico
        destructive:
          "btn-danger-gradient text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)] border-none hover:brightness-110",

        // ✨ ACTION - Alias de Success
        action:
          "btn-success-gradient text-white shadow-md border-none hover:brightness-110",

        // 🌑 DARK - Negro Carbón Premium
        dark: "bg-slate-900 dark:bg-black text-white hover:bg-black dark:hover:bg-slate-900 shadow-xl border border-white/5",

        // ⚪ WHITE - Blanco Puro
        white:
          "bg-white dark:bg-slate-100 text-slate-900 hover:bg-slate-50 shadow-md border border-slate-200 dark:border-transparent",

        // Estilos Planos de Alta Definición
        outline:
          "border border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white",

        ghost:
          "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white",

        link: "text-brand-red underline-offset-4 hover:underline font-bold",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-[13px] font-black uppercase tracking-[0.15em]",
        xl: "h-14 rounded-2xl px-10 text-[15px] font-black uppercase tracking-[0.2em]",
        icon: "h-10 w-10 rounded-xl",
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

export { Button, buttonVariants };
