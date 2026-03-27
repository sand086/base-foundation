"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Dot } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * InputOTP - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Glassmorphism: backdrop-blur-xl en cada slot.
 * 2. HD Borders: Sincronizados con el componente Input principal.
 * 3. Identidad: Caret y Focus en Brand Red corporativo.
 */

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-3 has-[:disabled]:opacity-40",
      containerClassName,
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

  return (
    <div
      ref={ref}
      className={cn(
        // ESTRUCTURA BASE (Igual que tus inputs industriales)
        "relative flex h-14 w-12 items-center justify-center text-lg transition-all duration-300",

        // REGLA 1: Glassmorphism Líquido y Reactividad (Dark Mode)
        "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",

        // REGLA 2: Bordes HD y Radios macOS
        "border border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm",

        // REGLA 3: Tipografía de Datos (Negra y nítida)
        "font-black tracking-tighter text-slate-900 dark:text-white",

        // REGLA 4 & 5: Estado Activo (Brand Red Glow)
        isActive && [
          "z-10 scale-105",
          "border-brand-red dark:border-brand-red",
          "ring-4 ring-brand-red/10 dark:ring-brand-red/20",
          "shadow-[0_0_15px_rgba(190,8,17,0.15)]",
        ],

        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Caret animado con Brand Red */}
          <div className="animate-caret-blink h-6 w-0.5 bg-brand-red duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    {...props}
    className="text-slate-300 dark:text-white/10"
  >
    {/* Dot industrial con stroke pesado */}
    <Dot className="h-8 w-8 fill-current" />
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
