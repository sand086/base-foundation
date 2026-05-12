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
        // --- VARIANTES SÓLIDAS ---
        default:
          "border-transparent bg-brand-red text-white shadow-lg shadow-brand-red/20 hover:bg-brand-red/90 hover:text-white hover:scale-[1.05]",
        secondary:
          "border-transparent bg-brand-navy text-white dark:bg-slate-800 hover:bg-brand-navy/80 hover:scale-[1.05]",

        // --- VARIANTES SOFT (Fondo suave + borde tenue) ---
        success:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-400/20 backdrop-blur-md",
        warning:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-400/20 backdrop-blur-md",
        destructive:
          "bg-brand-red/10 text-brand-red border-brand-red/20 backdrop-blur-md",
        info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-400/20 backdrop-blur-md",
        neutral:
          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 dark:border-white/10 backdrop-blur-md",

        // --- VARIANTES OUTLINE HD (Transparente + Borde definido + Hover tint) ---

        // Brand Primary (El que ya arreglamos)
        outline:
          "text-brand-primary border-[hsl(var(--primary))/40] bg-transparent backdrop-blur-md hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/10] dark:border-[hsl(var(--primary))/30]",

        // Brand Action (Verde corporativo)
        "outline-action":
          "text-brand-action border-[hsl(var(--action))/40] bg-transparent backdrop-blur-md hover:border-[hsl(var(--action))] hover:bg-[hsl(var(--action))/10] dark:border-[hsl(var(--action))/30]",

        // Success (Emerald)
        "outline-success":
          "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-transparent backdrop-blur-md hover:border-emerald-500 hover:bg-emerald-500/10",

        // Warning (Amber)
        "outline-warning":
          "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-transparent backdrop-blur-md hover:border-amber-500 hover:bg-amber-500/10",

        // Destructive / Danger (Brand Red)
        "outline-destructive":
          "text-brand-red border-brand-red/40 bg-transparent backdrop-blur-md hover:border-brand-red hover:bg-brand-red/10",

        // Info (Blue)
        "outline-info":
          "text-blue-600 dark:text-blue-400 border-blue-500/40 bg-transparent backdrop-blur-md hover:border-blue-500 hover:bg-blue-500/10",

        // Neutral (Slate / Gris)
        "outline-neutral":
          "text-slate-600 dark:text-slate-400 border-slate-500/40 bg-transparent backdrop-blur-md hover:border-slate-500 hover:bg-slate-500/10 dark:border-slate-400/40 dark:hover:border-slate-400",
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
