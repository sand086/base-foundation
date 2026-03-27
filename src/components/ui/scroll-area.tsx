"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

/**
 * ScrollArea UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Barras de desplazamiento estilo macOS (mínimas y redondeadas).
 * 2. Theme Awareness: Thumb reactivo al modo claro (slate) y oscuro (white/20).
 * 3. Interacción: Transiciones suaves de opacidad al pasar el mouse.
 */

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner className="bg-transparent" />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-all duration-300 ease-in-out",
      // 📐 ORIENTACIÓN
      orientation === "vertical" &&
        "h-full w-2 border-l border-l-transparent p-[1px] hover:w-2.5",
      orientation === "horizontal" &&
        "h-2 flex-col border-t border-t-transparent p-[1px] hover:h-2.5",
      // ✨ ESTADO VISIBLE: Solo aparece cuando hay hover en el contenedor
      "opacity-0 group-hover:opacity-100",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative flex-1 rounded-full transition-colors duration-300",
        // 🌓 COLORS (Reactividad Total)
        "bg-slate-300/60 dark:bg-white/20",
        "hover:bg-slate-400 dark:hover:bg-white/40",
        // Efecto de brillo sutil en el thumb
        "after:absolute after:inset-0 after:rounded-full after:content-['']",
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
