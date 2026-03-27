import { cn } from "@/lib/utils";
import * as React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode; // 🚀 Añadimos icono para darle presencia premium
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

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
        "flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative z-10",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Contenedor de Icono tipo App de macOS */}
        {icon && (
          <div className="glass-card bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm p-3.5 rounded-2xl flex items-center justify-center shrink-0 transition-transform hover:scale-105">
            {icon}
          </div>
        )}

        <div className="space-y-1">
          {/* Tipografía Tahoe Crisp: Negra, apretada y con sombra sutil */}
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-brand-navy drop-shadow-sm heading-crisp">
            {title}
          </h1>
          {/* Descripción Técnica: Pequeña, espaciada, no compite con el título */}
          {description && (
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Acciones Globales (Botones) */}
      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-3 shrink-0 animate-in fade-in slide-in-from-right-4 duration-500">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
