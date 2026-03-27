"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Toast UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Notificación de cristal (Glassmorphism HD) con sombras de profundidad.
 * 2. Tipografía: Títulos con tracking industrial (0.2em) y font-black.
 * 3. Animación: Deslizamiento suave con físicas de entrada laterales.
 * 4. Variantes: Soporte destructivo usando Brand Red corporativo.
 */

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-6 sm:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-2xl border p-6 pr-8 shadow-2xl transition-all",
    "backdrop-blur-2xl outline-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  ],
  {
    variants: {
      variant: {
        // 💎 DEFAULT: Cristal macOS (Light/Dark)
        default: cn(
          "bg-white/80 dark:bg-brand-navy/90 text-slate-900 dark:text-white",
          "border-slate-200/60 dark:border-white/10",
        ),
        // 🔴 DESTRUCTIVE: Estilo de Alerta Industrial (Brand Red)
        destructive: cn(
          "destructive group border-brand-red/50 bg-white/90 dark:bg-brand-navy/95",
          "text-brand-red dark:text-brand-red",
          "shadow-[0_0_20px_rgba(190,8,17,0.15)]",
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border px-4 transition-all duration-200",
      // 🛠 ESTILO BOTÓN HARDWARE
      "text-[10px] font-black uppercase tracking-widest",
      "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-current",
      "hover:bg-brand-red hover:text-white hover:border-brand-red",
      "active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-red/40 disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-4 top-4 rounded-lg p-1.5 transition-all duration-200 opacity-50 hover:opacity-100",
      "text-slate-500 dark:text-white/40",
      "hover:bg-slate-100 dark:hover:bg-white/10",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4 stroke-[2.5px]" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      "text-brand-red dark:text-brand-red",
      "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
      className,
    )}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "text-[13px] font-medium leading-relaxed opacity-80 text-slate-700 dark:text-white/70",
      className,
    )}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
