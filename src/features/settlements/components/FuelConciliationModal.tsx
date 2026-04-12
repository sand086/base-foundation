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
import {
  Fuel,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Truck,
  User,
  Container,
  Package,
} from "lucide-react";
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

  // Referencias rápidas extraídas del objeto trip (JSON)
  const unit = trip?.legs?.[0]?.unit;
  const operator = trip?.legs?.[0]?.operator;
  const trailer = trip?.remolque_1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-background dark:bg-background border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
        {/* HEADER CON TÍTULO Y RUTA */}
        <DialogHeader className="bg-card p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <Activity className="text-blue-600" />
                Conciliación Físico vs SM
                <br></br>TRP-{trip.public_id || trip.id}
              </DialogTitle>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {trip.origin} ➔ {trip.destination}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-tighter">
                Status: {trip.status}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* NUEVA SECCIÓN: RESUMEN DE OPERACIÓN (DATOS DEL JSON) */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border grid grid-cols-4 gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Operador
            </span>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-300">
                {operator?.name || "Sin asignar"}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Unidad / Eco
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {unit?.numero_economico || "N/A"} ({unit?.placas || "---"})
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Remolque
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Container className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {trailer?.numero_economico || "S/R"}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Carga / Peso
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {trip.peso_toneladas} Tons
              </span>
            </div>
          </div>
        </div>

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
              <Label className="text-xs font-black text-blue-600 uppercase tracking-widest flex justify-between">
                Odómetro Final
                <span className="text-[9px] text-muted-foreground italic">
                  Inicial: {odometroInicial}
                </span>
              </Label>
              <Input
                type="number"
                className={cn(
                  "font-mono h-11 shadow-inner",
                  odoFinal > 0 && odoFinal <= odometroInicial
                    ? "bg-rose-50 border-rose-300 text-rose-900"
                    : "bg-blue-50/50 border-blue-200 text-blue-900",
                )}
                placeholder="Ej. 256000"
                value={lecturaSM.odometroFinal}
                onChange={(e) =>
                  setLecturaSM((p) => ({ ...p, odometroFinal: e.target.value }))
                }
              />
              {odoFinal > 0 && odoFinal <= odometroInicial ? (
                <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tighter flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Error: El odómetro debe
                  ser mayor al inicial.
                </p>
              ) : (
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest ml-1">
                  Servirá como lectura inicial del próximo viaje.
                </p>
              )}
            </div>
          </div>

          {/* RESULTADOS Y COMPARACIÓN */}
          <div className="space-y-5">
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground border-b border-border pb-2">
              Registro de detalles y Rendimiento Real
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
                    "p-4 rounded-xl flex items-center justify-between shadow-inner transition-colors",
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

            {/* ALERTAS DE BLOQUEO DE ACTIVOS (SI APLICAN) */}
            {(unit?.status === "bloqueado" ||
              trailer?.status === "bloqueado") && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase">
                    Alertas de Activos
                  </span>
                </div>
                <ul className="text-[9px] text-amber-600 dark:text-amber-500 font-medium list-disc ml-4 uppercase">
                  {unit?.status === "bloqueado" && (
                    <li>
                      Tractor {unit.numero_economico}: {unit.razon_bloqueo}
                    </li>
                  )}
                  {trailer?.status === "bloqueado" && (
                    <li>
                      Remolque {trailer.numero_economico}:{" "}
                      {trailer.razon_bloqueo}
                    </li>
                  )}
                </ul>
              </div>
            )}
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
            disabled={odoFinal > 0 && odoFinal <= odometroInicial}
          >
            Registrar y Volver al Historial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
