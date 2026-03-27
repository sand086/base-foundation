import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge Component - Rápidos 3T Edition
 * Estética: macOS Tahoe / Industrial Premium
 * * Cambios realizados:
 * 1. Tipografía Industrial: text-[9px] font-black uppercase tracking-[0.2em]
 * 2. Glassmorphism: backdrop-blur-md en variantes "soft"
 * 3. Haptic: hover:scale-[1.05] y transiciones de 300ms
 * 4. Bordes HD: border-slate-200/80 (light) dark:border-white/10 (dark)
 */

const badgeVariants = cva(
  // Base: Tipografía micro-industrial y alineación perfecta
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        // Marca Solid: El rojo corporativo con elevación
        default:
          "border-transparent bg-brand-red text-white shadow-lg shadow-brand-red/20 hover:bg-brand-red/90 hover:scale-[1.05]",

        // Navy Industrial: El azul profundo del modo oscuro
        secondary:
          "border-transparent bg-brand-navy text-white dark:bg-slate-800 hover:bg-brand-navy/80 hover:scale-[1.05]",

        // HD Outline: Borde de alta definición
        outline:
          "text-foreground border-slate-200/80 dark:border-white/20 bg-transparent backdrop-blur-sm",

        success:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-400/20 backdrop-blur-md",

        warning:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-400/20 backdrop-blur-md",

        destructive:
          "bg-brand-red/10 text-brand-red border-brand-red/20 backdrop-blur-md",

        info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-400/20 backdrop-blur-md",

        neutral:
          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 dark:border-white/10 backdrop-blur-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
