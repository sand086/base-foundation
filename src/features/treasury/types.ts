// src/features/treasury/types.ts
import type { BankAccountResponse } from "@/api/generated";

// ==========================================
// CUENTAS BANCARIAS (Heredado de la API)
// ==========================================

export type BankAccount = BankAccountResponse;

// ==========================================
// CATÁLOGO MAESTRO DE BANCOS (Configuración)
// ==========================================
/** Catálogo de Instituciones Bancarias soportadas por el sistema */
export interface Bank {
  id?: number;
  nombre: string; // Ej: "BBVA"
  alias?: string; // Ej: "BBVA Bancomer"
  activo: boolean;
}

// ==========================================
// MOVIMIENTOS BANCARIOS (Ledger)
// ==========================================
export interface BankMovement {
  id: number;
  tipo: "ingreso" | "egreso";
  monto: number;
  moneda: string;
  concepto: string;
  fecha: string; // Formato YYYY-MM-DD o ISO
  banco: string;
  cuenta_bancaria: string;
  referencia_bancaria: string;
  origen_modulo: string;
  factura_relacionada?: number | null;
  factura_folio?: string | null;
  registrado_por: string;
  fecha_registro: string; // Formato ISO
  conciliado: boolean;
  fecha_conciliacion?: string | null;
}
