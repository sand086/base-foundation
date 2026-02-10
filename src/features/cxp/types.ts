// src/features/cxp/types.ts

// --- FINANCIAL CLASSIFICATION ---
// Estas etiquetas se usan en el Frontend para categorizar el gasto antes de enviarlo
export type ClasificacionFinanciera =
  | "costo_directo_viaje"
  | "costo_mantenimiento"
  | "gasto_indirecto_fijo"
  | "gasto_indirecto_variable";

export interface IndirectCategory {
  id: string;
  nombre: string;
  tipo: "fijo" | "variable";
}

// Categorías por defecto (Frontend Only por ahora)
export const defaultIndirectCategories: IndirectCategory[] = [
  { id: "cat-001", nombre: "Renta", tipo: "fijo" },
  { id: "cat-002", nombre: "Sueldos Administrativos", tipo: "fijo" },
  { id: "cat-003", nombre: "Seguros de Oficina", tipo: "fijo" },
  { id: "cat-004", nombre: "Servicios Públicos", tipo: "fijo" },
  { id: "cat-005", nombre: "Papelería", tipo: "variable" },
  { id: "cat-006", nombre: "Reparaciones Locativas", tipo: "variable" },
  { id: "cat-007", nombre: "Insumos Oficina", tipo: "variable" },
  { id: "cat-008", nombre: "Suscripciones Software", tipo: "fijo" },
];

export function getClasificacionLabel(clasificacion: string): string {
  switch (clasificacion) {
    case "costo_directo_viaje":
      return "Costo Directo de Viaje";
    case "costo_mantenimiento":
      return "Costo de Mantenimiento";
    case "gasto_indirecto_fijo":
      return "Gasto Indirecto Fijo";
    case "gasto_indirecto_variable":
      return "Gasto Indirecto Variable";
    default:
      return clasificacion || "General";
  }
}

export function getClasificacionColor(clasificacion: string): string {
  switch (clasificacion) {
    case "costo_directo_viaje":
      return "bg-blue-100 text-blue-700";
    case "costo_mantenimiento":
      return "bg-amber-100 text-amber-700";
    case "gasto_indirecto_fijo":
      return "bg-slate-100 text-slate-700";
    case "gasto_indirecto_variable":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// --- INTERFACES REALES (Coinciden con Backend/DB) ---

export interface InvoicePayment {
  id: number;
  invoice_id: number;
  fecha_pago: string; // ISO Date "YYYY-MM-DD"
  monto: number;
  metodo_pago: string;
  referencia?: string;
  cuenta_retiro?: string;
  created_at?: string;
}

export interface PayableInvoice {
  id: number;
  supplier_id: number;
  supplier_razon_social?: string; // Flattened (viene del backend)

  uuid: string;
  folio_interno?: string;

  fecha_emision: string; // "YYYY-MM-DD"
  fecha_vencimiento: string; // "YYYY-MM-DD"

  monto_total: number;
  saldo_pendiente: number;
  moneda: string; // "MXN" | "USD"

  concepto: string;
  estatus: "pendiente" | "pago_parcial" | "pagado" | "cancelado";

  // Archivos
  pdf_url?: string;
  xml_url?: string;

  // Clasificación
  clasificacion?: string;
  // Nota: En DB guardamos strings simples, pero el front puede mandar lógica extra
  viaje_id?: number;
  unidad_id?: number;

  // Origen
  orden_compra_id?: string;

  // Relaciones
  payments?: InvoicePayment[];
}

export interface Supplier {
  id: number;
  razon_social: string;
  rfc: string;
  categoria?: string;
  contacto_principal?: string;
  telefono?: string;
  email?: string;
  dias_credito: number;
  estatus: "activo" | "inactivo" | "suspendido";
}

// --- HELPERS ---

export function getInvoiceStatusInfo(invoice: PayableInvoice): {
  status: "success" | "warning" | "danger" | "info" | "default";
  label: string;
} {
  // Estado explícito del backend
  if (invoice.estatus === "pagado") {
    return { status: "success", label: "PAGADA" };
  }
  if (invoice.estatus === "cancelado") {
    return { status: "default", label: "CANCELADA" };
  }
  if (invoice.estatus === "pago_parcial") {
    return { status: "info", label: "PARCIAL" };
  }

  // Si está pendiente, calculamos vencimiento
  if (invoice.saldo_pendiente > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parseo seguro de fecha (asumiendo YYYY-MM-DD)
    const vencimiento = new Date(invoice.fecha_vencimiento);
    vencimiento.setHours(0, 0, 0, 0); // Normalizar hora

    if (vencimiento < today) {
      return { status: "danger", label: "VENCIDA" };
    }

    // Diferencia en días
    const diffTime = Math.abs(vencimiento.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      return { status: "warning", label: "POR VENCER" };
    }
  }

  return { status: "warning", label: "PENDIENTE" }; // Default para pendiente con tiempo
}

export function calculateDueDate(
  emissionDate: string,
  creditDays: number,
): string {
  if (!emissionDate) return "";
  const date = new Date(emissionDate);
  date.setDate(date.getDate() + creditDays);
  return date.toISOString().split("T")[0];
}

// --- MOCK DATA FOR UI SELECTORS (Temporal hasta conectar con Viajes/Unidades reales) ---
export interface MockTrip {
  id: string;
  folio: string;
  origen: string;
  destino: string;
  fecha: string;
}

export interface MockUnit {
  id: string;
  economico: string;
  tipo: string;
  placas: string;
}

// Estos mocks se mantendrán hasta que conectemos los selectores de los modales con useUnits y useTrips
export const mockTrips: MockTrip[] = [
  {
    id: "VJ-001",
    folio: "VJ-2025-0001",
    origen: "CDMX",
    destino: "Monterrey",
    fecha: "2025-01-10",
  },
  {
    id: "VJ-002",
    folio: "VJ-2025-0002",
    origen: "Veracruz",
    destino: "Guadalajara",
    fecha: "2025-01-12",
  },
];

export const mockUnits: MockUnit[] = [
  { id: "U-001", economico: "T-01", tipo: "Tractocamión", placas: "ABC-123" },
  { id: "U-002", economico: "T-02", tipo: "Tractocamión", placas: "DEF-456" },
];
