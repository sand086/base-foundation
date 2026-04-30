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
  Info,
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const ingresos =
    settlement.conceptos?.filter((c) => c.tipo === "ingreso") || [];
  const deducciones =
    settlement.conceptos?.filter((c) => c.tipo === "deduccion") || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
              <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Recibo de Liquidación
              </DialogTitle>
              <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Comprobante de pago autorizado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-6 mt-4">
          <div className="p-5 border-2 border-dashed border-border rounded-2xl bg-card shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Receipt className="h-32 w-32 rotate-12" />
            </div>

            <div className="text-center border-b border-border pb-6">
              <div className="bg-foreground inline-block p-2 rounded-lg mb-3">
                <img
                  src="/logo-white.svg"
                  alt="3T Logistics"
                  className="h-5 dark:invert"
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Sistema de Gestión de Transporte
              </p>
              <Badge className="mt-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 px-4 py-1 rounded-full font-black text-[10px] tracking-widest">
                <CheckCircle className="h-3 w-3 mr-1.5" />
                LIQUIDADO / POSTEADO
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm p-5 rounded-2xl bg-muted/50 border border-border">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Lote de Liquidación
                  </span>
                  <span className="font-mono font-bold text-primary text-base">
                    {/* Si liquida a un patiero, mostrará el Batch ID */}#
                    {settlement.trip_id || settlement.id}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Operador
                  </span>
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {settlement.operador_nombre}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Unidad Asignada
                  </span>
                  <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    ECO-{settlement.unidad_numero || "VARIAS"}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Ruta Principal
                  </span>
                  <div className="flex items-center gap-2 font-bold text-foreground truncate">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {settlement.ruta || "Múltiples Tramos Locales"}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Fecha
                  </span>
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {settlement.fecha_viaje || authorizationDate}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Distancia Recorrida
                  </span>
                  <div className="font-bold text-foreground ml-5">
                    {(settlement.kms_recorridos || 0).toLocaleString()} km
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* SECCIÓN DESGLOSADA: TICKET 1 PATIEROS */}
            <div>
              <h3 className="font-black text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                <DollarSign className="h-4 w-4" /> Percepciones / Movimientos
                Realizados
              </h3>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg mb-4 flex items-start gap-2 border border-blue-100 dark:border-blue-900/30">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium">
                  El operador recibirá la suma del detalle operativo listado a
                  continuación.
                </p>
              </div>

              <div className="space-y-3 px-2">
                {ingresos.map((concepto) => (
                  <div
                    key={concepto.id}
                    className="flex justify-between text-sm items-center group py-1.5 border-b border-dashed border-slate-100 dark:border-white/5 last:border-0"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground uppercase text-xs">
                        {concepto.descripcion}
                      </span>
                      {concepto.referencia && (
                        <span className="text-muted-foreground text-[10px] font-mono">
                          Ref / Viaje: {concepto.referencia}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(concepto.monto)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between font-black pt-4 border-t-2 border-border mt-4">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-widest mt-1">
                    SUBTOTAL INGRESOS
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                    {formatCurrency(settlement.total_ingresos)}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            <div>
              <h3 className="font-black text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                <DollarSign className="h-4 w-4" /> Deducciones / Retenciones
              </h3>
              <div className="space-y-3 px-2">
                {deducciones.map((concepto) => (
                  <div
                    key={concepto.id}
                    className="flex justify-between text-sm items-center py-1"
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
                        <span className="text-muted-foreground text-[10px] italic">
                          Ref: {concepto.referencia}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(concepto.monto)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-black pt-4 border-t-2 border-border mt-4">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-widest mt-1">
                    SUBTOTAL DEDUCCIONES
                  </span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-lg">
                    -{formatCurrency(settlement.total_deducciones)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="bg-foreground rounded-2xl p-6 text-background shadow-xl ring-4 ring-background">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70">
                      NETO TOTAL A PAGAR
                    </span>
                    <p className="text-[10px] opacity-50 font-medium">
                      Autorizado el {authorizationDate} por {authorizationUser}
                    </p>
                  </div>
                  <span className="text-4xl font-black font-mono tracking-tighter">
                    {formatCurrency(settlement.neto_a_pagar)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-muted-foreground pt-8 border-t border-dashed border-border space-y-2">
              <p className="font-medium">
                Este documento es un comprobante interno de liquidación. La
                validez legal reside en la factura CFDI correspondiente.
              </p>
              <p className="font-black flex items-center justify-center gap-2 uppercase tracking-widest">
                © {new Date().getFullYear()} 3T Logistics TMS
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              variant="outline"
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px] gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px] gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              onClick={onClose}
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              Finalizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
