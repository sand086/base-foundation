"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full rounded-full transition-all duration-300 outline-none haptic-press",
      "bg-slate-200 dark:bg-white/10 backdrop-blur-md",
      "border border-slate-300/50 dark:border-white/10 shadow-inner",

      // checked normal
      "data-[state=checked]:bg-brand-red data-[state=checked]:border-brand-red",

      // checked en dark forzado
      "dark:data-[state=checked]:bg-brand-red dark:data-[state=checked]:border-brand-red",

      // opcional: quitar glow si no lo quieres
      // "data-[state=checked]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_12px_rgba(190,8,17,0.4)]",

      "focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white transition-all duration-300 ease-in-out",
        "shadow-[0_2px_5px_rgba(0,0,0,0.3),0_0_1px_rgba(0,0,0,0.1)]",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
        "border border-slate-100 dark:border-white/20",
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
