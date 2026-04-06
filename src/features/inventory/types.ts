// src/features/inventory/types.ts

export interface InventoryItem {
  id: number;
  sku: string;
  descripcion: string;

  // Categoría es un Enum en el Backend, llega como string
  categoria:
    | "motor"
    | "frenos"
    | "eléctrico"
    | "suspensión"
    | "transmisión"
    | "general"
    | string;

  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  ubicacion?: string;

  // Campos del AuditMixin (opcionales por si los necesitas en la UI)
  created_at?: string;
  updated_at?: string;
}
