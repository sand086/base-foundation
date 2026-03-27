"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

/**
 * PopoverContent - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Liquid Glass: backdrop-blur-xl con fondos reactivos.
 * 2. Bordes HD: border-slate-200/80 y dark:border-white/10.
 * 3. Profundidad: Sombra 2xl y Spotlight interno.
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // ESTRUCTURA BASE Y Z-INDEX
        "z-50 w-72 overflow-hidden outline-none",

        // REGLA 1 & 2: Glassmorphism y Bordes de Alta Definición
        "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",
        "border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl",

        // TIPOGRAFÍA BASE (DENTRO DEL POPOVER)
        "text-slate-900 dark:text-slate-200",

        // ANIMACIONES TAHOE (Entradas suaves y escalado)
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/20 dark:from-white/5 to-transparent z-0" />

      {/* Contenedor del contenido para asegurar el z-index sobre el spotlight */}
      <div className="relative z-10 p-4">{props.children}</div>
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
