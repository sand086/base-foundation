import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Alert variants - macOS Tahoe / Industrial Edition
 * Implementa glassmorphism con bordes HD y gradientes de estado responsivos al tema.
 */
const alertVariants = cva(
  // BASE: Glassmorphism Líquido, Bordes HD, y posicionamiento del SVG
  "relative w-full rounded-xl border p-4 backdrop-blur-xl transition-all duration-300 ease-out [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-1px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5 animate-in fade-in slide-in-from-top-2",
  {
    variants: {
      variant: {
        // DEFAULT: Neutral, blanco/navy
        default: [
          "bg-white/90 dark:bg-brand-navy/95",
          "border-slate-200/80 dark:border-white/10",
          "text-brand-navy dark:text-slate-200",
          "shadow-sm dark:shadow-2xl",
          "[&>svg]:text-slate-500 dark:[&>svg]:text-slate-400",
        ],
        // DESTRUCTIVE (Error/Crítico): Brand Red
        destructive: [
          "bg-status-danger-bg/80 dark:bg-status-danger/10",
          "border-status-danger/30 dark:border-status-danger/20",
          "text-status-danger dark:text-red-400",
          "shadow-[0_4px_20px_rgba(190,8,17,0.1)] dark:shadow-[0_4px_20px_rgba(190,8,17,0.2)]",
          "[&>svg]:text-status-danger dark:[&>svg]:text-red-400",
        ],
        // SUCCESS (Éxito): Brand Green
        success: [
          "bg-status-success-bg/80 dark:bg-status-success/10",
          "border-status-success/30 dark:border-status-success/20",
          "text-status-success dark:text-emerald-400",
          "shadow-[0_4px_20px_rgba(0,151,64,0.1)] dark:shadow-[0_4px_20px_rgba(0,151,64,0.2)]",
          "[&>svg]:text-status-success dark:[&>svg]:text-emerald-400",
        ],
        // WARNING (Advertencia/Pendiente): Amber
        warning: [
          "bg-status-warning-bg/80 dark:bg-status-warning/10",
          "border-status-warning/30 dark:border-status-warning/20",
          "text-status-warning dark:text-amber-500",
          "shadow-[0_4px_20px_rgba(147,88,10,0.1)] dark:shadow-[0_4px_20px_rgba(147,88,10,0.2)]",
          "[&>svg]:text-status-warning dark:[&>svg]:text-amber-500",
        ],
        // INFO (Informativo): Blue
        info: [
          "bg-status-info-bg/80 dark:bg-status-info/10",
          "border-status-info/30 dark:border-status-info/20",
          "text-status-info dark:text-blue-400",
          "shadow-[0_4px_20px_rgba(37,99,235,0.1)] dark:shadow-[0_4px_20px_rgba(37,99,235,0.2)]",
          "[&>svg]:text-status-info dark:[&>svg]:text-blue-400",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      // Tipografía Industrial: Negrita, tracking ancho y uppercase obligatorio
      "mb-1.5 text-[10px] font-black uppercase tracking-[0.2em] leading-none",
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
      // Descripción: Datos con tracking-tight y font-medium, ligeramente atenuado para jerarquía visual
      "text-[12px] font-medium tracking-tight opacity-90 [&_p]:leading-relaxed",
      className,
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
