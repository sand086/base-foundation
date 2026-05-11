"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * RadioGroup UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Efecto de "botón troquelado" con sombras internas.
 * 2. Feedback: Efecto háptico active:scale-90.
 * 3. Identidad: Indicador central en Brand Red con glow.
 * 4. Reactividad: Soporte total para Dark/Light Mode.
 */

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-3", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-5 w-5 rounded-full transition-all duration-300 outline-none",
        // 🌓 COLORES Y CRISTALERÍA HD
        "bg-white/50 dark:bg-white/5 backdrop-blur-sm",
        "border border-slate-300 dark:border-white/10 shadow-inner",

        // ✨ ESTADO ACTIVO / SELECCIONADO
        "data-[state=checked]:border-brand-red data-[state=checked]:bg-brand-red/5",
        "group focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2",

        // ❄️ INTERACCIÓN HÁPTICA
        "active:scale-90 disabled:cursor-not-allowed disabled:opacity-30",

        // 🛑 SOPORTE PARA ERRORES (Validación Visual)
        "aria-[invalid=true]:border-orange-500 aria-[invalid=true]:shadow-[0_0_10px_rgba(249,115,22,0.3)]",

        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center relative">
        {/* LED Central con Glow de Marca */}
        <Circle className="h-2.5 w-2.5 fill-brand-red text-brand-red drop-shadow-[0_0_5px_rgba(190,8,17,0.8)]" />

        {/* Efecto de pulso sutil para el ítem seleccionado */}
        <div className="absolute inset-0 rounded-full bg-brand-red/20 animate-ping duration-1000" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
