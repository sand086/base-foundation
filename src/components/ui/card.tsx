// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Kemper UI: Card Component
 * Estética: macOS Tahoe / Flat Industrial Edition
 */

const cardVariants = cva(
  // Base: Transiciones suaves, overflow hidden para mantener los bordes limpios
  "relative overflow-hidden transition-all duration-300 ease-out outline-none text-foreground",
  {
    variants: {
      variant: {
        // 🚀 ESTÁNDAR (Mejorado): Blanco puro en modo claro para contrastar con el bg-slate-50 del layout.
        // Sombras más definidas para "separarlo" del fondo.
        default: [
          "bg-white dark:bg-[#151c2c]", // Contraste real contra el fondo del layout
          "border border-slate-200 dark:border-white/10",
          "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]",
          "hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.4)]",
        ],

        // 🚀 GLASS: Ultra-translúcido para flotar sobre elementos gráficos (mapas, gráficas)
        glass: [
          "bg-white/60 dark:bg-[#0a0f1a]/60 backdrop-blur-2xl",
          "border border-white/60 dark:border-white/10",
          "shadow-xl",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 dark:before:from-white/5 before:to-transparent before:pointer-events-none z-0",
        ],

        // 🚀 NAVY: Tarjeta de impacto (Métricas principales)
        navy: [
          "bg-brand-navy dark:bg-black",
          "border border-brand-navy/20 dark:border-white/10",
          "shadow-2xl text-white",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none z-0",
        ],

        // 🚀 INTERACTIVE: Para Bento grids. Blanco puro que reacciona al mouse.
        interactive: [
          "bg-white dark:bg-[#151c2c] cursor-pointer",
          "border border-slate-200 dark:border-white/10",
          "shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20",
          "active:scale-[0.98] haptic-press", // Haptic press
          "focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red",
        ],

        // 🚀 FLAT: Para elementos internos o agrupadores dentro de otras tarjetas
        flat: [
          "bg-slate-50/80 dark:bg-white/5",
          "border border-slate-200 dark:border-white/5",
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
    // Aseguramos el z-index relativo
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
      "text-lg font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp",
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
      // 🚀 FIX: Footer distinguible. Gris súper claro en light mode, negro con opacidad en dark.
      "flex items-center p-6 pt-4 border-t border-slate-100 dark:border-white/5 relative z-10 bg-slate-50/50 dark:bg-black/20",
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
