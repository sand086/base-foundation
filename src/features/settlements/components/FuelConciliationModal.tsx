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
  fuelLoads: FuelLoad[]; // Los vales asociados a este viaje
  onConciliar: (tripId: number, calculos: any) => void;
}

export function ConciliarViajeModal({
  open,
  onOpenChange,
  trip,
  fuelLoads,
  onConciliar,
}: ConciliarViajeModalProps) {
  const [lecturaECM, setLecturaECM] = useState({
    odometroFinal: "",
    litrosECM: "",
  });

  // 1. Sumar los Vales (Total Litros Cargados)
  const totalLitrosVales = useMemo(() => {
    return fuelLoads.reduce((sum, f) => sum + Number(f.litros), 0);
  }, [fuelLoads]);

  // Extraemos el odómetro inicial de la primera fase del viaje
  const odometroInicial = trip?.legs?.[0]?.odometro_inicial || 0;

  // 2. Cálculos en Tiempo Real
  const odoFinal = Number(lecturaECM.odometroFinal) || 0;
  const ltsECM = Number(lecturaECM.litrosECM) || 0;

  const kmRecorridos =
    odoFinal > odometroInicial ? odoFinal - odometroInicial : 0;
  const rendimientoReal =
    ltsECM > 0 ? (kmRecorridos / totalLitrosVales).toFixed(2) : "0.00";

  // Lógica de Gustavo: "Tenías que haber echado 400 (ECM) y echaste 800 (Vales). Me debes 400"
  const diferenciaLitros = totalLitrosVales - ltsECM;
  const hayFaltante = diferenciaLitros > 0;

  const handleSubmit = () => {
    if (!lecturaECM.odometroFinal || !lecturaECM.litrosECM) {
      toast.error("Debes ingresar la lectura del ECM");
      return;
    }

    onConciliar(trip!.id, {
      odometro_inicial: odometroInicial,
      odometro_final: odoFinal,
      km_recorridos: kmRecorridos,
      litros_vales: totalLitrosVales,
      litros_ecm: ltsECM,
      diferencia: diferenciaLitros,
      rendimiento: rendimientoReal,
    });

    toast.success("Viaje Conciliado", {
      description: "Los descuentos se han pasado a Liquidación.",
    });
    onOpenChange(false);
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-background dark:bg-background border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="bg-card p-6 border-b border-border">
          <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <Activity className="text-blue-600" />
            Conciliación de Combustible - Viaje #{trip.id}
          </DialogTitle>
          <p className="text-sm font-bold text-muted-foreground">
            {trip.origin} ➔ {trip.destination}
          </p>
        </DialogHeader>

        <div className="p-6 grid grid-cols-2 gap-8">
          {/* LECTURAS MANUALES (ECM) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Lectura Digital (ECM)
            </h3>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Odómetro Final (Km)
              </Label>
              <Input
                type="number"
                className="font-mono h-11 bg-card border-border"
                placeholder="Ej. 150400"
                value={lecturaECM.odometroFinal}
                onChange={(e) =>
                  setLecturaECM((p) => ({
                    ...p,
                    odometroFinal: e.target.value,
                  }))
                }
              />
              <p className="text-[10px] text-slate-500 font-mono">
                Inicial: {odometroInicial.toLocaleString()} km
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Litros Consumidos (Según Máquina)
              </Label>
              <Input
                type="number"
                className="font-mono h-11 bg-card border-border"
                placeholder="Ej. 400"
                value={lecturaECM.litrosECM}
                onChange={(e) =>
                  setLecturaECM((p) => ({ ...p, litrosECM: e.target.value }))
                }
              />
            </div>
          </div>

          {/* RESULTADOS Y COMPARACIÓN */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Auditoría Física vs Digital
            </h3>

            <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Km Recorridos
                </span>
                <span className="font-mono font-black">
                  {kmRecorridos.toLocaleString()} km
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Litros Cargados (Vales)
                </span>
                <span className="font-mono font-black text-blue-600">
                  {totalLitrosVales.toFixed(1)} L
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Rendimiento Real
                </span>
                <span className="font-mono font-black">
                  {rendimientoReal} km/L
                </span>
              </div>

              <div className="pt-3 mt-3 border-t border-dashed border-border">
                <div
                  className={cn(
                    "p-3 rounded-lg flex items-center justify-between",
                    hayFaltante
                      ? "bg-rose-50 border border-rose-200"
                      : "bg-emerald-50 border border-emerald-200",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {hayFaltante ? (
                      <AlertTriangle className="text-rose-500 h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="text-emerald-500 h-4 w-4" />
                    )}
                    <span
                      className={cn(
                        "text-[11px] font-black uppercase",
                        hayFaltante ? "text-rose-700" : "text-emerald-700",
                      )}
                    >
                      {hayFaltante
                        ? "Faltante (Descuento)"
                        : "Conciliación Exacta"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono font-black text-lg",
                      hayFaltante ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {Math.abs(diferenciaLitros).toFixed(1)} L
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-brand-navy text-white font-black uppercase"
            onClick={handleSubmit}
          >
            Aprobar Conciliación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
