// src/features/cxc/RegisterPaymentModal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Building2,
  Calendar,
} from "lucide-react";
import { ReceivableInvoice } from "./types";

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ReceivableInvoice | null;
  onSubmit: (invoiceId: string, payment: any) => void;
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  invoice,
  onSubmit,
}: RegisterPaymentModalProps) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    monto: 0,
    metodoPago: "03", // 03 = Transferencia Electrónica
    referencia: "",
  });

  const [error, setError] = useState("");

  // Reiniciar el formulario cuando cambia la factura seleccionada
  useEffect(() => {
    if (invoice) {
      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        monto: invoice.saldo_pendiente, // Por defecto sugerimos pagar todo el saldo
        metodoPago: "03",
        referencia: "",
      });
      setError("");
    }
  }, [invoice, open]);

  if (!invoice) return null;

  const handleSubmit = () => {
    if (formData.monto <= 0) {
      setError("El monto a cobrar debe ser mayor a $0.00");
      return;
    }

    if (formData.monto > invoice.saldo_pendiente) {
      setError(
        `El monto no puede exceder el saldo pendiente ($${invoice.saldo_pendiente.toLocaleString("es-MX")})`,
      );
      return;
    }

    onSubmit(String(invoice.id), {
      fechaPago: formData.fecha,
      monto: formData.monto,
      metodoPago: formData.metodoPago,
      referencia: formData.referencia,
    });
  };

  const remainingAfterPayment = invoice.saldo_pendiente - formData.monto;
  const isPartialPayment = remainingAfterPayment > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-brand-navy dark:text-white uppercase tracking-tighter">
            <CreditCard className="h-6 w-6 text-emerald-600" /> Registrar Cobro
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
            {invoice.folio_interno} • {invoice.cliente}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* RESUMEN DE LA DEUDA */}
          <div className="bg-slate-900 rounded-xl p-4 flex justify-between items-center shadow-inner">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Saldo Pendiente Actual
              </p>
              <p className="text-2xl font-black text-white font-mono">
                $
                {invoice.saldo_pendiente.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
          </div>

          {/* MONTO A COBRAR */}
          <div className="space-y-1.5">
            <Label variant="brand" className="text-emerald-600">
              Monto Recibido (Abono) *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                value={formData.monto || ""}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    monto: parseFloat(e.target.value) || 0,
                  });
                  setError("");
                }}
                className="pl-8 h-12 text-lg font-black font-mono border-emerald-200 bg-emerald-50 focus-visible:ring-emerald-500 text-emerald-700"
              />
            </div>
            <div className="flex justify-between mt-1">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, monto: invoice.saldo_pendiente })
                }
                className="text-[10px] font-bold uppercase text-brand-navy hover:text-blue-600 tracking-widest"
              >
                Liquidar todo el saldo
              </button>
            </div>
          </div>

          {/* PREVIEW DEL SALDO */}
          {formData.monto > 0 && formData.monto <= invoice.saldo_pendiente && (
            <div
              className={`p-3 rounded-xl border ${isPartialPayment ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"} transition-colors`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Nuevo Saldo:
                </span>
                <span
                  className={`font-mono font-black ${isPartialPayment ? "text-amber-700" : "text-emerald-700"}`}
                >
                  $
                  {remainingAfterPayment.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p
                className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isPartialPayment ? "text-amber-600" : "text-emerald-600"}`}
              >
                {isPartialPayment
                  ? "⚠️ Quedará como Pago Parcial"
                  : "✅ La factura quedará Pagada"}
              </p>
            </div>
          )}

          {/* FECHA Y MÉTODO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label variant="brand">
                <Calendar className="inline h-3 w-3 mr-1" /> Fecha
              </Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
                className="h-10 bg-slate-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label variant="brand">
                <Building2 className="inline h-3 w-3 mr-1" /> Método
              </Label>
              <Select
                value={formData.metodoPago}
                onValueChange={(v) =>
                  setFormData({ ...formData, metodoPago: v })
                }
              >
                <SelectTrigger className="h-10 bg-slate-50 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="03">03 - Transferencia</SelectItem>
                  <SelectItem value="01">01 - Efectivo</SelectItem>
                  <SelectItem value="02">02 - Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label variant="brand">Referencia Bancaria (Opcional)</Label>
            <Input
              placeholder="Clave de rastreo o num. de operación"
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
              className="h-10 text-sm bg-slate-50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[11px] font-black uppercase tracking-widest p-3 bg-red-50 rounded-xl border border-red-200 animate-in zoom-in-95">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50/80 border-t border-slate-200">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-black text-[10px] uppercase tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 haptic-press"
            disabled={
              formData.monto <= 0 || formData.monto > invoice.saldo_pendiente
            }
          >
            Confirmar Ingreso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
