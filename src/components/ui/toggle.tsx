"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Toggle UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Glassmorphism base con transición a Brand Red sólido.
 * 2. Tipografía: Estilo técnico (font-black, uppercase, tracking-widest).
 * 3. Haptic: Efecto de presión física (active:scale-95).
 * 4. Bordes: Definición HD que reacciona al estado 'on'.
 */

const toggleVariants = cva(
  [
    "inline-flex items-center justify-center rounded-xl transition-all duration-300 outline-none",
    "text-[10px] font-black uppercase tracking-widest",
    "focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-30",
    "haptic-press active:scale-95",
  ],
  {
    variants: {
      variant: {
        default: cn(
          "bg-transparent text-slate-600 dark:text-white/60",
          "hover:bg-slate-100 dark:hover:bg-white/5",
          "data-[state=on]:bg-brand-red data-[state=on]:text-white data-[state=on]:shadow-[0_8px_16px_rgba(190,8,17,0.3)]",
        ),
        outline: cn(
          "border border-slate-200 dark:border-white/10 bg-transparent",
          "hover:bg-slate-100 dark:hover:bg-white/5",
          "data-[state=on]:bg-brand-red data-[state=on]:text-white data-[state=on]:border-brand-red data-[state=on]:shadow-[0_8px_16px_rgba(190,8,17,0.2)]",
        ),
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
