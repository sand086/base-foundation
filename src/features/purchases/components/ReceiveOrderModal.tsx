import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Package,
  AlertCircle,
  ArrowRight,
  Loader2,
  DollarSign,
} from "lucide-react";

import { PurchaseOrder } from "@/features/purchases/types";

// ==========================================
// 1. MODAL: RECIBIR ORDEN (Logística/Almacén)
// ==========================================

interface ReceiveOrderModalProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceive: (
    orderId: number | string,
    completo: boolean,
    notas: string,
  ) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ReceiveOrderModal({
  order,
  open,
  onOpenChange,
  onReceive,
  isSubmitting = false,
}: ReceiveOrderModalProps) {
  const [recepcionCompleta, setRecepcionCompleta] = useState(true);
  const [notas, setNotas] = useState("");

  if (!order) return null;

  const handleReceive = async () => {
    await onReceive(order.id, recepcionCompleta, notas);
    setRecepcionCompleta(true);
    setNotas("");
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: order.moneda || "MXN",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg p-0 flex flex-col max-h-[90vh] overflow-hidden border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Recibir Orden
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Folio{" "}
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {order.folio}
                </span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Proveedor
              </span>
              <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                {order.supplier_name || "Proveedor General"}
              </span>
            </div>
            <Separator className="bg-border my-2" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Total Orden
              </span>
              <span className="text-xl font-mono font-black text-brand-navy dark:text-white">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2 block">
                Ítems / Servicios a verificar:
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-[11px] p-3 bg-card border border-border rounded-xl font-bold uppercase shadow-sm"
                  >
                    <span className="text-foreground truncate pr-4">
                      {item.descripcion}
                    </span>
                    <span className="text-brand-navy dark:text-white font-black font-mono bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md">
                      {item.cantidad} {item.unidad || "PZ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 border border-blue-200 dark:border-blue-900/30 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 shadow-sm space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="completo"
                checked={recepcionCompleta}
                onCheckedChange={(c) => setRecepcionCompleta(c === true)}
                className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <div className="grid gap-1.5">
                <label
                  htmlFor="completo"
                  className="text-xs font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest cursor-pointer"
                >
                  Recepción Completa y Correcta
                </label>
                <p className="text-[10px] font-medium text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                  Marca esta casilla si todo llegó en buen estado y según las
                  cantidades solicitadas en la orden.
                </p>
              </div>
            </div>
          </div>

          {!recepcionCompleta && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                  Recepción Parcial / Dañada
                </h4>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                Por favor, detalla los faltantes o mermas en las notas. Esto
                detendrá el pago completo en Finanzas.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Comentarios de Almacén
            </Label>
            <Textarea
              placeholder="Ej: Se reciben 4 llantas pero una presenta defecto en ceja..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="rounded-xl resize-none font-medium shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

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
              onClick={handleReceive}
              disabled={isSubmitting}
              className="w-full sm:w-auto flex-shrink-0 bg-brand-green hover:bg-[hsl(152,100%,24%)] text-white shadow-lg shadow-brand-green/20 border-none haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Ingreso a Almacén
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 2. MODAL: CONVERTIR A CXP (Administración)
// ==========================================

interface ConvertToCxPModalProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (orderId: string | number) => void;
}

export function ConvertToCxPModal({
  order,
  open,
  onOpenChange,
  onConvert,
}: ConvertToCxPModalProps) {
  const navigate = useNavigate();

  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: order.moneda || "MXN",
    }).format(amount);
  };

  const handleConvert = () => {
    onConvert(order.id);
    onOpenChange(false);

    const params = new URLSearchParams({
      from_purchase_order: "true",
      supplier_name: order.supplier_name || "",
      supplier_id: String(order.supplier_id),
      description:
        order.service_description ||
        order.items?.map((i) => i.descripcion).join(", ") ||
        `Orden ${order.folio}`,
      amount: String(order.total),
      order_id: String(order.id),
      order_folio: order.folio,
    });

    navigate(`/finance/payables?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg p-0 flex flex-col max-h-[90vh] overflow-hidden border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
              <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Convertir a CxP
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Transición de Operaciones a Finanzas
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            Al procesar esta orden, se habilitará el registro contable en
            Cuentas por Pagar. El formulario de facturas se auto-llenará con los
            siguientes datos:
          </p>

          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Folio Origen
              </span>
              <span className="font-mono font-black text-brand-navy dark:text-white uppercase tracking-tight">
                {order.folio}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Proveedor Autorizado
              </span>
              <span className="text-xs font-bold text-foreground uppercase tracking-tight">
                {order.supplier_name || "General"}
              </span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Pasivo Estimado a Provisionar
              </span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-2xl tracking-tighter">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          <div className="p-5 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 rounded-r-2xl shadow-sm text-xs space-y-3">
            <p className="font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest text-[10px]">
              Requisitos en el Módulo de Finanzas:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-blue-900/80 dark:text-blue-200/80 font-medium ml-1">
              <li>
                Seleccionar la <b>Clasificación Financiera</b> del Gasto.
              </li>
              <li>
                Ingresar el <b>UUID</b> de la factura enviada por el proveedor.
              </li>
              <li>
                Adjuntar la <b>representación PDF y XML</b> para auditoría.
              </li>
              <li>
                El sistema calculará la fecha límite basada en el crédito del
                proveedor.
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
            >
              Regresar
            </Button>
            <Button
              onClick={handleConvert}
              className="w-full sm:w-auto flex-shrink-0 bg-brand-red hover:bg-brand-red/90 text-white shadow-lg shadow-brand-red/20 border-none haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Ir a Registrar Factura (CxP)
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
