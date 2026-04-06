// src/features/audit/types.ts

export interface AuditLog {
  id: number;
  user_id: number;
  user_name?: string; // Nombre del usuario que hizo la acción
  action: string; // Ej: "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity_type: string; // Ej: "PurchaseOrder", "User", "InventoryItem"
  entity_id?: string; // El ID del registro afectado
  details?: string | any; // Un JSON con los cambios (qué valor tenía antes y cuál tiene ahora)
  ip_address?: string; // Desde dónde se hizo
  created_at: string; // Fecha y hora
}
