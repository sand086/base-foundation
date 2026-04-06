// src/features/billing/types.ts

export type FormaPago =
  | "01" // Efectivo
  | "02" // Cheque nominativo
  | "03" // Transferencia electrónica de fondos
  | "04" // Tarjeta de crédito
  | "28" // Tarjeta de débito
  | "99" // Por definir
  | string; // Por si tu backend manda otra clave
