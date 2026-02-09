import { cn } from "@/lib/utils";

// 1. Agregamos "default" a los tipos permitidos
export type StatusType = "success" | "warning" | "danger" | "info" | "default";

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

// 2. Definimos el estilo visual para "default"
const statusStyles: Record<StatusType, string> = {
  success:
    "bg-status-success-bg text-status-success border-status-success-border",
  warning:
    "bg-status-warning-bg text-status-warning border-status-warning-border",
  danger: "bg-status-danger-bg text-status-danger border-status-danger-border",
  info: "bg-status-info-bg text-status-info border-status-info-border",
  // Estilo neutro (Gris) para cuando no coincide el estatus
  default: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border",
        statusStyles[status],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Utility function to get status from common TMS terms
export function getStatusFromLabel(label: string): StatusType {
  const lowercased = label.toLowerCase();

  // Danger/Red states
  if (
    lowercased.includes("vencido") ||
    lowercased.includes("crítico") ||
    lowercased.includes("bloqueado") ||
    lowercased.includes("error") ||
    lowercased.includes("retraso") ||
    lowercased.includes("incompleto")
  ) {
    return "danger";
  }

  // Warning/Yellow states
  if (
    lowercased.includes("pendiente") ||
    lowercased.includes("atención") ||
    lowercased.includes("por vencer") ||
    lowercased.includes("detenido")
  ) {
    return "warning";
  }

  // Success/Green states
  if (
    lowercased.includes("activo") ||
    lowercased.includes("disponible") ||
    lowercased.includes("vigente") ||
    lowercased.includes("completado") ||
    lowercased.includes("entregado") ||
    lowercased.includes("en ruta")
  ) {
    return "success";
  }

  return "info";
}
