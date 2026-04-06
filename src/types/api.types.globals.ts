// UTILIDADES GLOBALES DE LA API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
// Correspondiente a Currency en Python
export type Currency = "MXN" | "USD";

// Correspondiente a RecordStatus en Python (A=Activo, I=Inactivo, E=Eliminado)
export type RecordStatus = "A" | "I" | "E";

// También te servirá tener estos aquí ya que son de la AuditMixin
export interface AuditFields {
  record_status: RecordStatus;
  created_at: string;
  updated_at: string;
  created_by_id?: number | null;
  updated_by_id?: number | null;
}
