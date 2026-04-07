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
  // Cambiamos ID a number para coincidir con la base de datos
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-none shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy dark:text-white text-xl font-black uppercase tracking-tighter">
            <Package className="h-6 w-6 text-emerald-500" />
            Recibir Orden
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Confirma la recepción física de los productos o servicios del folio{" "}
            <span className="font-mono font-bold text-brand-navy dark:text-blue-400">
              {order.folio}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Resumen de Orden */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Proveedor
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {order.supplier_name || "Proveedor General"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Total Orden
              </span>
              <span className="text-sm font-mono font-black text-brand-navy dark:text-blue-400">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Lista de Ítems */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                Ítems / Servicios a verificar:
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-[11px] p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-lg font-bold uppercase"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.descripcion}
                    </span>
                    <span className="text-brand-navy dark:text-blue-400">
                      {item.cantidad} {item.unidad || "PZ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="dark:opacity-10" />

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
                className="text-sm font-black text-brand-navy dark:text-blue-300 leading-none cursor-pointer"
              >
                ¿RECEPCIÓN COMPLETA?
              </label>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
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
            <Label className="text-[10px] font-black uppercase text-slate-500">
              Comentarios de Almacén
            </Label>
            <Textarea
              placeholder="Ej: Se reciben 4 llantas pero una presenta defecto en ceja..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="bg-white dark:bg-slate-900 rounded-xl resize-none text-xs font-medium"
            />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReceive}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirmar Recepción
          </Button>
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
  // Cambiamos a number para coincidir con el backend
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

    // Navegación con parámetros enriquecidos para pre-llenado en la pantalla de Cuentas por Pagar
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-none shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy dark:text-white text-xl font-black uppercase tracking-tighter">
            <ArrowRight className="h-6 w-6 text-blue-600" />
            Convertir a Cuenta por Pagar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Al convertir esta orden a <strong>CxP</strong>, se habilitará el
            registro contable. Te redirigiremos al formulario de facturas con
            los datos pre-cargados. Solo faltará ingresar el UUID y adjuntar el
            XML.
          </p>

          <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl space-y-4 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Orden Origen
              </span>
              <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
                {order.folio}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Proveedor
              </span>
              <span className="text-sm font-bold text-blue-900 dark:text-blue-200">
                {order.supplier_name || "General"}
              </span>
            </div>
            <Separator className="bg-blue-200 dark:bg-blue-800" />
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Monto a Provisionar
              </span>
              <span className="font-mono font-black text-blue-900 dark:text-blue-100 text-2xl tracking-tighter">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] space-y-2 border border-slate-100 dark:border-white/5">
            <p className="font-black text-slate-500 uppercase tracking-widest">
              Próximos pasos:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400 font-bold ml-1">
              <li>
                Seleccionar la <strong>Clasificación Financiera</strong>
              </li>
              <li>Ingresar el UUID de la factura del proveedor</li>
              <li>Subir PDF y XML de la factura</li>
              <li>Programar el pago según días de crédito</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConvert}
            className="bg-brand-navy hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-lg"
          >
            Ir a Registrar Factura
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
