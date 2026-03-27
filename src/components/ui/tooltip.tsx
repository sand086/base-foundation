"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Glassmorphism: backdrop-blur-xl con opacidad táctica.
 * 2. Bordes HD: border-slate-200/80 (light) y white/20 (dark).
 * 3. Tipografía: Lógica industrial text-[10px] black uppercase.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-xl px-3 py-1.5 shadow-2xl transition-all",

      // REGLA 1 & 2: Glassmorphism Líquido y Bordes HD
      "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",
      "border border-slate-200/80 dark:border-white/20",

      // REGLA 3: Tipografía Industrial (Efecto etiqueta de maquinaria)
      "text-[10px] font-black uppercase tracking-[0.15em] text-slate-800 dark:text-slate-100",

      // ANIMACIONES TAHOE
      "animate-in fade-in-0 zoom-in-95 duration-300 ease-out",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",

      className,
    )}
    {...props}
  >
    {/* Contenido del Tooltip */}
    {props.children}

    {/* REGLA: Flecha de cristal (Opcional, pero recomendada para el look OS) */}
    <TooltipPrimitive.Arrow
      className="fill-white/90 dark:fill-brand-navy/95 drop-shadow-[0_1px_0_rgba(0,0,0,0.05)]"
      width={12}
      height={6}
    />
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
