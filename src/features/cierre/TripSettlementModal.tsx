import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  CheckCircle2,
  TrendingUp,
  History,
  Loader2,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import axiosClient from "@/api/axiosClient";

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
  esAutomatico?: boolean; // Para saber si vino del backend
}

export default function TripSettlementModal({
  open,
  onOpenChange,
  leg,
  tripPadre,
  selectedLegs = [],
  onSuccess,
}: TripSettlementModalProps) {
  const {
    updateTripStatus,
    refreshTrips,
    getTripSettlement,
    closeTripSettlement,
  } = useTrips();

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados cargados desde el Backend
  const [kmsRecorridos, setKmsRecorridos] = useState(0);
  const [rendimientoReal, setRendimientoReal] = useState(0);
  const [conceptosExtra, setConceptosExtra] = useState<ConceptoExtra[]>([]);

  // Estados Locales
  const [odometroFinal, setOdometroFinal] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");

  const activeLegs = useMemo(() => {
    if (selectedLegs.length > 0) return selectedLegs;
    if (leg && tripPadre) return [{ ...leg, trip: tripPadre }];
    return [];
  }, [leg, tripPadre, selectedLegs]);

  //  FASE 3: CARGA AUTOMÁTICA DEL BACKEND
  useEffect(() => {
    const fetchData = async () => {
      if (open && activeLegs.length > 0) {
        setIsLoadingData(true);
        const legId = activeLegs[0].id;

        try {
          // Llamamos al endpoint que Gustavo nos indicó
          const data = await getTripSettlement(legId);

          if (data) {
            setKmsRecorridos(data.kmsRecorridos || 0);

            // Calculamos rendimiento visualmente para esta UI si vinieron litros
            if (data.consumoRealLitros > 0 && data.kmsRecorridos > 0) {
              setRendimientoReal(data.kmsRecorridos / data.consumoRealLitros);
            } else {
              setRendimientoReal(0);
            }

            // Transformar los conceptos del backend a nuestro formato UI
            const conceptosBack = (data.conceptos || []).map((c: any) => ({
              id: c.id,
              tipo: c.tipo,
              descripcion: c.descripcion,
              monto: c.monto,
              esAutomatico: c.esAutomatico,
            }));

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
  }, [open, activeLegs, getTripSettlement]);

  //  REGLA DE ORO DE GUSTAVO: Las casetas no se cobran
  const sumAnticipos = activeLegs.reduce(
    (sum, item) =>
      sum +
      (Number(item.anticipo_viaticos) || 0) +
      (Number(item.otros_anticipos) || 0),
    0,
  );

  // Cálculos dinámicos
  const extraIngresos = conceptosExtra
    .filter((c) => c.tipo === "ingreso")
    .reduce((sum, c) => sum + (Number(c.monto) || 0), 0);

  const extraDeducciones = conceptosExtra
    .filter(
      (c) =>
        c.tipo === "deduccion" && !c.descripcion.includes("Anticipo Casetas"),
    ) // Ignoramos las casetas en el neto final
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
    setObservaciones("");
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

      // Limpiamos los datos para mandarlos al endpoint
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
      };

      //  Llamar a la función del hook para cerrar en Tesorería
      await closeTripSettlement(legId, payloadLiquidacion);

      // Cierre de UI
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
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-12 bg-white/90 backdrop-blur-xl border-none shadow-2xl">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Calculando Penalizaciones...
          </p>
        </DialogContent>
      </Dialog>
    );
  }

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

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto">
          {/* RENDIMIENTO */}
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
                    Distancia Estimada:
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
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">
                    Percepciones
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[9px] text-emerald-600 px-2"
                    onClick={() => addConcepto("ingreso")}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Bono Extra
                  </Button>
                </div>

                {conceptosExtra
                  .filter((c) => c.tipo === "ingreso")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-2 items-end animate-in fade-in"
                    >
                      <div className="space-y-1.5 flex-1">
                        {c.esAutomatico ? (
                          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-2 rounded-md border border-emerald-100">
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
                            className="h-9 text-xs"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5 w-24">
                        <Input
                          type="number"
                          placeholder="$"
                          value={c.monto}
                          disabled={c.esAutomatico}
                          onChange={(e) =>
                            updateConcepto(
                              c.id,
                              "monto",
                              Number(e.target.value),
                            )
                          }
                          className={`h-9 text-xs font-mono ${c.esAutomatico ? "bg-slate-50" : ""}`}
                        />
                      </div>
                      {!c.esAutomatico && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-rose-500 hover:bg-rose-50"
                          onClick={() => removeConcepto(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>

              {/* DEDUCCIONES */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <p className="text-[10px] font-black text-rose-600 uppercase">
                    Deducciones
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[9px] text-rose-600 px-2"
                    onClick={() => addConcepto("deduccion")}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Vale Azul
                  </Button>
                </div>

                {/* Aclaración Visual de Regla de Oro */}
                <div className="p-3 bg-rose-50/50 border border-dashed border-rose-200 rounded-xl mb-4">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      <span>EFECTIVO (Sin Casetas):</span>
                    </div>
                    <span className="text-rose-600 font-mono">
                      -${sumAnticipos.toLocaleString()}
                    </span>
                  </div>
                </div>

                {conceptosExtra
                  .filter(
                    (c) =>
                      c.tipo === "deduccion" &&
                      !c.descripcion.includes("Casetas"),
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-2 items-end animate-in fade-in"
                    >
                      <div className="space-y-1.5 flex-1">
                        {c.esAutomatico ? (
                          <p className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-2 rounded-md border border-rose-100">
                            {c.descripcion}
                          </p>
                        ) : (
                          <Input
                            placeholder="Concepto (Ej: Multa Tránsito)"
                            value={c.descripcion}
                            onChange={(e) =>
                              updateConcepto(
                                c.id,
                                "descripcion",
                                e.target.value,
                              )
                            }
                            className="h-9 text-xs"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5 w-24">
                        <Input
                          type="number"
                          placeholder="$"
                          value={c.monto}
                          disabled={c.esAutomatico}
                          onChange={(e) =>
                            updateConcepto(
                              c.id,
                              "monto",
                              Number(e.target.value),
                            )
                          }
                          className={`h-9 text-xs font-mono ${c.esAutomatico ? "bg-rose-50/50" : ""}`}
                        />
                      </div>
                      {!c.esAutomatico && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-rose-500 hover:bg-rose-50"
                          onClick={() => removeConcepto(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* TOTAL NETO */}
            <div className="bg-brand-navy p-6 rounded-2xl flex justify-between items-center shadow-2xl border-t-4 border-emerald-500">
              <div className="text-white">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">
                  Saldo Neto a Pagar
                </p>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">
                    {activeLegs[0]?.operator?.name}
                  </span>
                </div>
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

        {/* FOOTER */}
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
