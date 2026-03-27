// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Kemper UI: Card Component
 * Estética: macOS Tahoe / Industrial Premium Design System
 */

const cardVariants = cva(
  "relative overflow-hidden transition-all duration-300 ease-out outline-none",
  {
    variants: {
      variant: {
        // Estándar: Limpio, blanco con blur sutil y elevación suave
        default: [
          "bg-white/90 backdrop-blur-xl",
          "border border-slate-200/60 dark:border-white/10",
          "shadow-sm hover:shadow-md hover:-translate-y-0.5",
        ],
        // Glass: Estilo panel translúcido (Ideal para fondos Mesh)
        glass: [
          "bg-white/40 backdrop-blur-md dark:bg-slate-950/40",
          "border border-white/40 dark:border-white/10",
          "shadow-xl",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none z-0",
        ],
        // Navy: Tarjetas oscuras premium (Como los headers de nuestros modales)
        navy: [
          "bg-brand-navy/95 backdrop-blur-md",
          "border border-white/10",
          "shadow-2xl text-white",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none z-0",
        ],
        // Interactive: Para tarjetas clickeables (Haptic Press)
        interactive: [
          "bg-white shadow-sm border border-slate-200 cursor-pointer",
          "active:scale-[0.98] transition-transform duration-200", // Haptic press
          "hover:border-brand-navy/30 hover:shadow-md hover:-translate-y-1",
          "focus-visible:ring-4 focus-visible:ring-brand-red/10 focus-visible:border-brand-red",
        ],
        // Flat: Elementos de fondo sin elevación
        flat: "bg-slate-50/80 border border-slate-100 shadow-none",
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
    // Aseguramos el z-index relativo por si la Card tiene el brillo de fondo
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
      // Tahoe Crisp Typography: Font black, uppercase, tracking ajustado
      "text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white heading-crisp",
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
      // Tahoe Muted Typography: Pequeño, negrita, espaciado ancho
      "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1",
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
      "flex items-center p-6 pt-4 border-t border-slate-200/50 dark:border-white/10 mt-2 relative z-10 bg-slate-50/30",
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
