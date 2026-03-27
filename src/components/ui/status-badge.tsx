import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StatusBadge UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Glassmorphism HD con micro-indicador "LED".
 * 2. Tipografía: Estilo placa de maquinaria (font-black, uppercase, tracking).
 * 3. Reactividad: Soporte dinámico para Light/Dark mode.
 */

export type StatusType = "success" | "warning" | "danger" | "info" | "default";

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

// 🌓 Definimos la matriz de estilos con Reactividad Total y Glassmorphism
const statusStyles: Record<StatusType, string> = {
  success: cn(
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/30",
  ),
  warning: cn(
    "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "dark:bg-amber-500/5 dark:text-amber-400 dark:border-amber-500/30",
  ),
  danger: cn(
    "bg-brand-red/10 text-brand-red border-brand-red/20",
    "dark:bg-brand-red/5 dark:text-red-400 dark:border-brand-red/30",
  ),
  info: cn(
    "bg-sky-500/10 text-sky-600 border-sky-500/20",
    "dark:bg-sky-500/5 dark:text-sky-400 dark:border-sky-500/30",
  ),
  default: cn(
    "bg-slate-500/10 text-slate-600 border-slate-500/20",
    "dark:bg-white/5 dark:text-white/40 dark:border-white/10",
  ),
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full border backdrop-blur-md transition-all duration-300",
        // 🛠 TIPOGRAFÍA INDUSTRIAL
        "text-[9px] font-black uppercase tracking-[0.15em]",
        statusStyles[status],
        className,
      )}
    >
      {/* 🔴 LED INDICATOR: Punto de estado con pulso sutil */}
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80",
          status !== "default" && "animate-pulse",
        )}
      />

      {children}
    </span>
  );
}

/**
 * Utility function to get status from common TMS terms
 * Refactorizada para cubrir más escenarios de logística.
 */
export function getStatusFromLabel(
  label: string | undefined | null,
): StatusType {
  if (!label) return "default";

  const lowercased = label.toLowerCase();

  // 🔴 DANGER: Estados críticos o bloqueantes
  if (
    lowercased.includes("vencido") ||
    lowercased.includes("crítico") ||
    lowercased.includes("bloqueado") ||
    lowercased.includes("error") ||
    lowercased.includes("retraso") ||
    lowercased.includes("siniestro") ||
    lowercased.includes("cancelado") ||
    lowercased.includes("rechazado")
  ) {
    return "danger";
  }

  // 🟠 WARNING: Requiere atención o preventivo
  if (
    lowercased.includes("pendiente") ||
    lowercased.includes("atención") ||
    lowercased.includes("por vencer") ||
    lowercased.includes("detenido") ||
    lowercased.includes("mantenimiento") ||
    lowercased.includes("espera") ||
    lowercased.includes("pausa")
  ) {
    return "warning";
  }

  // 🟢 SUCCESS: Flujo de operación normal
  if (
    lowercased.includes("activo") ||
    lowercased.includes("disponible") ||
    lowercased.includes("vigente") ||
    lowercased.includes("completado") ||
    lowercased.includes("entregado") ||
    lowercased.includes("en ruta") ||
    lowercased.includes("finalizado") ||
    lowercased.includes("confirmado")
  ) {
    return "success";
  }

  // 🔵 INFO: Informativos o de sistema
  if (
    lowercased.includes("nuevo") ||
    lowercased.includes("asignado") ||
    lowercased.includes("procesando") ||
    lowercased.includes("mensaje") ||
    lowercased.includes("histórico")
  ) {
    return "info";
  }

  return "default";
}
