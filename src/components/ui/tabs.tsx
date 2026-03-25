"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Estética Tahoe: El "riel" de las pestañas
      "inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100/80 p-1.5 text-slate-500 shadow-inner border border-slate-200/50 backdrop-blur-md",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base: Tipografía nítida y transiciones suaves
      "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] px-4 py-2 text-sm font-bold tracking-tight ring-offset-background transition-all duration-300 ease-in-out haptic-press",

      // Hover: Sutil cambio de color antes de clickear
      "hover:text-slate-700",

      // Estado Activo (Premium Tahoe): La pestaña se "eleva" y brilla con el color de marca
      "data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_10px_rgba(0,0,0,0.08)] data-[state=active]:scale-[1.02]",

      // Accesibilidad con el halo Rojo Kemper
      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:pointer-events-none disabled:opacity-50",

      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // Animación de entrada: El contenido aparece con un suave fade y sube 4px
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 animate-in fade-in slide-in-from-bottom-2 duration-300",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
