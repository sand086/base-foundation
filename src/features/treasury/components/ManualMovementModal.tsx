import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface ManualMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

export function ManualMovementModal({
  open,
  onOpenChange,
  bankAccounts,
  onSuccess,
}: ManualMovementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bank_account_id: "",
    tipo: "egreso",
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
      await axiosClient.post("/api/finance/movements", {
        bank_account_id: parseInt(formData.bank_account_id),
        tipo: formData.tipo,
        monto: parseFloat(formData.monto),
        concepto: formData.concepto,
        referencia: formData.referencia,
      });
      toast.success("Movimiento manual registrado exitosamente");
      onSuccess();
      onOpenChange(false);
      setFormData({
        bank_account_id: "",
        tipo: "egreso",
        monto: "",
        concepto: "",
        referencia: "",
      });
    } catch (error) {
      toast.error("Error al registrar el movimiento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento Manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Cuenta Bancaria *
            </label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(v) =>
                setFormData({ ...formData, bank_account_id: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts
                  .filter((a) => a.estatus === "activo")
                  .map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.alias} ({acc.moneda})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Tipo *
              </label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="egreso">Egreso (Salida)</SelectItem>
                  <SelectItem value="ingreso">Ingreso (Entrada)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Monto *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) =>
                  setFormData({ ...formData, monto: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Concepto / Motivo *
            </label>
            <Input
              value={formData.concepto}
              onChange={(e) =>
                setFormData({ ...formData, concepto: e.target.value })
              }
              placeholder="Ej. Compra de papelería"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Referencia (Opcional)
            </label>
            <Input
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
              placeholder="Folio de ticket..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="mr-2"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Registrar Movimiento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
