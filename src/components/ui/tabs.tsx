"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/**
 * TabsList - El Riel Industrial
 * Refactorización: Glassmorphism HD y bordes de alta definición.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-2xl p-1.5 transition-all duration-300",
      // REGLA: Glassmorphism + Reactividad
      "bg-slate-100/50 dark:bg-brand-navy/40 backdrop-blur-xl",
      // REGLA: Bordes HD
      "border border-slate-200/80 dark:border-white/10 shadow-inner",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * TabsTrigger - El Selector Táctil
 * Refactorización: Tipografía industrial y estado activo con Identidad de Marca.
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // BASE: Tipografía Industrial Estricta (Regla de Oro)
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ease-out haptic-press outline-none",

      // COLORES ESTÁNDAR
      "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",

      // ESTADO ACTIVO (Premium Tahoe): Elevación y Brand Red
      "data-[state=active]:bg-white dark:data-[state=active]:bg-white/10",
      "data-[state=active]:text-brand-red dark:data-[state=active]:text-white",
      "data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
      "data-[state=active]:scale-[1.02]",

      // ACCESIBILIDAD
      "focus-visible:ring-2 focus-visible:ring-brand-red/50 disabled:pointer-events-none disabled:opacity-30",

      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * TabsContent - El Panel de Datos
 * Refactorización: Animación de entrada Tahoe (Fade + Slide).
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 outline-none",
      // ANIMACIÓN: Entrada suave desde arriba para contenido de sistema
      "animate-in fade-in slide-in-from-top-2 duration-500",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
