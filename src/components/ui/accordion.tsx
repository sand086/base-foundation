"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Accordion UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Theme Awareness: Soporte dinámico para Light y Dark mode.
 * 2. Visual Style: Bordes HD y superficies de cristal sutil.
 * 3. Haptic Feel: Micro-interacciones suaves y resaltado estilo celda.
 */

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      // Bordes de alta definición adaptables
      "border-b border-slate-200/60 dark:border-white/10 mb-1 last:mb-0",
      className,
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        // ESTRUCTURA: Tipografía Tahoe
        "flex flex-1 items-center justify-between py-4 px-3 font-medium transition-all duration-300 outline-none",
        "text-slate-700 dark:text-white/80 text-[14px] tracking-tight",

        // IDENTIDAD: Resaltado nativo macOS
        "rounded-xl haptic-press group",
        "hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white hover:no-underline",

        // ESTADO ABIERTO: El icono cambia al color de marca (Brand Red)
        "[&[data-state=open]>svg]:rotate-180 [&[data-state=open]>svg]:text-brand-red dark:[&[data-state=open]>svg]:text-brand-red",
        "[&[data-state=open]]:text-slate-950 dark:[&[data-state=open]]:text-white",

        className,
      )}
      {...props}
    >
      <span className="text-left">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-white/20 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) group-hover:text-slate-600 dark:group-hover:text-white/50" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      // IDENTIDAD: Animación industrial fluida
      "overflow-hidden text-sm transition-all",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className,
    )}
    {...props}
  >
    {/* Contenedor interno: Tipografía secundaria legible */}
    <div
      className={cn(
        "pb-5 pt-1 px-4",
        "text-slate-500 dark:text-white/50 leading-relaxed",
        className,
      )}
    >
      {children}
    </div>
  </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
