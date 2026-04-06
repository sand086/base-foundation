export interface BankAccount {
  id: number;
  alias: string;
  banco: string;
  numero_cuenta: string;
  clabe?: string;
  moneda: "MXN" | "USD";
  saldo: number;
  estatus: "activo" | "inactivo";
  banco_logo?: string;
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
