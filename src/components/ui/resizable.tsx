"use client";

import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

/**
 * Resizable UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Separadores "Línea de Luz" (1px) ultra nítidos.
 * 2. Handle: Tirador estilo hardware con cristal y Brand Red.
 * 3. Feedback: Cambio de color dinámico al arrastrar (Active State).
 * 4. Reactividad: Soporte total para Dark/Light mode.
 */

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className,
    )}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      // 📐 ESTRUCTURA BASE: Línea ultra fina (HD)
      "relative flex w-px items-center justify-center transition-all duration-300 outline-none",

      // 🌓 COLORES REACTIVOS:
      "bg-slate-200/80 dark:bg-white/10", // Color base de la línea
      "hover:bg-brand-red/50 data-[resize-handle-state=drag]:bg-brand-red", // Feedback de arrastre

      // Hit area expandida para mejor UX (sin ser visible)
      "after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",

      // DIRECCIÓN VERTICAL:
      "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
      "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-2 data-[panel-group-direction=vertical]:after:w-full",
      "data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",

      // Icono rota si es vertical
      "[&[data-panel-group-direction=vertical]>div]:rotate-90",

      className,
    )}
    {...props}
  >
    {withHandle && (
      <div
        className={cn(
          "z-10 flex h-6 w-4 items-center justify-center rounded-md border shadow-lg transition-all duration-300",
          // 💎 GLASSMORPHISM HD:
          "bg-white/90 dark:bg-brand-navy/90 backdrop-blur-xl",
          "border-slate-200 dark:border-white/20",
          // Efecto hover sobre el tirador
          "group-hover:scale-110 data-[resize-handle-state=drag]:scale-95 data-[resize-handle-state=drag]:bg-brand-red data-[resize-handle-state=drag]:text-white",
        )}
      >
        <GripVertical
          className={cn(
            "h-3 w-3 transition-colors",
            "text-slate-400 dark:text-white/30",
            "group-hover:text-brand-red data-[resize-handle-state=drag]:text-white",
          )}
        />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
