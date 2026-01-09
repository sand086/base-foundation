import { cn } from "@/lib/utils";

export type StatusType = "success" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusStyles[status],
        className
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
    lowercased.includes("retraso")
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
