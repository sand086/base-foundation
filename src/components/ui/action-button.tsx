import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "outline" | "ghost"; // Añadimos variantes para flexibilidad
  size?: "sm" | "md" | "lg";
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    { className, asChild = false, variant = "primary", size = "md", ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-lg",
      md: "h-10 px-5 text-sm rounded-xl", // Radios más orgánicos para macOS Tahoe
      lg: "h-12 px-8 text-base rounded-2xl",
    };

    return (
      <Comp
        className={cn(
          // Estructura base
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200",
          "focus-ring", // Clase de enfoque definida en tu CSS
          "disabled:pointer-events-none disabled:opacity-40 disabled:grayscale",

          // IDENTIDAD: Comportamiento Háptico
          "haptic-press active:brightness-90",

          // IDENTIDAD: Estilos de Variante
          variant === "primary" && [
            "btn-action-gradient", // Tu gradiente 3D verde de marca
            "text-white text-shadow-premium", // Sombra de texto para legibilidad premium
          ],

          variant === "outline" &&
            "border-2 border-action text-action hover:bg-action/5 bg-transparent",

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
