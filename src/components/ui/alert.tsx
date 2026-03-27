import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Alert variants - macOS Tahoe / Industrial Edition
 * Implementa glassmorphism con bordes de luz y gradientes de estado.
 */
const alertVariants = cva(
  // Base: Glassmorphism con bordes HD y tipografía optimizada para lectura rápida
  "relative w-full rounded-xl border p-4 backdrop-blur-md transition-all duration-300 [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-1px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5 animate-in fade-in slide-in-from-top-2",
  {
    variants: {
      variant: {
        // Estilo neutral: Navy profundo con transparencia
        default:
          "glass-panel border-white/10 text-brand-navy shadow-lg [&>svg]:text-brand-navy/70",

        // Estilo Crítico: Brand Red con glow sutil
        destructive:
          "bg-status-danger-bg/40 border-status-danger/30 text-status-danger shadow-[0_4px_20px_rgba(190,8,17,0.1)] [&>svg]:text-status-danger",

        // Estilo Éxito: Brand Green industrial
        success:
          "bg-status-success-bg/40 border-status-success/30 text-status-success shadow-[0_4px_20px_rgba(0,151,64,0.1)] [&>svg]:text-status-success",

        // Estilo Advertencia: Amber/Oro
        warning:
          "bg-status-warning-bg/40 border-status-warning/30 text-status-warning shadow-[0_4px_20px_rgba(147,88,10,0.1)] [&>svg]:text-status-warning",

        // Estilo Información: Sky/Navy
        info: "bg-status-info-bg/40 border-status-info/30 text-status-info shadow-[0_4px_20px_rgba(37,99,235,0.1)] [&>svg]:text-status-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      // Tipografía Industrial: Negrita, tracking ajustado y uppercase sutil opcional
      "mb-1 font-black leading-none tracking-tighter text-[13px] uppercase",
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Descripción: Alta legibilidad con opacidad táctica
      "text-[11px] font-medium opacity-90 [&_p]:leading-relaxed tracking-tight",
      className,
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
