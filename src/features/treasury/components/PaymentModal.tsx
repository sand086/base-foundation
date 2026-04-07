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
//  Importamos datos reales
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { BankAccount } from "@/features/treasury/types";
import { Supplier } from "@/features/payables/types";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  suppliers: Supplier[]; //  Ahora usa el tipo real
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

  // Cuentas filtradas
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

    //  Enviamos los datos con el formato que espera el backend
    onSubmit({
      ...formData,
      supplier_id: parseInt(formData.supplier_id),
      cuenta_id: parseInt(formData.cuenta_id),
      monto: parseFloat(formData.monto.toString()),
    });

    // Reset
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
      <DialogContent className="sm:max-w-[520px] bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <CreditCard className="h-5 w-5 text-brand-green" />
            Registrar Pago a Proveedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Proveedor Real */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Seleccionar Proveedor
            </Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(v) =>
                setFormData({ ...formData, supplier_id: v })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Buscar proveedor..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Folio Factura
              </Label>
              <Input
                placeholder="A-001"
                className="rounded-xl"
                value={formData.folio_factura}
                onChange={(e) =>
                  setFormData({ ...formData, folio_factura: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Monto a Pagar
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-7 rounded-xl"
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

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Landmark className="h-3 w-3" /> Cuenta Bancaria de Origen
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
                className={`rounded-xl ${showAccountWarning ? "border-red-500 ring-1 ring-red-500" : ""}`}
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
              <SelectContent>
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

            {/* Saldo Preview */}
            {selectedAccount && (
              <div className="p-3 bg-muted/50 rounded-xl border border-dashed border-border flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Saldo Disponible:
                </span>
                <span className="font-mono font-bold text-foreground">
                  ${selectedAccount.saldo.toLocaleString()}{" "}
                  {selectedAccount.moneda}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Referencia de Transferencia
            </Label>
            <Input
              placeholder="Número de rastreo o autorización"
              className="rounded-xl"
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter className="pt-6 border-t border-border gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-brand-green hover:bg-brand-green/90 text-white rounded-xl px-8"
            disabled={
              !formData.supplier_id || !formData.monto || !formData.cuenta_id
            }
          >
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
