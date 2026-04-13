import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
    orderId: number,
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
    await onReceive(Number(order.id), recepcionCompleta, notas);
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
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-lg p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
              <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Recibir Orden
              </DialogTitle>
              <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Folio{" "}
                <span className="font-mono text-foreground">{order.folio}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-5">
          {/* Resumen de Orden */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Proveedor
              </span>
              <span className="text-sm font-bold text-foreground">
                {order.supplier_name || "Proveedor General"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Total Orden
              </span>
              <span className="text-sm font-mono font-black text-primary">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Lista de Ítems */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Ítems / Servicios a verificar:
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-[11px] p-2 bg-card border border-border rounded-lg font-bold uppercase"
                  >
                    <span className="text-foreground">
                      {item.descripcion}
                    </span>
                    <span className="text-primary">
                      {item.cantidad} {item.unidad || "PZ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-border" />

          {/* Confirmación de Recepción */}
          <div className="flex items-start space-x-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <Checkbox
              id="completo"
              checked={recepcionCompleta}
              onCheckedChange={(c) => setRecepcionCompleta(c === true)}
              className="mt-1"
            />
            <div className="grid gap-1">
              <label
                htmlFor="completo"
                className="text-sm font-black text-primary leading-none cursor-pointer"
              >
                ¿RECEPCIÓN COMPLETA?
              </label>
              <p className="text-[10px] text-muted-foreground font-medium leading-tight">
                Marca esta casilla si todo llegó en buen estado y según las
                cantidades solicitadas.
              </p>
            </div>
          </div>

          {!recepcionCompleta && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-400">
                  <p className="font-black uppercase">
                    Recepción Parcial / Dañada
                  </p>
                  <p className="font-medium opacity-80">
                    Por favor, detalla los motivos en el campo de notas abajo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Comentarios de Almacén
            </Label>
            <Textarea
              placeholder="Ej: Se reciben 4 llantas pero una presenta defecto en ceja..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="rounded-xl resize-none text-xs font-medium shadow-sm"
            />
          </div>
        </div>

        {/* CAPA 5: FOOTER */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
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
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Recepción
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
  onConvert: (orderId: number) => void;
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
    onConvert(Number(order.id));
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
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-lg p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
              <ArrowRight className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Convertir a CxP
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Registro contable de factura
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-5">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Al convertir esta orden a <strong className="text-foreground">CxP</strong>, se habilitará el
            registro contable. Te redirigiremos al formulario de facturas con
            los datos pre-cargados. Solo faltará ingresar el UUID y adjuntar el
            XML.
          </p>

          <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl space-y-4 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Orden Origen
              </span>
              <span className="font-mono font-bold text-foreground">
                {order.folio}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Proveedor
              </span>
              <span className="text-sm font-bold text-foreground">
                {order.supplier_name || "General"}
              </span>
            </div>
            <Separator className="bg-blue-200 dark:bg-blue-800" />
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Monto a Provisionar
              </span>
              <span className="font-mono font-black text-foreground text-2xl tracking-tighter">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm text-[11px] space-y-2">
            <p className="font-black text-muted-foreground uppercase tracking-widest">
              Próximos pasos:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-foreground font-bold ml-1">
              <li>
                Seleccionar la <strong>Clasificación Financiera</strong>
              </li>
              <li>Ingresar el UUID de la factura del proveedor</li>
              <li>Subir PDF y XML de la factura</li>
              <li>Programar el pago según días de crédito</li>
            </ol>
          </div>
        </div>

        {/* CAPA 5: FOOTER */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
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
              onClick={handleConvert}
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              Ir a Registrar Factura
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
