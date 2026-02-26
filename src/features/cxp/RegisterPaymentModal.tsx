// src/features/cxp/RegisterPaymentModal.tsx
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
import { CreditCard, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// ✅ 1. ÚNICA FUENTE DE LA VERDAD (api.types.ts)
import {
  PayableInvoice,
  BankAccount,
  RegisterPaymentPayload,
} from "@/types/api.types";

// ✅ 2. INTERFAZ LOCAL (Solo para los props del componente)
interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PayableInvoice | null;
  bankAccounts: BankAccount[]; // Viene de api.types
  onSubmit: (
    invoiceId: number,
    payment: RegisterPaymentPayload,
  ) => void | Promise<void>;
  defaultMethod?: string;
}

// Helpers locales de formato
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
  defaultMethod = "Transferencia",
}: RegisterPaymentModalProps) {
  // Estado local del formulario
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

  // ===========
  // Normalizar datos desde invoice tipado
  // ===========
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

  // ===========
  // Reset cuando cambia invoice / abre modal
  // ===========
  useEffect(() => {
    if (!invoice || !open) return;

    setFormData({
      fecha_pago: today(),
      monto: saldoPendiente, // Por defecto sugiere pagar todo el saldo
      metodo_pago: defaultMethod,
      cuenta_retiro: "",
      referencia: "",
    });
    setError("");
  }, [invoice, open, saldoPendiente, defaultMethod]);

  if (!invoice) return null;

  // ===========
  // Validaciones
  // ===========
  const validate = (): boolean => {
    const errors: string[] = [];

    if (!formData.fecha_pago) errors.push("Selecciona la fecha de pago");
    if (!formData.monto || formData.monto <= 0)
      errors.push("El monto debe ser mayor a 0");
    if (formData.monto > saldoPendiente) {
      errors.push(
        `El monto no puede exceder el saldo pendiente ($${saldoPendiente.toLocaleString("es-MX")})`,
      );
    }
    if (!formData.cuenta_retiro)
      errors.push("Debe seleccionar una cuenta de retiro");

    const msg = errors[0] ?? "";
    setError(msg);
    return errors.length === 0;
  };

  // ===========
  // Preview
  // ===========
  const remainingAfterPayment = Math.max(
    0,
    saldoPendiente - (formData.monto || 0),
  );
  const willBeFullyPaid = remainingAfterPayment === 0;

  // ===========
  // Submit
  // ===========
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Revisa los campos obligatorios");
      return;
    }

    const accountId = toInt(formData.cuenta_retiro);

    // Armamos el payload estricto como lo pide api.types.ts
    const payload: RegisterPaymentPayload = {
      fecha_pago: formData.fecha_pago,
      monto: toNumber(formData.monto),
      metodo_pago: formData.metodo_pago,
      referencia: formData.referencia.trim()
        ? formData.referencia.trim()
        : null,
      cuenta_retiro: accountId, // Se manda como número
    };

    try {
      await onSubmit(invoiceId, payload);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("No se pudo registrar el pago");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <CreditCard className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Resumen */}
          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Factura</p>
                <p className="font-medium">
                  {invoice.folio_interno || invoiceId}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Proveedor</p>
                <p className="font-medium truncate" title={supplierName}>
                  {supplierName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Monto Total</p>
                <p className="font-medium">
                  ${montoTotal.toLocaleString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Saldo Pendiente</p>
                <p className="font-bold text-amber-700">
                  ${saldoPendiente.toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </div>

          {/* Fecha pago */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha de Pago <span className="text-status-danger">*</span>
            </Label>
            <Input
              type="date"
              value={formData.fecha_pago}
              onChange={(e) => {
                setFormData((p) => ({ ...p, fecha_pago: e.target.value }));
                setError("");
              }}
              className="h-10"
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Monto a Pagar <span className="text-status-danger">*</span>
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.monto || ""}
              onChange={(e) => {
                setFormData((p) => ({ ...p, monto: toNumber(e.target.value) }));
                setError("");
              }}
              className="h-10 text-lg font-medium"
              max={saldoPendiente}
            />
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({ ...p, monto: saldoPendiente }))
                }
                className="text-brand-navy hover:underline"
              >
                Pagar saldo completo
              </button>
              <span className="text-muted-foreground">
                Máximo: ${saldoPendiente.toLocaleString("es-MX")}
              </span>
            </div>
          </div>

          {/* Cuenta retiro */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cuenta de Retiro <span className="text-status-danger">*</span>
            </Label>
            <Select
              value={formData.cuenta_retiro}
              onValueChange={(value) => {
                setFormData((p) => ({ ...p, cuenta_retiro: value }));
                setError("");
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    <span className="font-medium">{acc.name}</span>
                    {acc.last_digits ? (
                      <span className="text-muted-foreground ml-2">
                        ****{acc.last_digits}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Referencia / Número de Operación
            </Label>
            <Input
              placeholder="Ej: SPEI-12345"
              value={formData.referencia}
              onChange={(e) =>
                setFormData((p) => ({ ...p, referencia: e.target.value }))
              }
              className="h-10"
            />
          </div>

          {/* Preview saldo */}
          {formData.monto > 0 && (
            <div
              className={`p-3 rounded-lg border ${willBeFullyPaid ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Saldo después del pago:
                </span>
                <span
                  className={`font-bold ${willBeFullyPaid ? "text-emerald-700" : "text-amber-700"}`}
                >
                  ${remainingAfterPayment.toLocaleString("es-MX")}
                </span>
              </div>
              <p
                className={`text-xs mt-1 ${willBeFullyPaid ? "text-emerald-600" : "text-amber-600"}`}
              >
                {willBeFullyPaid
                  ? "✓ La factura quedará completamente pagada"
                  : "⚠ Quedará como Pago Parcial"}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-status-danger text-sm p-2 bg-red-50 rounded">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-brand-green hover:bg-brand-green/90 text-white"
            disabled={formData.monto <= 0 || !formData.cuenta_retiro}
          >
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
