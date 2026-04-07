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
} from "lucide-react";
import { ReceivableInvoice } from "@/features/receivables/types";
import { cn } from "@/lib/utils";

interface ClientRegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: ReceivableInvoice[]; // AHORA RECIBE MÚLTIPLES FACTURAS
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
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    metodoPago: "03", // 03 = Transferencia Electrónica
    referencia: "",
    cuenta_deposito: "",
  });

  // Estado para llevar el control de cuánto se abona a CADA factura
  const [abonos, setAbonos] = useState<Record<number, number>>({});
  const [error, setError] = useState("");

  // Reiniciar montos cuando se abre el modal o cambian las facturas
  useEffect(() => {
    if (open && invoices.length > 0) {
      const initialAbonos: Record<number, number> = {};
      invoices.forEach((inv) => {
        // Por defecto, sugerimos liquidar el total del saldo pendiente
        initialAbonos[inv.id] = inv.saldo_pendiente;
      });
      setAbonos(initialAbonos);
      setFormData((prev) => ({
        ...prev,
        fecha: new Date().toISOString().split("T")[0],
        referencia: "",
      }));
      setError("");
    }
  }, [invoices, open]);

  // Calculamos el Gran Total a Recibir
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

    // Validar que no estemos cobrando de más en ninguna factura
    for (const inv of invoices) {
      const abono = abonos[inv.id] || 0;
      if (abono > inv.saldo_pendiente) {
        setError(
          `El abono en la factura ${inv.folio_interno} excede su saldo pendiente.`,
        );
        return;
      }
    }

    // 🎯 ESTRUCTURAMOS EL PAYLOAD EXACTO PARA EL NUEVO ENDPOINT DEL BACKEND
    const payloadPagos = invoices
      .filter((inv) => (abonos[inv.id] || 0) > 0)
      .map((inv) => ({
        invoice_id: inv.id,
        monto_pagado: abonos[inv.id],
      }));

    const payloadBackend = {
      client_id: clientId || invoices[0]?.client_id, // Usamos el ID del cliente
      pagos: payloadPagos,
      forma_pago: formData.metodoPago,
      fecha_pago: formData.fecha,
      referencia: formData.referencia,
      cuenta_deposito: formData.cuenta_deposito,
    };

    await onSubmit(payloadBackend);
  };

  if (!open || invoices.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !isSubmitting && onOpenChange(val)}
    >
      <DialogContent className="sm:max-w-[700px] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <DialogHeader className="p-6 sm:p-8 bg-brand-navy border-b border-brand-navy/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                <Layers className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">
                  Cobro Múltiple y REP
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                  Cliente: {clientName}
                </DialogDescription>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">
                Total a Recibir
              </p>
              <p className="text-3xl font-black text-white font-mono tracking-tighter drop-shadow-md">
                $
                {granTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CUERPO DEL MODAL (Scrollable) */}
        <ScrollArea className="flex-1 p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
          <div className="space-y-6">
            {/* CONFIGURACIÓN DEL PAGO */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Datos de la Transacción
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    <Calendar className="inline h-3 w-3 mr-1" /> Fecha de Pago *
                  </Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
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
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 font-bold text-xs border-slate-200 dark:border-white/10">
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
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    Ref. / Operación
                  </Label>
                  <Input
                    placeholder="Opcional..."
                    value={formData.referencia}
                    onChange={(e) =>
                      setFormData({ ...formData, referencia: e.target.value })
                    }
                    className="h-10 text-sm bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* LISTA DE FACTURAS SELECCIONADAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Desglose de Facturas a
                  Pagar ({invoices.length})
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
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-white dark:bg-slate-800 transition-colors shadow-sm",
                        exceeds
                          ? "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/20"
                          : "border-slate-200 dark:border-white/10",
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight text-sm">
                            {inv.folio_interno}
                          </span>
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded uppercase tracking-widest">
                            UUID: {inv.uuid ? inv.uuid.slice(0, 8) : "SIN UUID"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Saldo actual:{" "}
                          <span className="font-mono text-slate-700 dark:text-slate-200">
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
                            "pl-8 font-mono font-black text-right shadow-inner",
                            exceeds
                              ? "border-rose-300 text-rose-600 bg-white"
                              : "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/30",
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

        {/* FOOTER TOTALES Y ACCIÓN */}
        <DialogFooter className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="sm:hidden w-full text-center mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Total a Recibir
            </p>
            <p className="text-2xl font-black text-emerald-600 font-mono">
              ${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 haptic-press h-12 px-8"
            disabled={isSubmitting || granTotal <= 0}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? "Timbrando REP..." : "Timbrar Complemento de Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
