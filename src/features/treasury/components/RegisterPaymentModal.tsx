// src/features/payables/components/RegisterPaymentModal.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  PayableInvoice,
  RegisterPaymentPayload,
} from "@/features/payables/types";
import { BankAccount } from "@/features/treasury/types";

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PayableInvoice | null;
  bankAccounts: BankAccount[];
  onSubmit: (
    invoiceId: number,
    payment: RegisterPaymentPayload | any,
  ) => void | Promise<void>;
  defaultMethod?: string;
}

const today = () => new Date().toISOString().split("T")[0];

const toNumber = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const toInt = (v: any): number => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
};

export function RegisterPaymentModal({
  open,
  onOpenChange,
  invoice,
  bankAccounts,
  onSubmit,
  defaultMethod = "03", // "03" es Transferencia en el SAT
}: RegisterPaymentModalProps) {
  const [formData, setFormData] = useState<{
    fecha_pago: string;
    monto: number;
    metodo_pago: string;
    cuenta_retiro: string;
    referencia: string;
  }>({
    fecha_pago: today(),
    monto: 0,
    metodo_pago: defaultMethod,
    cuenta_retiro: "",
    referencia: "",
  });

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invoiceId = useMemo(() => {
    return invoice ? toInt(invoice.id) : 0;
  }, [invoice]);

  const supplierName = useMemo(() => {
    return invoice ? invoice.supplier_razon_social || "—" : "";
  }, [invoice]);

  const montoTotal = useMemo(() => {
    return invoice ? toNumber(invoice.monto_total) : 0;
  }, [invoice]);

  const saldoPendiente = useMemo(() => {
    return invoice ? toNumber(invoice.saldo_pendiente) : 0;
  }, [invoice]);

  // Reset del formulario cuando se abre o cambia la factura
  useEffect(() => {
    if (!invoice || !open) return;

    // VERIFICAMOS SI EXISTE LA CUENTA BANAMEX (ID 1)
    const hasBanamex = bankAccounts.some((acc) => acc.id.toString() === "1");

    setFormData({
      fecha_pago: today(),
      monto: saldoPendiente > 0 ? saldoPendiente : 0, // Inyecta 0 si es negativo
      metodo_pago: defaultMethod,
      // SI EXISTE, LA PONEMOS POR DEFECTO, DE LO CONTRARIO SE QUEDA VACÍO
      cuenta_retiro: hasBanamex ? "1" : "",
      referencia: invoice.folio_interno || "",
    });
    setError("");
    setIsSubmitting(false);
  }, [invoice, open, saldoPendiente, defaultMethod, bankAccounts]);

  if (!invoice) return null;

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!formData.fecha_pago) errors.push("Selecciona la fecha de pago");

    // Si la factura tiene deuda, debe pagar más de 0. Si tiene a favor (negativo) o es 0, permite 0.
    if (saldoPendiente > 0) {
      if (formData.monto <= 0) errors.push("El monto debe ser mayor a 0");
      if (formData.monto > saldoPendiente) {
        errors.push(
          `El monto no puede exceder el saldo pendiente ($${saldoPendiente.toLocaleString("es-MX")})`,
        );
      }
    } else {
      if (formData.monto < 0) errors.push("El monto no puede ser negativo");
    }

    if (!formData.cuenta_retiro)
      errors.push("Debes seleccionar una cuenta de retiro o Caja General");
    if (!formData.metodo_pago)
      errors.push("Debes seleccionar un método de pago");

    const msg = errors[0] ?? "";
    setError(msg);
    return errors.length === 0;
  };

  const remainingAfterPayment = Math.max(
    0,
    saldoPendiente - (formData.monto || 0),
  );
  const willBeFullyPaid = remainingAfterPayment === 0;

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Revisa los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    const isVirtualCash = formData.cuenta_retiro === "virtual";

    const payload = {
      fecha_pago: formData.fecha_pago,
      monto: toNumber(formData.monto),
      metodo_pago: formData.metodo_pago,
      referencia: formData.referencia.trim() || "",
      bank_account_id: isVirtualCash ? null : toInt(formData.cuenta_retiro),
      cuenta_retiro: isVirtualCash ? "Caja General" : formData.cuenta_retiro,
    };

    try {
      await onSubmit(invoiceId, payload);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="w-[95vw] sm:max-w-lg flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* HEADER */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
              <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400 drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Registrar Pago
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Cuentas por pagar y Tesorería
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/50 dark:bg-transparent custom-scrollbar space-y-5 mt-4">
          <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Factura
                </p>
                <p className="font-bold text-foreground">
                  {invoice.folio_interno || invoiceId}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Proveedor
                </p>
                <p
                  className="font-bold truncate text-foreground"
                  title={supplierName}
                >
                  {supplierName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Monto Total
                </p>
                <p className="font-mono font-bold text-foreground">
                  ${montoTotal.toLocaleString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Saldo Pendiente
                </p>
                <p className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  ${saldoPendiente.toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Fecha de Pago <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.fecha_pago}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, fecha_pago: e.target.value }));
                  setError("");
                }}
                className="h-11 shadow-sm font-mono font-bold bg-muted border-slate-200 dark:border-white/5"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Método de Pago <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.metodo_pago}
                onValueChange={(value) => {
                  setFormData((p) => ({ ...p, metodo_pago: value }));
                  setError("");
                }}
              >
                <SelectTrigger className="h-11 shadow-sm font-bold bg-card border-slate-200 dark:border-white/10">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 - Efectivo</SelectItem>
                  <SelectItem value="02">02 - Cheque nominativo</SelectItem>
                  <SelectItem value="03">
                    03 - Transferencia electrónica
                  </SelectItem>
                  <SelectItem value="04">04 - Tarjeta de crédito</SelectItem>
                  <SelectItem value="99">99 - Por definir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Monto a Pagar <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              // Fix del Bug de React: Permitir que "0" se muestre
              value={formData.monto === 0 ? 0 : formData.monto || ""}
              onChange={(e) => {
                setFormData((p) => ({ ...p, monto: toNumber(e.target.value) }));
                setError("");
              }}
              className="h-11 text-lg font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5"
              max={saldoPendiente}
            />
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    monto: saldoPendiente > 0 ? saldoPendiente : 0,
                  }))
                }
                className="text-primary hover:underline font-bold"
              >
                Pagar saldo completo
              </button>
              <span className="text-muted-foreground font-mono">
                Máximo: $
                {saldoPendiente > 0
                  ? saldoPendiente.toLocaleString("es-MX")
                  : "0.00"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Cuenta de Retiro (Afecta Tesorería){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.cuenta_retiro}
              onValueChange={(value) => {
                setFormData((p) => ({ ...p, cuenta_retiro: value }));
                setError("");
              }}
            >
              <SelectTrigger className="h-11 shadow-sm font-bold bg-card border-slate-200 dark:border-white/10">
                <SelectValue placeholder="Seleccionar cuenta de origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">💵</span>
                    <span className="font-bold text-foreground">
                      Pago Directo / Caja General
                    </span>
                  </div>
                </SelectItem>
                {bankAccounts.map((acc) => (
                  <SelectItem
                    key={acc.id}
                    value={String(acc.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">
                        {acc.banco_logo || "🏦"}
                      </span>
                      <span className="font-bold text-foreground">
                        {acc.alias}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5 ml-1">
                        ••{acc.numero_cuenta.slice(-4)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Referencia / Número de Operación
            </Label>
            <Input
              placeholder="Ej: SPEI-12345 o RECIBO-01"
              value={formData.referencia}
              onChange={(e) =>
                setFormData((p) => ({ ...p, referencia: e.target.value }))
              }
              className="h-11 shadow-sm font-mono font-bold uppercase bg-muted border-slate-200 dark:border-white/5"
            />
          </div>

          {formData.monto > 0 && (
            <div
              className={`p-3 rounded-lg border ${
                willBeFullyPaid
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Saldo después del pago:
                </span>
                <span
                  className={`font-mono font-bold ${
                    willBeFullyPaid
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  ${remainingAfterPayment.toLocaleString("es-MX")}
                </span>
              </div>
              <p
                className={`text-xs mt-1 font-bold ${
                  willBeFullyPaid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {willBeFullyPaid
                  ? "✓ La factura quedará completamente pagada"
                  : "⚠ Quedará como Pago Parcial"}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800/50 font-bold">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !formData.cuenta_retiro ||
                formData.monto < 0 ||
                (saldoPendiente > 0 && formData.monto <= 0)
              }
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar Pago
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
