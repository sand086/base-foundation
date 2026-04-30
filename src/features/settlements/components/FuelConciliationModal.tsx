import * as React from "react";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
  const [lecturaSM, setLecturaSM] = useState({
    kilometrosSM: "",
    litrosSM: "",
    odometroFinal: "",
  });

  const litrosDelVale = useMemo(() => {
    return fuelLoads.reduce((sum, f) => sum + Number(f.litros), 0);
  }, [fuelLoads]);

  const odometroInicial = trip?.legs?.[0]?.odometro_inicial || 0;
  const [cobrarOperador, setCobrarOperador] = useState(true);

  const kmSM = Number(lecturaSM.kilometrosSM) || 0;
  const ltsSM = Number(lecturaSM.litrosSM) || 0;
  const odoFinal = Number(lecturaSM.odometroFinal) || 0;

  const rendimientoSM = ltsSM > 0 ? (kmSM / ltsSM).toFixed(2) : "0.00";
  const diferenciaLitros = litrosDelVale - ltsSM;
  const hayExcesoConsumo = diferenciaLitros > 0; // <- Solo dejamos esta
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
      odometro_final: odoFinal,
      km_recorridos: kmSM,
      litros_vales: litrosDelVale,
      litros_ecm: ltsSM,
      diferencia: diferenciaLitros,
      rendimiento: rendimientoReal,
      cobrar_al_operador: hayExcesoConsumo ? cobrarOperador : false,
    });

    toast.success("Viaje Conciliado", {
      description: "Los datos se han pasado a Liquidación.",
    });
    onOpenChange(false);
  };

  if (!trip) return null;

  const unit = trip?.legs?.[0]?.unit;
  const operator = trip?.legs?.[0]?.operator;
  const trailer = trip?.remolque_1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/20">
                <Activity className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 drop-shadow-md" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  Conciliación SM
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  TRP-{trip.public_id || trip.id} • {trip.origin} ➔{" "}
                  {trip.destination}
                </p>
              </div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-tighter">
                {trip.status}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-6 mt-4">
          {/* RESUMEN DE OPERACIÓN */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm grid grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                Operador
              </span>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold truncate text-foreground">
                  {operator?.name || "Sin asignar"}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                Unidad / Eco
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Truck className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-foreground">
                  {unit?.numero_economico || "N/A"} ({unit?.placas || "---"})
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                Remolque
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Container className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-foreground">
                  {trailer?.numero_economico || "S/R"}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                Carga / Peso
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Package className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-foreground">
                  {trip.peso_toneladas} Tons
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* LECTURAS MANUALES (SM) */}
            <div className="space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground border-b border-border pb-2">
                Datos SM (Manual)
              </h3>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Kilómetros SM
                </Label>
                <Input
                  type="number"
                  className="font-mono font-bold h-11 shadow-sm"
                  placeholder="Ej. 1200"
                  value={lecturaSM.kilometrosSM}
                  onChange={(e) =>
                    setLecturaSM((p) => ({
                      ...p,
                      kilometrosSM: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Litros SM
                </Label>
                <Input
                  type="number"
                  className="font-mono font-bold h-11 shadow-sm"
                  placeholder="Ej. 420"
                  value={lecturaSM.litrosSM}
                  onChange={(e) =>
                    setLecturaSM((p) => ({ ...p, litrosSM: e.target.value }))
                  }
                />
              </div>

              <div className="bg-muted/50 p-3 rounded-lg border border-border flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Rendimiento SM
                </span>
                <span className="font-mono font-black text-foreground">
                  {rendimientoSM} km/L
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex justify-between">
                  Odómetro Final
                  <span className="text-[9px] text-muted-foreground italic">
                    Inicial: {odometroInicial}
                  </span>
                </Label>
                <Input
                  type="number"
                  className={cn(
                    "font-mono font-bold h-11 shadow-sm",
                    odoFinal > 0 && odoFinal <= odometroInicial
                      ? "border-rose-300 text-rose-600"
                      : "",
                  )}
                  placeholder="Ej. 256000"
                  value={lecturaSM.odometroFinal}
                  onChange={(e) =>
                    setLecturaSM((p) => ({
                      ...p,
                      odometroFinal: e.target.value,
                    }))
                  }
                />
                {odoFinal > 0 && odoFinal <= odometroInicial ? (
                  <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tighter flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Error: El odómetro
                    debe ser mayor al inicial.
                  </p>
                ) : (
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest ml-1">
                    Servirá como lectura inicial del próximo viaje.
                  </p>
                )}
              </div>
            </div>

            {/* RESULTADOS Y COMPARACIÓN */}
            <div className="space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground border-b border-border pb-2">
                Registro de detalles y Rendimiento Real
              </h3>

              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Litros Cargados (Vales)
                  </span>
                  <span className="font-mono font-black text-amber-600 text-lg">
                    {litrosDelVale.toFixed(1)} L
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Rendimiento Real
                  </span>
                  <span className="font-mono font-black text-emerald-600 text-lg">
                    {rendimientoReal} km/L
                  </span>
                </div>

                <div className="pt-4 mt-2 border-t border-dashed border-border">
                  <div className="mb-2 flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Diferencia (Vales - SM)
                    </span>
                  </div>
                  <div
                    className={cn(
                      "p-4 rounded-xl flex items-center justify-between shadow-inner transition-colors border",
                      hayExcesoConsumo
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                        : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {hayExcesoConsumo ? (
                        <AlertTriangle className="text-rose-500 h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                      )}
                      <span
                        className={cn(
                          "text-[11px] font-black uppercase tracking-widest",
                          hayExcesoConsumo
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {hayExcesoConsumo
                          ? "Exceso de Consumo Detectado"
                          : "Conciliación Exacta"}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-mono font-black text-xl",
                        hayExcesoConsumo ? "text-rose-600" : "text-emerald-600",
                      )}
                    >
                      {diferenciaLitros > 0 ? "+" : ""}
                      {diferenciaLitros.toFixed(1)} L
                    </span>
                  </div>

                  {/* NUEVO SWITCH DE COBRO */}
                  {hayExcesoConsumo && (
                    <div className="flex items-center justify-between p-3 mt-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-widest">
                          ¿Cobrar excedente?
                        </span>
                        <span className="text-[9px] text-muted-foreground font-medium mt-0.5">
                          Se descontará en la próxima liquidación.
                        </span>
                      </div>
                      <Switch
                        checked={cobrarOperador}
                        onCheckedChange={setCobrarOperador}
                        className="data-[state=checked]:bg-rose-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ALERTAS DE BLOQUEO */}
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
        </div>

        {/* CAPA 5: FOOTER */}
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
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
              onClick={handleSubmit}
              disabled={odoFinal > 0 && odoFinal <= odometroInicial}
            >
              Registrar y Volver al Historial
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
