// src/features/cierre/TripSettlementModal.tsx
import React, { useState, useMemo } from "react";
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  FileText,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";

// ==========================================
// INTERFAZ
// ==========================================
export interface TripSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Props para un solo tramo (desde TripPlanner)
  leg?: TripLeg | null;
  tripPadre?: Trip | null;
  // Props para múltiples tramos (desde CierreViajePage)
  selectedLegs?: any[];
  onSuccess?: () => void;
}

export default function TripSettlementModal({
  open,
  onOpenChange,
  leg,
  tripPadre,
  selectedLegs = [],
  onSuccess,
}: TripSettlementModalProps) {
  const { updateTripStatus } = useTrips();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // ESTADOS FINANCIEROS
  // ==========================================
  const [sueldoBase, setSueldoBase] = useState<number | "">("");
  const [bonos, setBonos] = useState<number | "">("");
  const [maniobras, setManiobras] = useState<number | "">("");
  const [descuentos, setDescuentos] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");

  // ==========================================
  // UNIFICAR DATOS (Individual o Múltiple)
  // ==========================================
  const activeLegs = useMemo(() => {
    if (selectedLegs.length > 0) return selectedLegs;
    if (leg && tripPadre) return [{ ...leg, trip: tripPadre }];
    return [];
  }, [leg, tripPadre, selectedLegs]);

  // ==========================================
  // CÁLCULOS AUTOMÁTICOS
  // ==========================================
  const sumViaticos = activeLegs.reduce(
    (sum, item) => sum + (Number(item.anticipo_viaticos) || 0),
    0,
  );
  const sumCasetas = activeLegs.reduce(
    (sum, item) => sum + (Number(item.anticipo_casetas) || 0),
    0,
  );
  const totalAnticipos = sumViaticos + sumCasetas;

  const totalPercepciones =
    (Number(sueldoBase) || 0) + (Number(bonos) || 0) + (Number(maniobras) || 0);
  const totalDeducciones = (Number(descuentos) || 0) + totalAnticipos;
  const totalNeto = totalPercepciones - totalDeducciones;

  const operatorName =
    activeLegs[0]?.operator?.name || activeLegs[0]?.operatorName || "Operador";

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleClose = () => {
    onOpenChange(false);
    // Limpiar formulario al cerrar
    setSueldoBase("");
    setBonos("");
    setManiobras("");
    setDescuentos("");
    setObservaciones("");
  };

  const handleSettle = async () => {
    if (activeLegs.length === 0) return;

    try {
      setIsSubmitting(true);

      // Aquí iteramos para cambiar el estatus de los viajes a "liquidado"
      for (const item of activeLegs) {
        const tripId = item.trip?.id || item.trip_id;
        if (!tripId) continue;

        // Llamada real al hook (Ajusta el estatus exacto según tu API)
        await updateTripStatus(
          String(tripId),
          "cerrado",
          `Liquidación generada: ${observaciones}`,
        );
      }

      toast.success("Liquidación procesada correctamente");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      toast.error("Error al procesar la liquidación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 rounded-2xl">
        {/* HEADER */}
        <div className="bg-brand-navy p-6">
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-400" /> Liquidación de
            Operador
          </DialogTitle>
          <DialogDescription className="text-slate-300 mt-1 text-sm font-medium">
            Generando recibo de pago para{" "}
            <strong className="text-white">{operatorName}</strong> (
            {activeLegs.length} movimientos seleccionados)
          </DialogDescription>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQ: RESUMEN DE VIAJES (Ancho 5) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <FileText className="h-4 w-4" /> Detalle de Viajes
            </h3>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-y-auto">
              {activeLegs.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-brand-navy text-sm">
                      {item.trip?.public_id ||
                        `TRP-${item.trip?.id || item.trip_id}`}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-slate-100 text-slate-600 uppercase"
                    >
                      {item.leg_type?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mb-2">
                    {item.trip?.origin} ➔ {item.trip?.destination}
                  </div>

                  {/* Desglose de Anticipos por Viaje */}
                  {(item.anticipo_viaticos > 0 ||
                    item.anticipo_casetas > 0) && (
                    <div className="flex gap-2">
                      {item.anticipo_viaticos > 0 && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Viáticos: $
                          {Number(item.anticipo_viaticos).toLocaleString()}
                        </span>
                      )}
                      {item.anticipo_casetas > 0 && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          Casetas: $
                          {Number(item.anticipo_casetas).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalAnticipos > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <p className="text-xs text-rose-800 font-medium leading-tight">
                  Se detectaron{" "}
                  <strong>${totalAnticipos.toLocaleString()}</strong> en
                  anticipos previos. Este monto será descontado automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* COLUMNA DER: CALCULADORA FINANCIERA (Ancho 7) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
            <div className="grid grid-cols-2 gap-6 flex-1">
              {/* PERCEPCIONES */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b pb-2">
                  Percepciones (+)
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Sueldo / Tarifa Base
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      value={sueldoBase}
                      onChange={(e) =>
                        setSueldoBase(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="pl-7 font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Maniobras Extra
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      value={maniobras}
                      onChange={(e) =>
                        setManiobras(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="pl-7 font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Bonos de Rendimiento
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      value={bonos}
                      onChange={(e) =>
                        setBonos(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="pl-7 font-mono bg-emerald-50/50 border-emerald-200"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* DEDUCCIONES */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b pb-2">
                  Deducciones (-)
                </h4>

                <div className="space-y-1.5 opacity-70">
                  <Label className="text-xs font-bold text-slate-700">
                    Anticipos (Viáticos y Casetas)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      value={totalAnticipos}
                      readOnly
                      className="pl-7 font-mono bg-slate-100 text-rose-600 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Otros Descuentos
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      value={descuentos}
                      onChange={(e) =>
                        setDescuentos(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="pl-7 font-mono bg-rose-50/50 border-rose-200"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Observaciones del pago
                  </Label>
                  <Input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Motivo del descuento/bono..."
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* TOTAL A PAGAR */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Total a Pagar
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Percepciones - Deducciones
                  </span>
                </div>
                <div
                  className={`text-3xl font-black tracking-tighter ${totalNeto < 0 ? "text-rose-600" : "text-brand-navy"}`}
                >
                  $
                  {totalNeto.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACCIONES */}
        <DialogFooter className="bg-white p-4 border-t border-slate-200 flex items-center justify-between sm:justify-between px-6 rounded-b-2xl">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            className="bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-xl px-8"
            onClick={handleSettle}
            disabled={isSubmitting || activeLegs.length === 0}
          >
            {isSubmitting ? (
              "Procesando pago..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Liquidación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
