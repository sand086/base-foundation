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

// 🚀 Nueva Interfaz para los Conceptos Extra (Vales Azules)
interface ConceptoExtra {
  id: string;
  tipo: "ingreso" | "deduccion";
  descripcion: string;
  monto: number | "";
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
  const [isSyncing, setIsSyncing] = useState(false);

  // ESTADOS OPERATIVOS
  const [odometroFinal, setOdometroFinal] = useState<number | "">("");

  // ESTADOS FINANCIEROS (FIJOS)
  const [sueldoBase, setSueldoBase] = useState<number | "">("");
  const [bonos, setBonos] = useState<number | "">("");
  const [penalizaciones, setPenalizaciones] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");

  // 🚀 ESTADO PARA CONCEPTOS DINÁMICOS (VALES AZULES)
  const [conceptosExtra, setConceptosExtra] = useState<ConceptoExtra[]>([]);

  // UNIFICAR DATOS
  const activeLegs = useMemo(() => {
    if (selectedLegs.length > 0) return selectedLegs;
    if (leg && tripPadre) return [{ ...leg, trip: tripPadre }];
    return [];
  }, [leg, tripPadre, selectedLegs]);

  // Carga inicial
  useEffect(() => {
    if (open && activeLegs.length > 0) {
      const padre = activeLegs[0].trip || tripPadre;
      if (padre?.tarifa_base) {
        setSueldoBase(padre.tarifa_base * 0.1); // 10% sugerido en junta
      }
    }
  }, [open, activeLegs, tripPadre]);

  // LÓGICA DE RENDIMIENTO
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

  // CÁLCULOS FINANCIEROS Y DE CONCEPTOS
  const sumAnticipos = activeLegs.reduce(
    (sum, item) =>
      sum +
      (Number(item.anticipo_viaticos) || 0) +
      (Number(item.anticipo_casetas) || 0) +
      (Number(item.otros_anticipos) || 0),
    0,
  );

  // 🚀 Sumar los conceptos extra dinámicos
  const extraIngresos = conceptosExtra
    .filter((c) => c.tipo === "ingreso")
    .reduce((sum, c) => sum + (Number(c.monto) || 0), 0);

  const extraDeducciones = conceptosExtra
    .filter((c) => c.tipo === "deduccion")
    .reduce((sum, c) => sum + (Number(c.monto) || 0), 0);

  const totalPercepciones =
    (Number(sueldoBase) || 0) + (Number(bonos) || 0) + extraIngresos;
  const totalDeducciones =
    (Number(penalizaciones) || 0) + sumAnticipos + extraDeducciones;
  const totalNeto = totalPercepciones - totalDeducciones;

  // HANDLERS PARA CONCEPTOS DINÁMICOS
  const addConcepto = (tipo: "ingreso" | "deduccion") => {
    setConceptosExtra([
      ...conceptosExtra,
      { id: Date.now().toString(), tipo, descripcion: "", monto: "" },
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
    setSueldoBase("");
    setBonos("");
    setPenalizaciones("");
    setObservaciones("");
    setConceptosExtra([]); // 🚀 Limpiar conceptos al cerrar
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshTrips();
    setIsSyncing(false);
    toast.success("Sincronizado con vales de combustible");
  };

  const handleSettle = async () => {
    if (!odometroFinal) return toast.error("El odómetro final es obligatorio");

    // Validar que los conceptos extra no estén vacíos
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

      // 🚀 1. ARMAR EL PAQUETE FINANCIERO (Como lo espera el Backend de Gustavo)
      const conceptosBase = [
        {
          id: "sueldo",
          tipo: "ingreso",
          categoria: "tarifa",
          descripcion: "Sueldo Base",
          monto: Number(sueldoBase) || 0,
          esAutomatico: true,
        },
        {
          id: "bonos",
          tipo: "ingreso",
          categoria: "bono",
          descripcion: "Bonos Operativos",
          monto: Number(bonos) || 0,
          esAutomatico: false,
        },
        {
          id: "penalizacion",
          tipo: "deduccion",
          categoria: "descuento",
          descripcion: "Penalizaciones",
          monto: Number(penalizaciones) || 0,
          esAutomatico: false,
        },
        {
          id: "anticipos",
          tipo: "deduccion",
          categoria: "anticipo",
          descripcion: "Anticipos en Ruta",
          monto: sumAnticipos,
          esAutomatico: true,
        },
      ];

      // Mapear los Vales Azules / Gastos Extra
      const conceptosAdicionales = conceptosExtra.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        categoria: c.tipo === "ingreso" ? "bono" : "descuento",
        descripcion: c.descripcion,
        monto: Number(c.monto),
        esAutomatico: false,
      }));

