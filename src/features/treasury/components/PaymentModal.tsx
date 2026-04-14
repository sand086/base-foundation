import { useState, useMemo } from "react";
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
import { CreditCard, Landmark, AlertCircle, Loader2 } from "lucide-react";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { BankAccount } from "@/features/treasury/types";
import { Supplier } from "@/features/payables/types";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  suppliers: Supplier[];
}

const metodosPago = [
  { value: "transferencia", label: "Transferencia Bancaria" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
];

export function PaymentModal({
  open,
  onOpenChange,
  onSubmit,
  suppliers,
}: PaymentModalProps) {
  const { bankAccounts: accounts, isLoading: loadingAccounts } =
    useBankAccounts();
  const [formData, setFormData] = useState({
    supplier_id: "",
    folio_factura: "",
    monto: 0,
    metodo_pago: "",
    cuenta_id: "",
    referencia: "",
  });

  const [showAccountWarning, setShowAccountWarning] = useState(false);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.estatus === "activo"),
    [accounts],
  );

  const selectedAccount = useMemo(
    () => activeAccounts.find((a) => a.id.toString() === formData.cuenta_id),
    [activeAccounts, formData.cuenta_id],
  );

  const handleSubmit = () => {
    if (!formData.cuenta_id) {
      setShowAccountWarning(true);
      return;
    }

    onSubmit({
      ...formData,
      supplier_id: parseInt(formData.supplier_id),
      cuenta_id: parseInt(formData.cuenta_id),
      monto: parseFloat(formData.monto.toString()),
    });

    setFormData({
      supplier_id: "",
      folio_factura: "",
      monto: 0,
      metodo_pago: "",
      cuenta_id: "",
      referencia: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-[520px] flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
              <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 dark:text-slate-400 drop-shadow-md" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Registrar Pago
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Pago a Proveedor
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
          {/* Tarjeta: Proveedor y Factura */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
            <div className="space-y-1.5">
              <Label variant="brand" required>
                Seleccionar Proveedor
              </Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, supplier_id: v })
                }
              >
                <SelectTrigger className="h-11 shadow-sm font-bold">
                  <SelectValue placeholder="Buscar proveedor..." />
                </SelectTrigger>
                <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Folio Factura
                </Label>
                <Input
                  placeholder="A-001"
                  className="h-11 shadow-sm font-mono font-bold uppercase tracking-widest"
                  value={formData.folio_factura}
                  onChange={(e) =>
                    setFormData({ ...formData, folio_factura: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Monto a Pagar
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-7 h-11 shadow-sm font-mono font-bold tracking-widest"
                    value={formData.monto || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monto: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta: Cuenta Bancaria */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
            <div className="space-y-1.5">
              <Label variant="brand" required>
                <Landmark className="h-3 w-3 inline mr-1" /> Cuenta Bancaria de
                Origen
              </Label>
              <Select
                value={formData.cuenta_id}
                onValueChange={(v) => {
                  setFormData({ ...formData, cuenta_id: v });
                  setShowAccountWarning(false);
                }}
                disabled={loadingAccounts}
              >
                <SelectTrigger
                  className={`h-11 shadow-sm font-bold ${showAccountWarning ? "border-destructive ring-1 ring-destructive" : ""}`}
                >
                  {loadingAccounts ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                      cuentas...
                    </div>
                  ) : (
                    <SelectValue placeholder="Seleccionar banco..." />
                  )}
                </SelectTrigger>
                <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{acc.banco_logo || "🏦"}</span>
                        <span className="font-bold">{acc.alias}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({acc.banco} ••{acc.numero_cuenta.slice(-4)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAccount && (
                <div className="p-3 border border-dashed border-border rounded-xl bg-muted/50 flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black text-muted-foreground">
                    Saldo Disponible:
                  </span>
                  <span className="font-mono font-bold text-foreground tracking-widest">
                    ${selectedAccount.saldo.toLocaleString()}{" "}
                    {selectedAccount.moneda}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label variant="brand">Referencia de Transferencia</Label>
              <Input
                placeholder="Número de rastreo o autorización"
                className="h-11 shadow-sm font-mono font-bold uppercase tracking-widest"
                value={formData.referencia}
                onChange={(e) =>
                  setFormData({ ...formData, referencia: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* CAPA 5: FOOTER TAHOE */}
        <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.supplier_id || !formData.monto || !formData.cuenta_id
              }
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              Confirmar Pago_
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
