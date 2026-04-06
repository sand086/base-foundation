// src/features/purchases/types.ts
import { IndirectCategory } from "@/features/payables/types";

export type OrderType = "compra" | "servicio" | "gasto_indirecto";
export type CostCenter = "mantenimiento" | "operaciones" | "administracion";

export interface OrderItem {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  folio: string;
  tipo: OrderType;
  supplier_id: string;
  supplier_name: string;
  requester: string;
  created_at: string;
  required_date?: string;
  cost_center: CostCenter;
  indirect_category?: IndirectCategory;
  items: OrderItem[];
  service_description?: string;
  subtotal: number;
  iva: number;
  total: number;
  moneda: "MXN" | "USD";
  status:
    | "borrador"
    | "pendiente_aprobacion"
    | "aprobada"
    | "rechazada"
    | "en_transito"
    | "recibida"
    | "entregada"
    | "cancelada";
  converted_to_cxp: boolean;
}

// Funciones de utilidad
export function getOrderTypeColor(tipo: string): string {
  switch (tipo) {
    case "compra":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "servicio":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "gasto_indirecto":
      return "bg-slate-100 text-slate-800 border-slate-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getOrderTypeLabel(tipo: string): string {
  switch (tipo) {
    case "compra":
      return "COMPRA DE BIENES";
    case "servicio":
      return "CONTRATACIÓN DE SERVICIO";
    case "gasto_indirecto":
      return "GASTO INDIRECTO";
    default:
      return tipo.toUpperCase();
  }
}

export function getStatusInfo(estatus: string): {
  label: string;
  className: string;
} {
  switch (estatus) {
    case "borrador":
      return {
        label: "Borrador",
        className: "bg-slate-100 text-slate-700 border-slate-300",
      };
    case "pendiente_aprobacion":
      return {
        label: "Pendiente Aprob.",
        className: "bg-amber-100 text-amber-700 border-amber-300",
      };
    case "aprobada":
      return {
        label: "Aprobada",
        className: "bg-emerald-100 text-emerald-700 border-emerald-300",
      };
    case "recibida":
      return {
        label: "Recibida",
        className: "bg-blue-100 text-blue-700 border-blue-300",
      };
    case "cancelada":
      return {
        label: "Cancelada",
        className: "bg-red-100 text-red-700 border-red-300",
      };
    default:
      return { label: estatus, className: "bg-gray-100 text-gray-800" };
  }
}
