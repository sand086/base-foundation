"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

/**
 * ToggleGroup UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Contenedor tipo "switch rack" con separación mecánica.
 * 2. Selección: El ítem activo recibe un borde de luz Brand Red y elevación.
 * 3. Haptic: Micro-escala al presionar (active:scale-95).
 * 4. Contexto: Hereda los estilos de cristal del componente Toggle.
 */

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(
      "flex items-center justify-center gap-1.5 p-1 rounded-xl",
      // 💎 CONTENEDOR TIPO TRAY (Opcional, para dar look de hardware)
      "bg-slate-200/30 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/5",
      className,
    )}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        // 🛠 REFINAMIENTO INDUSTRIAL
        "relative transition-all duration-300 ease-out",
        "rounded-lg border-transparent",

        // ✨ ESTADO SELECCIONADO (DATA-STATE=ON)
        "data-[state=on]:bg-white dark:data-[state=on]:bg-white/10",
        "data-[state=on]:text-brand-red dark:data-[state=on]:text-brand-red",
        "data-[state=on]:shadow-[0_4px_12px_rgba(190,8,17,0.2)]",
        "data-[state=on]:border-brand-red/30",

        // ⚡ EFECTO HÁPTICO
        "haptic-press active:scale-95",

        // Bordes HD entre botones
        "hover:bg-white/40 dark:hover:bg-white/5",

        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
