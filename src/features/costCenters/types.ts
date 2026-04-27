/* generated using openapi-typescript-codegen */
/* Este archivo centraliza los tipos del feature consumiendo la base autogenerada */

// 1. Importamos las interfaces exactas que generó el script desde la carpeta /generated
// Nota: Ajusta la ruta "@/generated" según donde se guarde tu salida del generador
import { SupplierResponse } from "@/api/generated/models/SupplierResponse";
import { SupplierCreate } from "@/api/generated/models/SupplierCreate";
import { SupplierUpdate } from "@/api/generated/models/SupplierUpdate";
import type { app__modules__finance__schemas__CostCenterResponse as CostCenterResponse } from "@/api/generated/models/app__modules__finance__schemas__CostCenterResponse";
import { PayableInvoiceResponse } from "@/api/generated/models/PayableInvoiceResponse";

/**
 * Proveedor Principal (Response)
 * Al usar este alias, tus componentes usan 'Supplier' pero con la
 * estructura exacta que dictó el Backend (incluyendo cost_center, banco, clabe, etc.)
 */
export type Supplier = SupplierResponse;

/**
 * Tipos para formularios y peticiones
 */
export type SupplierCreateInput = SupplierCreate;
export type SupplierUpdateInput = SupplierUpdate;

/**
 * Relacionados
 */
export type CostCenter = CostCenterResponse;
export type PayableInvoice = PayableInvoiceResponse;

/**
 * (Opcional) Si necesitas extender alguna interfaz con lógica solo de UI
 * que el backend no conoce, hazlo así:
 */
export interface SupplierUI extends Supplier {
  isExpanded?: boolean; // Ejemplo de propiedad solo para el Frontend
}