      // Filtramos los que están en $0 para no ensuciar la base de datos
      const todosLosConceptos = [
        ...conceptosBase,
        ...conceptosAdicionales,
      ].filter((c) => c.monto > 0);

      const payloadLiquidacion = {
        conceptos: todosLosConceptos,
        total_ingresos: totalPercepciones,
        total_deducciones: totalDeducciones,
        neto_a_pagar: totalNeto,
      };

      // 🚀 2. ENVIAR A TESORERÍA (Al endpoint oficial)
      // Asegúrate de tener axiosClient importado arriba
      await axiosClient.post(
        `/trips/leg/${legId}/close-settlement`,
        payloadLiquidacion,
      );

      // 🚀 3. ACTUALIZAR ESTATUS DEL VIAJE Y BITÁCORA
      for (const item of activeLegs) {
        const tripId = item.trip?.id || item.trip_id;
        await updateTripStatus(
          String(tripId),
          "cerrado",
          `Liquidado. Neto: $${totalNeto.toFixed(2)}. Rendimiento: ${rendimientoReal.toFixed(2)} km/l. Obs: ${observaciones}`,
        );
      }

      toast.success("Liquidación guardada en Tesorería exitosamente");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error cerrando liquidación:", error);
      toast.error("Error al registrar los datos financieros en el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-50 rounded-2xl border-none shadow-2xl">
        {/* HEADER */}
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
          {/* LADO IZQUIERDO: RENDIMIENTO */}
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

          {/* LADO DERECHO: CALCULADORA FINANCIERA */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200">
              {/* SECCIÓN PERCEPCIONES (INGRESOS) */}
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
                    <Plus className="h-3 w-3 mr-1" /> Gasto Extra
                  </Button>
                </div>
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

                {/* 🚀 Renderizado de Conceptos Extra (Ingresos) */}
                {conceptosExtra
                  .filter((c) => c.tipo === "ingreso")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-2 items-end animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="space-y-1.5 flex-1">
                        <Input
                          placeholder="Concepto (Ej: Maniobras)"
                          value={c.descripcion}
                          onChange={(e) =>
                            updateConcepto(c.id, "descripcion", e.target.value)
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5 w-24">
                        <Input
                          type="number"
                          placeholder="$"
                          value={c.monto}
                          onChange={(e) =>
                            updateConcepto(
                              c.id,
                              "monto",
                              Number(e.target.value),
                            )
                          }
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-500 hover:bg-rose-50"
                        onClick={() => removeConcepto(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>

              {/* SECCIÓN DEDUCCIONES (EGRESOS) */}
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
                <div className="p-3 bg-rose-50/50 border border-dashed border-rose-200 rounded-xl">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                    <span>ANTICIPOS EN RUTA:</span>
                    <span className="text-rose-600 font-mono">
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

                {/* 🚀 Renderizado de Conceptos Extra (Deducciones) */}
                {conceptosExtra
                  .filter((c) => c.tipo === "deduccion")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-2 items-end animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="space-y-1.5 flex-1">
                        <Input
                          placeholder="Concepto (Ej: Multa Tránsito)"
                          value={c.descripcion}
                          onChange={(e) =>
                            updateConcepto(c.id, "descripcion", e.target.value)
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5 w-24">
                        <Input
                          type="number"
                          placeholder="$"
                          value={c.monto}
                          onChange={(e) =>
                            updateConcepto(
                              c.id,
                              "monto",
                              Number(e.target.value),
                            )
                          }
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-500 hover:bg-rose-50"
                        onClick={() => removeConcepto(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
