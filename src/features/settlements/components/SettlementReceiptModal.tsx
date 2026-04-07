// src/features/settlements/components/SettlementReceiptModal.tsx

import {
  Receipt,
  CheckCircle,
  Download,
  Printer,
  User,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { TripSettlement } from "../types";

interface SettlementReceiptModalProps {
  open: boolean;
  onClose: () => void;
  settlement: TripSettlement;
  authorizationDate: string;
  authorizationUser: string;
}

export function SettlementReceiptModal({
  open,
  onClose,
  settlement,
  authorizationDate,
  authorizationUser,
}: SettlementReceiptModalProps) {
  // Helper para formato de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // Separar ingresos y deducciones del arreglo de conceptos
  const ingresos =
    settlement.conceptos?.filter((c) => c.tipo === "ingreso") || [];
  const deducciones =
    settlement.conceptos?.filter((c) => c.tipo === "deduccion") || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-2">
          <DialogTitle className="flex items-center gap-2 text-brand-navy dark:text-white text-xl font-black uppercase tracking-tighter">
            <Receipt className="h-6 w-6 text-emerald-500" />
            Recibo de Liquidación
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
            Comprobante de pago autorizado para la operación logística.
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Content - Estilo "Ticket" */}
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Receipt className="h-32 w-32 rotate-12" />
          </div>

          {/* Header del Recibo */}
          <div className="text-center border-b border-slate-100 dark:border-white/5 pb-6">
            <div className="bg-brand-navy dark:bg-white inline-block p-2 rounded-lg mb-3">
              <img
                src="/logo-white.svg"
                alt="3T Logistics"
                className="h-5 dark:invert"
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
              Sistema de Gestión de Transporte
            </p>
            <Badge className="mt-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 px-4 py-1 rounded-full font-black text-[10px] tracking-widest">
              <CheckCircle className="h-3 w-3 mr-1.5" />
              LIQUIDADO / POSTEADO
            </Badge>
          </div>

          {/* Información del Viaje - Grid de 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                  Folio Viaje
                </span>
                <span className="font-mono font-bold text-brand-navy dark:text-blue-400 text-base">
                  #{settlement.trip_id}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                  Operador
                </span>
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {settlement.operador_nombre}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                  Unidad Asignada
                </span>
                <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  ECO-{settlement.unidad_numero}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                  Ruta Operativa
                </span>
                <div className="flex items-center gap-2 font-bold text-foreground truncate">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {settlement.ruta}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                  Fecha de Viaje
                </span>
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {settlement.fecha_viaje}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                  Distancia Recorrida
                </span>
                <div className="font-bold text-foreground ml-5">
                  {(settlement.kms_recorridos || 0).toLocaleString()} km
                </div>
              </div>
            </div>
          </div>

          <Separator className="dark:bg-white/5" />

          {/* Sección de Ingresos */}
          <div>
            <h3 className="font-black text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-widest text-[11px]">
              <DollarSign className="h-4 w-4" /> Percepciones / Ingresos
            </h3>
            <div className="space-y-3 px-2">
              {ingresos.map((concepto) => (
                <div
                  key={concepto.id}
                  className="flex justify-between text-sm items-center group"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground uppercase text-xs">
                      {concepto.descripcion}
                    </span>
                    {concepto.referencia && (
                      <span className="text-slate-500 text-[10px] italic">
                        Ref: {concepto.referencia}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(concepto.monto)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">
                  SUBTOTAL INGRESOS
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                  {formatCurrency(settlement.total_ingresos)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="dark:bg-white/5" />

          {/* Sección de Deducciones */}
          <div>
            <h3 className="font-black text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2 uppercase tracking-widest text-[11px]">
              <DollarSign className="h-4 w-4" /> Deducciones / Retenciones
            </h3>
            <div className="space-y-3 px-2">
              {deducciones.map((concepto) => (
                <div
                  key={concepto.id}
                  className="flex justify-between text-sm items-center"
                >
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "font-bold uppercase text-xs",
                        concepto.categoria === "combustible"
                          ? "text-rose-600"
                          : "text-foreground",
                      )}
                    >
                      {concepto.descripcion}
                    </span>
                    {concepto.referencia && (
                      <span className="text-slate-500 text-[10px] italic">
                        Ref: {concepto.referencia}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{formatCurrency(concepto.monto)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">
                  SUBTOTAL DEDUCCIONES
                </span>
                <span className="font-mono text-rose-600 dark:text-rose-400 text-lg">
                  -{formatCurrency(settlement.total_deducciones)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="bg-brand-navy dark:bg-slate-800 rounded-2xl p-6 text-white shadow-xl ring-4 ring-slate-50 dark:ring-slate-900">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70">
                    NETO TOTAL A PAGAR
                  </span>
                  <p className="text-[10px] text-white/50 font-medium">
                    Autorizado el {authorizationDate} por {authorizationUser}
                  </p>
                </div>
                <span className="text-4xl font-black font-mono tracking-tighter">
                  {formatCurrency(settlement.neto_a_pagar)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer del recibo */}
          <div className="text-center text-[10px] text-muted-foreground/60 pt-8 border-t border-dashed border-border space-y-2">
            <p className="font-medium">
              Este documento es un comprobante interno de liquidación. La
              validez legal reside en la factura CFDI correspondiente.
            </p>
            <p className="font-black flex items-center justify-center gap-2 uppercase tracking-widest">
              © {new Date().getFullYear()} 3T Logistics TMS
            </p>
          </div>
        </div>

        {/* Botonera de Acciones */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 p-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl text-muted-foreground border-border font-bold text-xs uppercase tracking-widest h-11"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl text-muted-foreground border-border font-bold text-xs uppercase tracking-widest h-11"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button
            onClick={onClose}
            className="rounded-xl bg-brand-navy hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest h-11 px-10 shadow-lg transition-all active:scale-95"
          >
            Finalizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
