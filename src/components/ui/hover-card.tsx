"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

/**
 * HoverCardContent - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Glassmorphism: backdrop-blur-xl con reactividad total.
 * 2. Bordes HD: border-slate-200/80 (light) y white/10 (dark).
 * 3. Profundidad: Spotlight interno y sombra proyectada 2xl.
 */
const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // ESTRUCTURA Y TAMAÑO
        "z-50 w-64 overflow-hidden outline-none",

        // REGLA 1: Glassmorphism Líquido y Reactividad Total
        "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",

        // REGLA 2: Bordes de Alta Definición y Radios Tahoe
        "border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl",

        // ANIMACIONES TAHOE (Zoom + Fade suave)
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",

        className,
      )}
      {...props}
    >
      {/* Brillo de luz (Spotlight) interno para profundidad de materiales */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/20 dark:from-white/5 to-transparent z-0" />

      {/* Contenedor Real para el contenido (Z-index superior al spotlight) */}
      <div className="relative z-10 p-4">{props.children}</div>
    </HoverCardPrimitive.Content>
  </HoverCardPrimitive.Portal>
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
