import { useState, useEffect, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  Loader2,
  Landmark,
} from "lucide-react";
import { ReceivableInvoice } from "@/features/receivables/types";
import { cn } from "@/lib/utils";

// Importamos el hook para traer las cuentas bancarias reales
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";

interface ClientRegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: ReceivableInvoice[];
  clientName?: string;
  clientId?: number;
  onSubmit: (payload: any) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ClientRegisterPaymentModal({
  open,
  onOpenChange,
  invoices,
  clientName = "Cliente",
  clientId,
  onSubmit,
  isSubmitting = false,
}: ClientRegisterPaymentModalProps) {
  // Traemos las cuentas bancarias directamente al modal
  const { bankAccounts = [] } = useBankAccounts();
  const cuentasActivas = useMemo(
    () => bankAccounts.filter((acc) => acc.estatus === "activo"),
    [bankAccounts],
  );

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    metodoPago: "03",
    referencia: "",
    cuenta_deposito: "", // Inicializado correctamente como string vacío
  });

  const [abonos, setAbonos] = useState<Record<number, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && invoices.length > 0) {
      const initialAbonos: Record<number, number> = {};
      invoices.forEach((inv) => {
        initialAbonos[inv.id] = inv.saldo_pendiente;
      });
      setAbonos(initialAbonos);
      setFormData((prev) => ({
        ...prev,
        fecha: new Date().toISOString().split("T")[0],
        referencia: "",
        cuenta_deposito: "", // Limpiamos la cuenta al abrir
      }));
      setError("");
    }
  }, [invoices, open]);

  const granTotal = useMemo(() => {
    return Object.values(abonos).reduce((sum, val) => sum + (val || 0), 0);
  }, [abonos]);

  const handleAbonoChange = (id: number, value: string) => {
    const val = parseFloat(value) || 0;
    setAbonos((prev) => ({ ...prev, [id]: val }));
    setError("");
  };

  const handleSubmit = async () => {
    if (granTotal <= 0) {
      setError("El total a cobrar debe ser mayor a $0.00");
      return;
    }

    // VALIDACIÓN CRÍTICA: Exigir cuenta bancaria
    if (!formData.cuenta_deposito) {
      setError("Debes seleccionar una Cuenta Bancaria de depósito.");
      return;
    }

    for (const inv of invoices) {
      const abono = abonos[inv.id] || 0;
      if (abono > inv.saldo_pendiente) {
        setError(
          `El abono en la factura ${inv.folio_interno} excede su saldo pendiente.`,
        );
        return;
      }
    }

    const finalClientId = clientId || invoices[0]?.client_id;

    if (!finalClientId) {
      setError(
        "Error interno: No se pudo identificar el ID del cliente. Refresca la tabla.",
      );
      return;
    }

    const payloadPagos = invoices
      .filter((inv) => (abonos[inv.id] || 0) > 0)
      .map((inv) => ({
        invoice_id: Number(inv.id),
        monto_pagado: Number(abonos[inv.id]),
      }));

    const payloadBackend = {
      client_id: Number(finalClientId),
      pagos: payloadPagos,
      forma_pago: formData.metodoPago,
      fecha_pago: formData.fecha,
      referencia: formData.referencia,
      // 🚀 FIX APLICADO: Lo forzamos a String para evitar el Error 422 de Pydantic
      cuenta_deposito: String(formData.cuenta_deposito),
    };

    await onSubmit(payloadBackend);
  };

  if (!open || invoices.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !isSubmitting && onOpenChange(val)}
    >
      <DialogContent className="w-[95vw] sm:max-w-4xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
                <Layers className="h-6 w-6 text-emerald-600 dark:text-emerald-400 drop-shadow-md" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  Cobro Múltiple y REP
                </DialogTitle>
                <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  Cliente: {clientName}
                </DialogDescription>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                Total a Recibir
              </p>
              <p className="text-3xl font-black text-foreground font-mono tracking-tighter drop-shadow-md">
                $
                {granTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/50 dark:bg-transparent custom-scrollbar mt-4">
          <div className="space-y-6">
            <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />{" "}
                Datos de la Transacción
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Calendar className="inline h-3 w-3 mr-1" /> Fecha de Pago *
                  </Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    className="h-11 shadow-sm font-mono font-bold bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <CreditCard className="inline h-3 w-3 mr-1" /> Forma de Pago
                    *
                  </Label>
                  <Select
                    value={formData.metodoPago}
                    onValueChange={(v) =>
                      setFormData({ ...formData, metodoPago: v })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11 shadow-sm font-bold text-xs bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="03">03 - Transferencia</SelectItem>
                      <SelectItem value="01">01 - Efectivo</SelectItem>
                      <SelectItem value="02">02 - Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Landmark className="inline h-3 w-3 mr-1" /> Cuenta Destino
                    *
                  </Label>
                  <Select
                    value={formData.cuenta_deposito}
                    onValueChange={(v) =>
                      setFormData({ ...formData, cuenta_deposito: v })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-11 shadow-sm font-bold text-xs bg-card border-slate-200",
                        !formData.cuenta_deposito &&
                          "border-rose-300 ring-1 ring-rose-200",
                      )}
                    >
                      <SelectValue placeholder="Selecciona banco..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasActivas.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.alias} ({acc.numero_cuenta.slice(-4)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Ref. / Operación
                  </Label>
                  <Input
                    placeholder="Opcional..."
                    value={formData.referencia}
                    onChange={(e) =>
                      setFormData({ ...formData, referencia: e.target.value })
                    }
                    className="h-11 shadow-sm text-sm font-bold uppercase bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />{" "}
                  Desglose de Facturas a Pagar ({invoices.length})
                </h4>
              </div>

              <div className="space-y-2">
                {invoices.map((inv) => {
                  const saldo = inv.saldo_pendiente;
                  const abonoActual = abonos[inv.id] || 0;
                  const exceeds = abonoActual > saldo;

                  return (
                    <div
                      key={inv.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card transition-colors shadow-sm",
                        exceeds
                          ? "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/20"
                          : "border-slate-200 dark:border-white/10",
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-foreground uppercase tracking-tight text-sm">
                            {inv.folio_interno}
                          </span>
                          <span className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded uppercase tracking-widest">
                            UUID: {inv.uuid ? inv.uuid.slice(0, 8) : "SIN UUID"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">
                          Saldo actual:{" "}
                          <span className="font-mono text-foreground">
                            $
                            {saldo.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </p>
                      </div>

                      <div className="w-full sm:w-40 relative shrink-0">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 absolute -top-5 right-0 hidden sm:block">
                          Abono
                        </Label>
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                        <Input
                          type="number"
                          value={abonos[inv.id] === 0 ? "" : abonos[inv.id]}
                          onChange={(e) =>
                            handleAbonoChange(inv.id, e.target.value)
                          }
                          className={cn(
                            "pl-8 font-mono font-black text-right shadow-inner h-11",
                            exceeds
                              ? "border-rose-300 text-rose-600"
                              : "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
                          )}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-black uppercase tracking-widest p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/50 animate-in zoom-in-95">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 sm:p-8 bg-muted/50 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
          <div className="sm:hidden w-full text-center mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total a Recibir
            </p>
            <p className="text-2xl font-black text-emerald-600 font-mono">
              ${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px] h-12 px-8"
              disabled={isSubmitting || granTotal <= 0}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isSubmitting
                ? "Timbrando REP..."
                : "Timbrar Complemento de Pago"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
