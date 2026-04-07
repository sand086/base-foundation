import * as React from "react";
import { useState, useMemo } from "react";
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
import { Fuel, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { FuelLoad } from "../types";
import { Trip } from "@/features/trips/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConciliarViajeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  fuelLoads: FuelLoad[];
  onConciliar: (tripId: number, calculos: any) => void;
}

export function ConciliarViajeModal({
  open,
  onOpenChange,
  trip,
  fuelLoads,
  onConciliar,
}: ConciliarViajeModalProps) {
  // Ajuste a la nomenclatura de Gustavo (SM)
  const [lecturaSM, setLecturaSM] = useState({
    kilometrosSM: "",
    litrosSM: "",
    odometroFinal: "",
  });

  // 1. Litros de los Vales
  const litrosDelVale = useMemo(() => {
    return fuelLoads.reduce((sum, f) => sum + Number(f.litros), 0);
  }, [fuelLoads]);

  // Extraemos el odómetro inicial de referencia
  const odometroInicial = trip?.legs?.[0]?.odometro_inicial || 0;

  // 2. Variables Numéricas
  const kmSM = Number(lecturaSM.kilometrosSM) || 0;
  const ltsSM = Number(lecturaSM.litrosSM) || 0;
  const odoFinal = Number(lecturaSM.odometroFinal) || 0;

  // Fórmulas exactas de Gustavo:
  // Rendimiento SM = Kilómetros SM / Litros SM
  const rendimientoSM = ltsSM > 0 ? (kmSM / ltsSM).toFixed(2) : "0.00";

  // Diferencia = Litros SM - Litros del Vale
  const diferenciaLitros = ltsSM - litrosDelVale;
  const hayFaltante = diferenciaLitros > 0;

  // Rendimiento Real = Kilómetros SM / Litros del Vale
  const rendimientoReal =
    litrosDelVale > 0 ? (kmSM / litrosDelVale).toFixed(2) : "0.00";

  const handleSubmit = () => {
    if (
      !lecturaSM.kilometrosSM ||
      !lecturaSM.litrosSM ||
      !lecturaSM.odometroFinal
    ) {
      toast.error("Datos Incompletos", {
        description:
          "Debes llenar Kilómetros SM, Litros SM y el Odómetro Final.",
      });
      return;
    }

    onConciliar(trip!.id, {
      odometro_inicial: odometroInicial,
      odometro_final: odoFinal, // Este pasa al siguiente viaje
      km_recorridos: kmSM,
      litros_vales: litrosDelVale,
      litros_ecm: ltsSM,
      diferencia: diferenciaLitros,
      rendimiento: rendimientoReal,
    });

    toast.success("Viaje Conciliado", {
      description: "Los datos se han pasado a Liquidación.",
    });
    onOpenChange(false);
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] bg-background dark:bg-background border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="bg-card p-6 border-b border-border">
          <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <Activity className="text-blue-600" />
            Conciliación Físico vs SM - Viaje #{trip.public_id || trip.id}
          </DialogTitle>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
            {trip.origin} ➔ {trip.destination}
          </p>
        </DialogHeader>

        <div className="p-6 grid grid-cols-2 gap-8">
          {/* LECTURAS MANUALES (SM) */}
          <div className="space-y-5">
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground border-b border-border pb-2">
              Datos SM (Manual)
            </h3>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Kilómetros SM
              </Label>
              <Input
                type="number"
                className="font-mono h-11 bg-card border-border shadow-inner"
                placeholder="Ej. 1200"
                value={lecturaSM.kilometrosSM}
                onChange={(e) =>
                  setLecturaSM((p) => ({ ...p, kilometrosSM: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Litros SM
              </Label>
              <Input
                type="number"
                className="font-mono h-11 bg-card border-border shadow-inner"
                placeholder="Ej. 420"
                value={lecturaSM.litrosSM}
                onChange={(e) =>
                  setLecturaSM((p) => ({ ...p, litrosSM: e.target.value }))
                }
              />
            </div>

            {/* Rendimiento SM Automático */}
            <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Rendimiento SM
              </span>
              <span className="font-mono font-black text-slate-700 dark:text-slate-300">
                {rendimientoSM} km/L
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-black text-blue-600 uppercase tracking-widest">
                Odómetro Final
              </Label>
              <Input
                type="number"
                className="font-mono h-11 bg-blue-50/50 border-blue-200 text-blue-900 shadow-inner"
                placeholder="Ej. 256000"
                value={lecturaSM.odometroFinal}
                onChange={(e) =>
                  setLecturaSM((p) => ({ ...p, odometroFinal: e.target.value }))
                }
              />
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest ml-1">
                Servirá como lectura inicial del próximo viaje.
              </p>
            </div>
          </div>

          {/* RESULTADOS Y COMPARACIÓN */}
          <div className="space-y-5">
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground border-b border-border pb-2">
              Auditoría y Rendimiento Real
            </h3>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Litros Cargados (Vales)
                </span>
                <span className="font-mono font-black text-amber-600 text-lg">
                  {litrosDelVale.toFixed(1)} L
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Rendimiento Real
                </span>
                <span className="font-mono font-black text-emerald-600 text-lg">
                  {rendimientoReal} km/L
                </span>
              </div>

              <div className="pt-4 mt-2 border-t border-dashed border-border">
                <div className="mb-2 flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Diferencia (SM - Vales)
                  </span>
                </div>
                <div
                  className={cn(
                    "p-4 rounded-xl flex items-center justify-between shadow-inner",
                    hayFaltante
                      ? "bg-rose-50 border border-rose-200"
                      : "bg-emerald-50 border border-emerald-200",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {hayFaltante ? (
                      <AlertTriangle className="text-rose-500 h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                    )}
                    <span
                      className={cn(
                        "text-[11px] font-black uppercase tracking-widest",
                        hayFaltante ? "text-rose-700" : "text-emerald-700",
                      )}
                    >
                      {hayFaltante
                        ? "Desviación Detectada"
                        : "Conciliación Exacta"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono font-black text-xl",
                      hayFaltante ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {diferenciaLitros > 0 ? "+" : ""}
                    {diferenciaLitros.toFixed(1)} L
                  </span>
                </div>
                {hayFaltante && (
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-2 text-center">
                    El monto del faltante se calculará en la liquidación si
                    supera el 3%.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-5 bg-muted border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="uppercase font-bold text-[11px] tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            className="bg-brand-navy text-white font-black uppercase tracking-widest text-xs h-11 px-8 shadow-xl hover:bg-slate-800"
            onClick={handleSubmit}
          >
            Registrar y Volver al Historial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
