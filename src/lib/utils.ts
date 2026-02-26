import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PayableInvoice } from "@/types/api.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calcula el estatus visual de una factura basándose en fechas y saldos.
 * Reutilizable para CxP y CxC.
 */
export function getInvoiceStatusInfo(
  // Aceptamos un objeto parcial para que sirva tanto en CxP como en CxC
  invoice: Pick<
    PayableInvoice,
    "estatus" | "saldo_pendiente" | "fecha_vencimiento"
  >,
): {
  status: "danger" | "warning" | "info" | "success" | "default";
  label: string;
} {
  if (invoice.estatus === "cancelado") {
    return { status: "default", label: "Cancelado" };
  }

  // Si ya no se debe nada, está pagada
  if (
    invoice.estatus === "pagado" ||
    (invoice.saldo_pendiente !== undefined && invoice.saldo_pendiente <= 0)
  ) {
    return { status: "success", label: "Pagado" };
  }

  // Comprobar si está vencida (Fecha de vencimiento < Fecha actual sin horas)
  const isOverdue =
    new Date(invoice.fecha_vencimiento).getTime() <
    new Date().setHours(0, 0, 0, 0);

  if (isOverdue && (invoice.saldo_pendiente || 0) > 0) {
    return { status: "danger", label: "Vencido" };
  }

  if (invoice.estatus === "pago_parcial") {
    return { status: "info", label: "Pago Parcial" };
  }

  return { status: "warning", label: "Pendiente" };
}

/**
 * Parsea la clasificación de gasto/ingreso a un texto amigable.
 */
export function getClasificacionLabel(
  clasificacion: string | undefined,
): string {
  const map: Record<string, string> = {
    costo_directo: "Costo Directo (Viaje)",
    mantenimiento: "Mantenimiento (Taller)",
    indirecto: "Gasto Indirecto",
    ingreso_flete: "Ingreso Flete", // Para cuando hagas CxC
    maniobras: "Maniobras/Estadías", // Para cuando hagas CxC
  };
  return clasificacion ? map[clasificacion] || "Otro" : "Sin Clasificar";
}

/**
 * Devuelve las clases CSS de Tailwind para darle color al Badge según su clasificación.
 */
export function getClasificacionColor(
  clasificacion: string | undefined,
): string {
  const map: Record<string, string> = {
    costo_directo: "bg-blue-100 text-blue-700 border-blue-200",
    mantenimiento: "bg-amber-100 text-amber-700 border-amber-200",
    indirecto: "bg-purple-100 text-purple-700 border-purple-200",
    ingreso_flete: "bg-emerald-100 text-emerald-700 border-emerald-200",
    maniobras: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return clasificacion
    ? map[clasificacion] || "bg-slate-100 text-slate-700 border-slate-200"
    : "bg-slate-100 text-slate-700";
}
