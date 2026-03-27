import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * ActionButton - macOS Tahoe / Industrial Edition
 * Refactorización Senior:
 * 1. Theme Awareness: Soporte nativo para Dark Mode.
 * 2. Haptic Feedback: Física de presión active:scale-[0.96].
 * 3. Estética: Gradientes 3D para acciones primarias y bordes HD para outline.
 * 4. Tipografía: Tracking expansivo en tamaño LG para look industrial.
 */

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    { className, asChild = false, variant = "primary", size = "md", ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Mapeo de tamaños con tipografía de precisión
    const sizeStyles = {
      sm: "h-8 px-3 text-[11px] font-bold rounded-lg",
      md: "h-10 px-5 text-[13px] font-bold rounded-xl",
      lg: "h-12 px-8 text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl",
    };

    return (
      <Comp
        className={cn(
          // ESTRUCTURA BASE
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-300 outline-none",
          "disabled:pointer-events-none disabled:opacity-40 disabled:grayscale",

          // COMPORTAMIENTO HÁPTICO (macOS Style)
          "haptic-press active:scale-[0.96] hover:brightness-110",

          // VARIANTES DE DISEÑO
          variant === "primary" && [
            "btn-action-gradient text-white", // Tu gradiente verde 3D
            "shadow-[0_4px_15px_rgba(0,151,64,0.3)] dark:shadow-[0_4px_20px_rgba(0,151,64,0.15)]",
            "border-none text-shadow-premium",
          ],

          variant === "outline" && [
            "bg-transparent border-2",
            "border-brand-green/30 dark:border-brand-green/20",
            "text-brand-green dark:text-emerald-400",
            "hover:bg-brand-green/5 dark:hover:bg-emerald-500/10",
          ],

          variant === "ghost" && [
            "bg-transparent",
            "text-brand-green dark:text-emerald-400",
            "hover:bg-brand-green/10 dark:hover:bg-emerald-500/20",
          ],

          sizeStyles[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

ActionButton.displayName = "ActionButton";

export { ActionButton };
