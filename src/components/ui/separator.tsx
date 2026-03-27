"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

/**
 * Separator UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: "Línea de Luz" (1px) de alta definición.
 * 2. Theme Awareness: Neutro en Light Mode, luz sutil en Dark Mode.
 * 3. Layout: Transición fluida para cambios de tema.
 */

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref,
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 transition-colors duration-500",

        "bg-slate-200/80 dark:bg-white/10",

        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",

        className,
      )}
      {...props}
    />
  ),
);

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
