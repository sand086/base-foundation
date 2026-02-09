import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, DollarSign, AlertCircle, Upload } from "lucide-react";
import { ReceivableInvoice, InvoicePayment } from "./types";
import { bankAccountsDestino } from "./data";

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ReceivableInvoice | null;
  onSubmit: (invoiceId: string, payment: Omit<InvoicePayment, "id">) => void;
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
    cuentaDestino: "",
    referencia: "",
    comprobanteUrl: "",
    requiereREP: false,
  });

  const [error, setError] = useState("");

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        monto: invoice.saldoPendiente,
        cuentaDestino: "",
        referencia: "",
        comprobanteUrl: "",
        requiereREP: false,
      });
      setError("");
    }
  }, [invoice, open]);

  if (!invoice) return null;

  const handleSubmit = () => {
    // Validate amount
    if (formData.monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    if (formData.monto > invoice.saldoPendiente) {
      setError(
        `El monto no puede exceder el saldo pendiente ($${invoice.saldoPendiente.toLocaleString("es-MX")})`,
      );
      return;
    }

    if (!formData.cuentaDestino) {
      setError("Debe seleccionar una cuenta de destino");
      return;
    }

    const account = bankAccountsDestino.find(
      (a) => a.id === formData.cuentaDestino,
    );

    onSubmit(invoice.id, {
      fecha: formData.fecha,
      monto: formData.monto,
      cuentaDestino: account?.name || formData.cuentaDestino,
      referencia: formData.referencia,
      comprobanteUrl: formData.comprobanteUrl,
      requiereREP: formData.requiereREP,
      estatusREP: formData.requiereREP ? "pendiente" : "no_aplica",
    });

    onOpenChange(false);
  };

  const remainingAfterPayment = invoice.saldoPendiente - formData.monto;
  const willBeFullyPaid = remainingAfterPayment === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <CreditCard className="h-5 w-5" />
            Registrar Cobro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Invoice Summary */}
          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Factura</p>
                <p className="font-medium">{invoice.folio}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Client</p>
                <p className="font-medium truncate">{invoice.cliente}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Monto Total</p>
                <p className="font-medium">
                  ${invoice.montoTotal.toLocaleString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Saldo Pendiente</p>
                <p className="font-bold text-amber-700">
                  ${invoice.saldoPendiente.toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha de Cobro
            </Label>
            <Input
              type="date"
              value={formData.fecha}
              onChange={(e) =>
                setFormData({ ...formData, fecha: e.target.value })
              }
              className="h-10"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Monto Recibido <span className="text-status-danger">*</span>
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.monto || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  monto: parseFloat(e.target.value) || 0,
                });
                setError("");
              }}
              className="h-10 text-lg font-medium"
              max={invoice.saldoPendiente}
            />
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, monto: invoice.saldoPendiente })
                }
                className="text-brand-navy hover:underline"
              >
                Cobrar saldo completo
              </button>
              <span className="text-muted-foreground">
                Máximo: ${invoice.saldoPendiente.toLocaleString("es-MX")}
              </span>
            </div>
          </div>

          {/* Bank Account */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cuenta de Destino <span className="text-status-danger">*</span>
            </Label>
            <Select
              value={formData.cuentaDestino}
              onValueChange={(value) => {
                setFormData({ ...formData, cuentaDestino: value });
                setError("");
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {bankAccountsDestino.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="font-medium">{account.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ****{account.lastDigits}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Referencia / Número de Operación
            </Label>
            <Input
              placeholder="Ej: TRF-2025-001"
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
              className="h-10"
            />
          </div>

          {/* Comprobante Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Upload className="h-3 w-3 inline mr-1" />
              Comprobante de Pago (Imagen/PDF)
            </Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              className="h-10"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFormData({ ...formData, comprobanteUrl: file.name });
                }
              }}
            />
            {formData.comprobanteUrl && (
              <p className="text-xs text-muted-foreground">
                📎 {formData.comprobanteUrl}
              </p>
            )}
          </div>

          {/* REP Checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded border border-amber-200">
            <Checkbox
              id="requiereREP"
              checked={formData.requiereREP}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, requiereREP: checked as boolean })
              }
            />
            <label
              htmlFor="requiereREP"
              className="text-sm font-medium text-amber-800 cursor-pointer"
            >
              ¿Requiere Complemento de Pago (REP)?
            </label>
          </div>

          {/* Payment Preview */}
          {formData.monto > 0 && (
            <div
              className={`p-3 rounded-lg border ${willBeFullyPaid ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Saldo después del cobro:
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

          {/* Error Message */}
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
            disabled={formData.monto <= 0 || !formData.cuentaDestino}
          >
            Confirmar Cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
