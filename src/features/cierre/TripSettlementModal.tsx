// src/features/cierre/TripSettlementModal.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  FileText,
  User,
  Fuel,
  TrendingUp,
  AlertTriangle,
  History,
  Loader2,
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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";

export interface TripSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leg?: TripLeg | null;
  tripPadre?: Trip | null;
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
  const { updateTripStatus, refreshTrips } = useTrips();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // 🚀 DEFINIDO

  // ==========================================
  // ESTADOS DE CONTROL OPERATIVO (GUSTAVO)
  // ==========================================
  const [odometroFinal, setOdometroFinal] = useState<number | "">("");

  // ==========================================
  // ESTADOS FINANCIEROS
  // ==========================================
  const [sueldoBase, setSueldoBase] = useState<number | "">("");
  const [bonos, setBonos] = useState<number | "">("");
  const [maniobras, setManiobras] = useState<number | "">("");
  const [penalizaciones, setPenalizaciones] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");

  // ==========================================
  // UNIFICAR DATOS
  // ==========================================
  const activeLegs = useMemo(() => {
    if (selectedLegs.length > 0) return selectedLegs;
    if (leg && tripPadre) return [{ ...leg, trip: tripPadre }];
    return [];
  }, [leg, tripPadre, selectedLegs]);

  // Carga inicial de datos
  useEffect(() => {
    if (open && activeLegs.length > 0) {
      const padre = activeLegs[0].trip || tripPadre;
      if (padre?.tarifa_base) {
        setSueldoBase(padre.tarifa_base * 0.1); // 10% sugerido en junta
      }
    }
  }, [open, activeLegs, tripPadre]);

  // ==========================================
  // LÓGICA DE RENDIMIENTO
  // ==========================================
  const kmsRecorridos = useMemo(() => {
    const inicial = Number(activeLegs[0]?.odometro_inicial) || 0;
    if (!odometroFinal || odometroFinal <= inicial) return 0;
    return Number(odometroFinal) - inicial;
  }, [activeLegs, odometroFinal]);

  const totalLitrosCargados = useMemo(() => {
    return activeLegs.reduce((acc, current) => {
      const logs = current.fuel_logs || [];
      return (
        acc + logs.reduce((sum: number, log: any) => sum + (log.litros || 0), 0)
      );
    }, 0);
  }, [activeLegs]);

  const rendimientoReal = useMemo(() => {
    if (kmsRecorridos <= 0 || totalLitrosCargados <= 0) return 0;
    return kmsRecorridos / totalLitrosCargados;
  }, [kmsRecorridos, totalLitrosCargados]);

  const sumAnticipos = activeLegs.reduce(
    (sum, item) =>
      sum +
      (Number(item.anticipo_viaticos) || 0) +
      (Number(item.anticipo_casetas) || 0) +
      (Number(item.otros_anticipos) || 0),
    0,
  );

  const totalPercepciones =
    (Number(sueldoBase) || 0) + (Number(bonos) || 0) + (Number(maniobras) || 0);
  const total_deducciones = (Number(penalizaciones) || 0) + sumAnticipos;
  const totalNeto = totalPercepciones - total_deducciones;

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleClose = () => {
    // 🚀 DEFINIDO
    onOpenChange(false);
    setOdometroFinal("");
    setSueldoBase("");
    setBonos("");
    setManiobras("");
    setPenalizaciones("");
    setObservaciones("");
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshTrips();
    setIsSyncing(false);
    toast.success("Sincronizado con vales de combustible");
  };

  const handleSettle = async () => {
    if (!odometroFinal) return toast.error("El odómetro final es obligatorio");

    try {
      setIsSubmitting(true);
      for (const item of activeLegs) {
        const tripId = item.trip?.id || item.trip_id;
        await updateTripStatus(
          String(tripId),
          "cerrado",
          `Liquidado. Rendimiento: ${rendimientoReal.toFixed(2)} km/l. Obs: ${observaciones}`,
        );
      }
      toast.success("Liquidación completada");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      toast.error("Error al liquidar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-50 rounded-2xl border-none shadow-2xl">
        <div className="bg-brand-navy p-6 flex justify-between items-center text-white">
          <div>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Calculator className="h-6 w-6 text-emerald-400" /> Liquidación
              Operativa
            </DialogTitle>
            <DialogDescription className="text-slate-300 font-bold text-[11px] uppercase mt-1">
              Operador: {activeLegs[0]?.operator?.name || "S/A"}
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            className="bg-white/10 border-white/20 text-white h-9"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <History className="h-4 w-4 mr-2" />
            )}
            Actualizar Vales
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CONTROL DE RENDIMIENTO */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Rendimiento
            </h3>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-500">
                      KM INICIAL
                    </Label>
                    <Input
                      value={activeLegs[0]?.odometro_inicial || 0}
                      readOnly
                      className="bg-slate-50 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-blue-600">
                      KM FINAL *
                    </Label>
                    <Input
                      type="number"
                      value={odometroFinal}
                      onChange={(e) => setOdometroFinal(Number(e.target.value))}
                      className="border-blue-200 font-mono"
                    />
                  </div>
                </div>
                <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-600">
                    Distancia:
                  </span>
                  <span className="text-xl font-black font-mono">
                    {kmsRecorridos} KM
                  </span>
                </div>
                <div
                  className={`p-4 rounded-2xl text-center border-2 ${rendimientoReal < 2.2 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}
                >
                  <p className="text-[9px] font-black uppercase text-slate-600 mb-1">
                    Rendimiento Real
                  </p>
                  <p
                    className={`text-3xl font-black ${rendimientoReal < 2.2 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {rendimientoReal.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    KM/L
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CALCULADORA */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200">
              {/* INGRESOS */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-emerald-600 uppercase border-b pb-1">
                  Percepciones
                </p>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Sueldo Base</Label>
                  <Input
                    type="number"
                    value={sueldoBase}
                    onChange={(e) => setSueldoBase(Number(e.target.value))}
                    className="font-mono h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-emerald-600">
                    Bonos
                  </Label>
                  <Input
                    type="number"
                    value={bonos}
                    onChange={(e) => setBonos(Number(e.target.value))}
                    className="font-mono h-10 bg-emerald-50/20"
                  />
                </div>
              </div>
              {/* EGRESOS */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-rose-600 uppercase border-b pb-1">
                  Deducciones
                </p>
                <div className="p-3 bg-rose-50/50 border border-dashed border-rose-200 rounded-xl">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                    <span>TOTAL ANTICIPOS:</span>
                    <span className="text-rose-600">
                      -${sumAnticipos.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-rose-600">
                    Penalizaciones
                  </Label>
                  <Input
                    type="number"
                    value={penalizaciones}
                    onChange={(e) => setPenalizaciones(Number(e.target.value))}
                    className="font-mono h-10 bg-rose-50/20"
                  />
                </div>
              </div>
            </div>

            <div className="bg-brand-navy p-6 rounded-2xl flex justify-between items-center shadow-2xl border-t-4 border-emerald-500">
              <div className="text-white">
                <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">
                  Saldo Neto a Pagar
                </p>
                <p className="text-xs">{activeLegs[0]?.operator?.name}</p>
              </div>
              <p className="text-5xl font-black text-white font-mono tracking-tighter">
                $
                {totalNeto.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-100 p-5 border-t flex justify-end gap-4 rounded-b-2xl">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            CANCELAR
          </Button>
          <Button
            className="bg-brand-navy hover:bg-slate-800 text-white font-black px-12 h-14 rounded-2xl text-base"
            disabled={isSubmitting || !odometroFinal}
            onClick={handleSettle}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="mr-2" />
            )}
            AUTORIZAR PAGO Y CERRAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
