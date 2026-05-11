import { cn } from "@/lib/utils";
import * as React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode; // Icono que representa el módulo (ej. Truck, Users)
  actions?: React.ReactNode; // Botones de acción principal
  children?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Icon Plate: Estilo icono de app Apple con Glassmorphism HD.
 * 2. Tipografía: Título ultra-black y descripción con tracking industrial.
 * 3. Animaciones: Entrada suave en cascada (fade + slide).
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-6 mb-5 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700",
        className,
      )}
    >
      <div className="flex items-center gap-5">
        {/* REGLA: Icon Plate (Contenedor de Icono tipo App macOS) */}
        {icon && (
          <div className="relative group">
            {/* Brillo de fondo sutil con el color de marca */}
            <div className="absolute inset-0 bg-brand-red/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div
              className={cn(
                "relative z-10 flex items-center justify-center shrink-0",
                "h-14 w-14 md:h-16 md:w-16 rounded-[1.25rem]", // Curvatura Apple
                "bg-white/90 dark:bg-brand-navy/50 backdrop-blur-xl",
                "border border-slate-200/80 dark:border-white/10 shadow-sm",
                "transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:-translate-y-1 haptic-press",
              )}
            >
              {/* Inyectamos color de marca al icono si es un componente Lucide */}
              <div className="text-brand-red drop-shadow-[0_0_8px_rgba(190,8,17,0.3)]">
                {icon}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {/* REGLA: Tipografía Industrial - Título */}
          <h1 className="uppercase text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none">
            {title}
          </h1>

          {/* REGLA: Tipografía Industrial - Descripción Técnica */}
          {description && (
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed opacity-80">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* REGLA: Acciones Globales (Botones con animación lateral) */}
      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-3 shrink-0 md:mt-0 animate-in fade-in slide-in-from-right-6 duration-700 delay-200">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
