import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { BankAccount } from "../types";
import { Wallet, Loader2 } from "lucide-react";

interface PettyCashModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

export function PettyCashModal({
  open,
  onOpenChange,
  bankAccounts,
  onSuccess,
}: PettyCashModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bank_account_id: "",
    monto: "",
    concepto: "",
    referencia: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bank_account_id || !formData.monto || !formData.concepto) {
      return toast.error("Por favor llena todos los campos obligatorios.");
    }

    setIsLoading(true);
    try {
      //   FIX FASE 3: Apuntamos al endpoint específico de Caja Chica
      await axiosClient.post("/api/finance/petty-cash", {
        bank_account_id: parseInt(formData.bank_account_id),
        monto: parseFloat(formData.monto),
        concepto: formData.concepto,
        referencia: formData.referencia,
      });

      toast.success("Gasto de Caja Chica registrado exitosamente");
      onSuccess();
      onOpenChange(false);
      setFormData({
        bank_account_id: "",
        monto: "",
        concepto: "",
        referencia: "",
      });
    } catch (error: any) {
      toast.error("Error al registrar Caja Chica", {
        description: error.response?.data?.detail || "Intenta nuevamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-card border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-500/20">
              <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter text-amber-600 dark:text-amber-500">
                Gasto / Reembolso
              </DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Caja Chica (Sin XML)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Cuenta Origen (Retiro) *
            </label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(v) =>
                setFormData({ ...formData, bank_account_id: v })
              }
            >
              <SelectTrigger className="h-11 font-bold shadow-sm">
                <SelectValue placeholder="Selecciona de dónde sale el dinero" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts
                  .filter((a) => a.estatus === "activo")
                  .map((acc) => (
                    <SelectItem
                      key={acc.id}
                      value={acc.id.toString()}
                      className="font-bold"
                    >
                      {acc.alias} ({acc.moneda})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Monto a Reembolsar *
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.monto}
              onChange={(e) =>
                setFormData({ ...formData, monto: e.target.value })
              }
              placeholder="0.00"
              className="h-11 font-mono font-bold text-lg text-amber-600 focus-visible:ring-amber-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Concepto / Motivo *
            </label>
            <Input
              value={formData.concepto}
              onChange={(e) =>
                setFormData({ ...formData, concepto: e.target.value })
              }
              placeholder="Ej. Papelería, Viáticos extra..."
              className="h-11 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Referencia / Ticket (Opcional)
            </label>
            <Input
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
              placeholder="Folio del ticket de compra..."
              className="h-11"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Registrar Gasto"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
