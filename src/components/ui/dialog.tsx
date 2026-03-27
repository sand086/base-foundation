"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // IDENTIDAD: Fondo oscuro con desenfoque de cristal para aislar el modal
      "fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // POSICIONAMIENTO: Centrado absoluto
        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%]",

        // ESTILO TAHOE: Glassmorphism Líquido y Bordes HD
        "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",
        "border border-slate-200/80 dark:border-white/10 shadow-2xl",
        "rounded-2xl overflow-hidden",

        // ANIMACIÓN: Efecto de escala y entrada sutil
        "data-[state=open]:animate-modal-show",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",

        // Layout base
        "max-w-lg p-0 gap-0 duration-300",
        className,
      )}
      {...props}
    >
      {/* Brillo de luz (Spotlight) interno para profundidad de materiales Apple */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/20 dark:from-white/5 to-transparent z-0" />

      {/* Contenedor Real para respetar el Z-index */}
      <div className="relative z-10 flex flex-col h-full w-full">
        {children}
      </div>

      {/* Botón de cerrar estilo macOS Circular */}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-50 rounded-full p-2 text-slate-400 dark:text-white/40 transition-all duration-300 hover:text-brand-red dark:hover:text-brand-red hover:bg-white/10 dark:hover:bg-black/20 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-red/50">
        <X className="h-4 w-4 stroke-[3px]" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left p-8 pb-4 relative z-10",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // TAHOE MAGIC: Footer tipo "Control Bar" con fondo diferenciado
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 p-6 pt-4",
      "bg-slate-50/50 dark:bg-black/20 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 relative z-10",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      // Tipografía Industrial Premium: Black, tracking tight y colores de tema
      "text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      // Descripción: Tipografía de datos nítida (13px)
      "text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
