"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // BASE: Altura y tipografía Apple Crisp
      "flex h-11 w-full items-center justify-between px-4 py-2 text-sm font-medium tracking-tight",

      // REGLA 1: Glassmorphism Líquido y Reactividad Total (Dark Mode)
      "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",

      // REGLA 2: Bordes de Alta Definición (HD) y radios orgánicos
      "rounded-xl border border-slate-200/80 dark:border-white/10 shadow-sm transition-all duration-300 ease-out",

      // REGLA 3: Tipografía y color
      "text-slate-900 dark:text-white [&>span]:line-clamp-1",
      "placeholder:text-slate-400 dark:placeholder:text-slate-500",

      // REGLA 4 & 5: Hover y Focus con Identidad de Marca (Brand Red)
      "hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md",
      "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-red))]/50 focus:border-[hsl(var(--brand-red))]",

      // ESTADOS DESHABILITADOS: Atenuación táctica en ambos modos
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50 dark:disabled:bg-white/5 disabled:grayscale",

      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 dark:opacity-40 transition-transform duration-300" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-slate-500 dark:text-slate-400",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-slate-500 dark:text-slate-400",
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // TAHOE MAGIC: Glassmorphism Ultra HD para el desplegable
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl shadow-2xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      // Tipografía Industrial para agrupar opciones
      "py-2 pl-8 pr-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400",
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, textValue, value, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    value={value}
    //   LA MAGIA GLOBAL: Si no hay textValue explícito, usa el value para ocultar basura del SVG en el select nativo
    textValue={textValue || value}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pl-8 pr-2 text-sm font-semibold outline-none transition-colors duration-200",
      // Hover/Focus: Azul suave de Tahoe (Light) o fondo sutil en (Dark)
      "focus:bg-slate-100/80 dark:focus:bg-white/5",
      "text-slate-700 dark:text-slate-200 focus:text-brand-navy dark:focus:text-white",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[disabled]:grayscale",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        {/* Identidad de Marca: El check rojo corporativo */}
        <Check className="h-4 w-4 text-brand-red dark:text-brand-red stroke-[3px]" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn(
      "-mx-1 my-1 h-px bg-slate-200/80 dark:bg-white/10",
      className,
    )}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
