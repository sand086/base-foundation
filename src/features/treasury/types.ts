// src/features/treasury/types.ts
import type { BankAccountResponse } from "@/api/generated";

export interface BankAccount extends BankAccountResponse {
  // All fields come from BankAccountResponse now
}

export interface BankMovement {
  id: number;
  tipo: "ingreso" | "egreso";
  monto: number;
  moneda: string;
  concepto: string;
  fecha: string;
  banco: string;
  cuenta_bancaria: string;
  referencia_bancaria: string;
  origen_modulo: string;
  factura_relacionada?: number;
  factura_folio?: string;
  registrado_por: string;
  fecha_registro: string;
  conciliado: boolean;
  fecha_conciliacion?: string;
}
