// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Kemper UI: Card Component
 * Estética: macOS Tahoe / Industrial Premium Design System
 */

const cardVariants = cva(
  // Base: Transiciones suaves de 300ms, overflow hidden para el glassmorphism
  "relative overflow-hidden transition-all duration-300 ease-out outline-none text-foreground",
  {
    variants: {
      variant: {
        // Estándar: Limpio, glassmorphism con elevación suave y soporte total a Dark Mode
        default: [
          "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",
          "border border-slate-200/80 dark:border-white/10",
          "shadow-sm hover:shadow-md hover:-translate-y-0.5",
        ],
        // Glass: Estilo panel ultra-translúcido (Ideal para flotar sobre fondos Mesh/Auroras)
        glass: [
          "bg-white/40 dark:bg-black/40 backdrop-blur-xl",
          "border border-white/40 dark:border-white/10",
          "shadow-xl",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 dark:before:from-white/5 before:to-transparent before:pointer-events-none z-0",
        ],
        // Navy: Tarjetas oscuras premium (Ignora el modo claro, siempre es oscura)
        navy: [
          "bg-brand-navy/95 backdrop-blur-xl",
          "border border-white/10",
          "shadow-2xl text-white",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none z-0",
        ],
        // Interactive: Para tarjetas clickeables (Bento grids, selecciones) con Haptic Press
        interactive: [
          "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl cursor-pointer",
          "border border-slate-200/80 dark:border-white/10",
          "shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/95 dark:hover:bg-white/5",
          "active:scale-[0.98]", // Haptic press
          "focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red",
        ],
        // Flat: Elementos de fondo sin elevación
        flat: [
          "bg-slate-50/80 dark:bg-white/5",
          "border border-slate-200/80 dark:border-white/5",
          "shadow-none",
        ],
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      radius: {
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        "3xl": "rounded-3xl",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "none",
      radius: "2xl",
    },
  },
);

export interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, radius, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, radius }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // Aseguramos el z-index relativo por si la Card tiene el brillo pseudo-elemento before
    className={cn("flex flex-col space-y-1.5 p-6 relative z-10", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      // Tahoe Crisp Typography: font-black, uppercase, tracking ajustado
      "text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white heading-crisp",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      // Industrial Typography Rule: 10px, black, uppercase, 0.2em tracking
      "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1",
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0 relative z-10", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-4 border-t border-slate-200/80 dark:border-white/10 relative z-10 bg-slate-50/50 dark:bg-black/20",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
