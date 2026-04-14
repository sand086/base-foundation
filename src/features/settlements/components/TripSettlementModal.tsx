import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  CheckCircle2,
  TrendingUp,
  History,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Droplet,
  Fuel,
  DollarSign,
  GaugeCircle,
  Wallet,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { Trip, TripLeg } from "@/features/trips/types";
import { useTrips } from "@/features/trips/hooks/useTrips";

export interface TripSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leg?: TripLeg | null;
  tripPadre?: Trip | null;
  selectedLegs?: any[];
  onSuccess?: () => void;
}

interface ConceptoExtra {
  id: string;
  tipo: "ingreso" | "deduccion";
  descripcion: string;
  monto: number | "";
  esAutomatico?: boolean;
}

export default function TripSettlementModal({
  open,
  onOpenChange,
  leg,
  tripPadre,
  selectedLegs = [],
  onSuccess,
}: TripSettlementModalProps) {
  const { refreshTrips, getTripSettlement, closeTripSettlement } = useTrips();

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados cargados desde el Backend
  const [kmsRecorridos, setKmsRecorridos] = useState(0);
  const [rendimientoReal, setRendimientoReal] = useState(0);
  const [conceptosExtra, setConceptosExtra] = useState<ConceptoExtra[]>([]);

  // ESTADOS DE CONCILIACIÓN DE DIÉSEL
  const [consumoEsperado, setConsumoEsperado] = useState(0);
  const [consumoReal, setConsumoReal] = useState(0);
  const [diferenciaLitros, setDiferenciaLitros] = useState(0);

  // Estados Locales
  const [odometroFinal, setOdometroFinal] = useState<number | "">("");

  const activeLegs = useMemo(() => {
    if (selectedLegs.length > 0) return selectedLegs;
    if (leg && tripPadre) return [{ ...leg, trip: tripPadre }];
    return [];
  }, [leg, tripPadre, selectedLegs]);

  // FASE 3: CARGA AUTOMÁTICA DEL BACKEND
  useEffect(() => {
    const fetchData = async () => {
      if (open && activeLegs.length > 0) {
        setIsLoadingData(true);
        const legId = activeLegs[0].id;

        try {
          const data = await getTripSettlement(legId);

          if (data) {
            setKmsRecorridos(data.kmsRecorridos || 0);

            setConsumoEsperado(data.consumoEsperadoLitros || 0);
            setConsumoReal(data.consumoRealLitros || 0);
            setDiferenciaLitros(data.diferenciaLitros || 0);

            if (data.consumoRealLitros > 0 && data.kmsRecorridos > 0) {
              setRendimientoReal(data.kmsRecorridos / data.consumoRealLitros);
            } else {
              setRendimientoReal(0);
            }

            const conceptosBack: ConceptoExtra[] = (data.conceptos || []).map(
              (c: any) => ({
                id: c.id,
                tipo: c.tipo,
                descripcion: c.descripcion,
                monto: c.monto,
                esAutomatico: c.esAutomatico,
              }),
            );

            //  LÓGICA DE NEGOCIO: INYECTAR SUELDO PACTADO AUTOMÁTICAMENTE
            const hasSueldo = conceptosBack.some(
              (c) =>
                c.descripcion.toLowerCase().includes("sueldo") ||
                c.descripcion.toLowerCase().includes("bono movimiento"),
            );

            if (!hasSueldo && tripPadre) {
              // Buscamos el sueldo en la tarifa heredada o en el viaje
              const sueldoPactado = Number(
                (tripPadre as any).sueldo_operador ||
                  (tripPadre as any).tariff?.sueldo_operador ||
                  0,
              );

              if (sueldoPactado > 0) {
                conceptosBack.unshift({
                  id: `sueldo-auto-${Date.now()}`,
                  tipo: "ingreso",
                  descripcion: "Sueldo Base (Pactado en Tarifa)",
                  monto: sueldoPactado,
                  esAutomatico: true,
                });
              }
            }

            setConceptosExtra(conceptosBack);
          }
        } catch (error) {
          console.error("Error al cargar la pre-liquidación", error);
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    if (open) fetchData();
  }, [open, activeLegs, getTripSettlement, tripPadre]);

  // REGLA DE ORO: Las casetas no se cobran al operador
  const sumAnticipos = activeLegs.reduce(
    (sum, item) =>
      sum +
      (Number(item.anticipo_viaticos) || 0) +
      (Number(item.otros_anticipos) || 0),
    0,
  );

  const extraIngresos = conceptosExtra
    .filter((c) => c.tipo === "ingreso")
    .reduce((sum, c) => sum + (Number(c.monto) || 0), 0);

  const extraDeducciones = conceptosExtra
    .filter(
      (c) =>
        c.tipo === "deduccion" && !c.descripcion.includes("Anticipo Casetas"),
    )
    .reduce((sum, c) => sum + (Number(c.monto) || 0), 0);

  const totalPercepciones = extraIngresos;
  const totalDeducciones = extraDeducciones;
  const totalNeto = totalPercepciones - totalDeducciones;

  const addConcepto = (tipo: "ingreso" | "deduccion") => {
    setConceptosExtra([
      ...conceptosExtra,
      {
        id: Date.now().toString(),
        tipo,
        descripcion: "",
        monto: "",
        esAutomatico: false,
      },
    ]);
  };

  const removeConcepto = (id: string) => {
    setConceptosExtra(conceptosExtra.filter((c) => c.id !== id));
  };

  const updateConcepto = (
    id: string,
    field: keyof ConceptoExtra,
    value: string | number,
  ) => {
    setConceptosExtra(
      conceptosExtra.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setOdometroFinal("");
    setConceptosExtra([]);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshTrips();
    setIsSyncing(false);
    toast.success("Sincronizado con vales de combustible");
  };

  const handleSettle = async () => {
    if (!odometroFinal) return toast.error("El odómetro final es obligatorio");

    const invalidConceptos = conceptosExtra.some(
      (c) => !c.descripcion.trim() || c.monto === "" || Number(c.monto) <= 0,
    );
    if (invalidConceptos) {
      return toast.error(
        "Por favor, completa o elimina los conceptos extra vacíos.",
      );
    }

    try {
      setIsSubmitting(true);
      const legId = activeLegs[0]?.id;
      if (!legId) throw new Error("No hay un tramo activo para liquidar");

      const conceptosFinales = conceptosExtra
        .filter((c) => Number(c.monto) > 0)
        .map((c) => ({
          id: c.id,
          tipo: c.tipo,
          categoria:
            c.tipo === "ingreso"
              ? c.esAutomatico
                ? "bono"
                : "extra"
              : c.esAutomatico
                ? "descuento"
                : "extra",
          descripcion: c.descripcion,
          monto: Number(c.monto),
          esAutomatico: c.esAutomatico || false,
        }));

      const payloadLiquidacion = {
        conceptos: conceptosFinales,
        total_ingresos: totalPercepciones,
        total_deducciones: totalDeducciones,
        neto_a_pagar: totalNeto,
        odometro_final: Number(odometroFinal),
      };

      await closeTripSettlement(legId, payloadLiquidacion);

      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error cerrando liquidación:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-12 bg-card/90 dark:bg-card/90 backdrop-blur-xl border-none shadow-2xl">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Calculando Conciliación y Penalizaciones...
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-6xl p-0 overflow-hidden bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl border-none shadow-2xl animate-modal-show flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
                <Calculator className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-md" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  Liquidación Operativa
                </DialogTitle>
                <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  Operador: {activeLegs[0]?.operator?.name || "S/A"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-9 haptic-press font-black uppercase tracking-widest text-[10px]"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <History className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* =========================================
              COLUMNA IZQUIERDA: RENDIMIENTO Y DIÉSEL 
          ========================================= */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" /> Rendimiento /
                Odómetro
              </h3>
              <Card className="border-border dark:border-border shadow-sm">
                <CardContent className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <Label className="font-black text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <GaugeCircle className="h-3 w-3" /> Odo Inicial
                      </Label>
                      <Input
                        value={activeLegs[0]?.odometro_inicial || 0}
                        readOnly
                        className="bg-muted font-mono font-bold text-muted-foreground h-10 border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-black text-[9px] uppercase tracking-widest text-blue-600 flex items-center gap-1">
                        <GaugeCircle className="h-3 w-3" /> Odo Final *
                      </Label>
                      <Input
                        type="number"
                        value={odometroFinal}
                        onChange={(e) =>
                          setOdometroFinal(Number(e.target.value))
                        }
                        className="border-blue-300 font-mono font-bold text-blue-900 bg-blue-50/30 h-10 shadow-inner"
                        placeholder="Ej. 145000"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-3.5 rounded-xl flex justify-between items-center shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Dist. GPS:
                    </span>
                    <span className="text-xl font-black font-mono">
                      {kmsRecorridos} KM
                    </span>
                  </div>

                  <div
                    className={`p-4 rounded-xl text-center border-2 ${rendimientoReal < 2.2 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                      Rendimiento Real
                    </p>
                    <p
                      className={`text-4xl font-black font-mono tracking-tighter ${rendimientoReal < 2.2 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {rendimientoReal.toFixed(2)}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">
                      KM / Litro
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Fuel className="h-4 w-4 text-amber-500" /> Conciliación Diésel
              </h3>
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 space-y-4 bg-card dark:bg-card">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Droplet className="h-3.5 w-3.5 text-blue-400" />{" "}
                        Consumo Esperado
                      </span>
                      <span className="font-mono text-sm font-black text-slate-700">
                        {consumoEsperado.toFixed(1)} L
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Droplet className="h-3.5 w-3.5 text-amber-500" />{" "}
                        Cargado (Vales)
                      </span>
                      <span className="font-mono text-sm font-black text-amber-700">
                        {consumoReal.toFixed(1)} L
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Diferencia vs Tolerancia
                      </span>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs font-black ${diferenciaLitros > 0 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}
                      >
                        {diferenciaLitros > 0 ? "+" : ""}
                        {diferenciaLitros.toFixed(1)} L
                      </Badge>
                    </div>
                  </div>

                  {diferenciaLitros > consumoEsperado * 0.05 && (
                    <div className="bg-rose-50 border-t border-rose-100 p-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">
                            Penalización Automática
                          </p>
                          <p className="text-xs text-rose-600/80 font-medium leading-tight mt-0.5">
                            El operador excedió el 5% de tolerancia de
                            rendimiento. Se agregó la deducción a la tabla.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* =========================================
              COLUMNA DERECHA: CALCULADORA FINANCIERA
          ========================================= */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-500" /> Balance
              Financiero
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-sm h-full">
              {/* PERCEPCIONES (INGRESOS) */}
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">
                    Percepciones
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[9px] text-emerald-600 px-2 font-black tracking-widest uppercase hover:bg-emerald-50"
                    onClick={() => addConcepto("ingreso")}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Bono Extra
                  </Button>
                </div>

                <div className="space-y-3">
                  {conceptosExtra
                    .filter((c) => c.tipo === "ingreso")
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex gap-3 items-center animate-in fade-in"
                      >
                        <div className="flex-1">
                          {c.esAutomatico ? (
                            <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50/80 px-3 py-2.5 rounded-lg border border-emerald-200/50 truncate">
                              {c.descripcion}
                            </p>
                          ) : (
                            <Input
                              placeholder="Concepto (Ej: Maniobras)"
                              value={c.descripcion}
                              onChange={(e) =>
                                updateConcepto(
                                  c.id,
                                  "descripcion",
                                  e.target.value,
                                )
                              }
                              className="h-10 text-xs shadow-inner"
                            />
                          )}
                        </div>
                        <div className="w-28 relative shrink-0">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600/50" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={c.monto}
                            disabled={c.esAutomatico}
                            onChange={(e) =>
                              updateConcepto(
                                c.id,
                                "monto",
                                Number(e.target.value),
                              )
                            }
                            className={cn(
                              "h-10 text-xs font-mono font-black pl-7",
                              c.esAutomatico
                                ? "bg-slate-50 text-slate-500 border-transparent shadow-none"
                                : "border-emerald-200 text-emerald-900 bg-emerald-50/30",
                            )}
                          />
                        </div>
                        {!c.esAutomatico && (
                          <Button
                            type="button" // Para evitar submit
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                            onClick={() => removeConcepto(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* DEDUCCIONES */}
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest">
                    Deducciones
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[9px] text-rose-600 px-2 font-black tracking-widest uppercase hover:bg-rose-50"
                    onClick={() => addConcepto("deduccion")}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Vale / Descuento
                  </Button>
                </div>

                {sumAnticipos > 0 && (
                  <div className="p-3.5 bg-muted/50 border border-border rounded-xl mb-4">
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-slate-400" />
                        <span className="uppercase tracking-widest">
                          Anticipos Efectivo (Sin Casetas):
                        </span>
                      </div>
                      <span className="text-foreground font-mono font-black text-sm">
                        -$
                        {sumAnticipos.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {conceptosExtra
                    .filter(
                      (c) =>
                        c.tipo === "deduccion" &&
                        !c.descripcion.includes("Casetas"),
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex gap-3 items-center animate-in fade-in"
                      >
                        <div className="flex-1">
                          {c.esAutomatico ? (
                            <p className="text-[11px] font-bold text-rose-800 bg-rose-50/80 px-3 py-2.5 rounded-lg border border-rose-200/50 truncate flex items-center gap-1.5">
                              {c.descripcion.includes("Combustible") && (
                                <Droplet className="h-3 w-3 text-rose-500" />
                              )}
                              {c.descripcion}
                            </p>
                          ) : (
                            <Input
                              placeholder="Motivo (Ej: Multa)"
                              value={c.descripcion}
                              onChange={(e) =>
                                updateConcepto(
                                  c.id,
                                  "descripcion",
                                  e.target.value,
                                )
                              }
                              className="h-10 text-xs shadow-inner"
                            />
                          )}
                        </div>
                        <div className="w-28 relative shrink-0">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-600/50" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={c.monto}
                            disabled={c.esAutomatico}
                            onChange={(e) =>
                              updateConcepto(
                                c.id,
                                "monto",
                                Number(e.target.value),
                              )
                            }
                            className={cn(
                              "h-10 text-xs font-mono font-black pl-7",
                              c.esAutomatico
                                ? "bg-rose-50/50 text-rose-700 border-rose-200 shadow-none"
                                : "border-rose-200 text-rose-900 bg-rose-50/30",
                            )}
                          />
                        </div>
                        {!c.esAutomatico && (
                          <Button
                            type="button" // Para evitar submit
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                            onClick={() => removeConcepto(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="md:col-span-2 mt-4">
                <div className="bg-brand-navy p-6 md:p-8 rounded-2xl flex justify-between items-center shadow-2xl border-t-4 border-emerald-500 relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                    <Wallet className="h-40 w-40" />
                  </div>
                  <div className="text-white relative z-10">
                    <p className="text-emerald-400 font-black uppercase text-[11px] tracking-[0.3em] mb-1">
                      Saldo Neto a Pagar
                    </p>
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-bold uppercase tracking-widest">
                        {activeLegs[0]?.operator?.name}
                      </span>
                    </div>
                  </div>
                  <p className="text-5xl md:text-6xl font-black text-white font-mono tracking-tighter relative z-10 drop-shadow-lg">
                    $
                    {totalNeto.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
              disabled={isSubmitting || !odometroFinal}
              onClick={handleSettle}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Autorizar y Cerrar Fase
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
