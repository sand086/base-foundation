import * as React from "react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import {
  Receipt,
  Truck,
  DollarSign,
  Printer,
  MapPin,
  Clock,
  Route,
  Activity,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
}

interface ModalDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLegsData: any[];
  liquidacion: any;
  conceptosExtra: ConceptoExtra[];
  previewData: any;
  activeTab: "pendientes" | "historico";
  empresaNombre: string;
  empresaRFC: string;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaLogo: string;
}

export function OperatorSettlementDetailModal({
  open,
  onOpenChange,
  selectedLegsData,
  liquidacion,
  conceptosExtra, // Lo que escribes en vivo
  previewData,
  activeTab,
  empresaNombre,
  empresaRFC,
  empresaDireccion,
  empresaTelefono,
  empresaLogo,
}: ModalDetailsProps) {
  const formatCurrencyLocal = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const leg = selectedLegsData[0];

  // MAGIA: Decidimos de dónde leer los conceptos desmenuzados
  const listaConceptos =
    activeTab === "pendientes" ? conceptosExtra : leg?.desglose_conceptos || [];

  // Cálculos operativos (Tiempo, Distancia, Paradas)
  const calcOperativos = React.useMemo(() => {
    if (!leg) return { distancia: "N/A", tiempo: "N/A", paradas: 0 };

    let distancia = "0 km";
    if (
      leg.odometro_final &&
      leg.odometro_inicial &&
      leg.odometro_final >= leg.odometro_inicial
    ) {
      distancia = `${(leg.odometro_final - leg.odometro_inicial).toLocaleString()} km`;
    } else if (previewData?.total_kms) {
      distancia = `${previewData.total_kms.toLocaleString()} km (Est.)`;
    }

    let tiempo = "N/A";
    if (leg.start_date && (leg.actual_arrival || leg.last_update)) {
      const start = new Date(leg.start_date);
      const end = new Date(leg.actual_arrival || leg.last_update);
      const mins = differenceInMinutes(end, start);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      tiempo = `${hours}h ${remainingMins}m`;
    }

    const paradas = leg.timeline_events?.length || 0;
    return { distancia, tiempo, paradas };
  }, [leg, previewData]);

  if (!leg) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl p-0 flex flex-col max-h-[90vh] bg-card/90 dark:bg-card/95 backdrop-blur-xl border-none shadow-2xl rounded-2xl overflow-hidden animate-modal-show print:fixed print:inset-0 print:w-screen print:h-screen print:max-h-none print:max-w-none print:border-none print:shadow-none print:rounded-none print:bg-white print:m-0 print:z-50 print:block">
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.02] pointer-events-none print:opacity-5 print:hidden">
          <Truck className="w-[400px] h-[400px] transform -rotate-12" />
        </div>

        {/* HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden print:bg-white print:border-black print:pb-4 print:pt-8">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none print:hidden" />

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden print:border-none print:shadow-none">
                {empresaLogo ? (
                  <img
                    src={empresaLogo}
                    alt="Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-brand-navy print:text-black" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none print:text-black">
                  {empresaNombre || "Operador Logístico"}
                </DialogTitle>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-mono font-bold mt-1 print:text-slate-600">
                  RFC: {empresaRFC || "XAXX010101000"}
                </p>
                <p className="text-slate-600 dark:text-slate-500 text-[9px] sm:text-[10px] max-w-sm mt-0.5 leading-tight print:text-slate-500">
                  {empresaDireccion} • Tel: {empresaTelefono}
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1.5">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm print:bg-transparent print:border-slate-400 print:text-black print:shadow-none">
                LIQ-{leg.id}-{String(Date.now()).slice(-4)}
              </span>
              <p className="text-slate-500 text-[10px] sm:text-xs font-mono print:text-slate-600">
                {format(new Date(), "dd/MMM/yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar print:overflow-visible print:bg-white print:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 print:gap-8">
            {/* COLUMNA IZQUIERDA (Info Viaje y Estadísticas) */}
            <div className="md:col-span-7 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm print:shadow-none print:border-slate-300">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 block border-b pb-2 border-slate-100 dark:border-slate-800 print:border-slate-200">
                  Detalles de la Operación
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Operador
                    </span>
                    <span className="font-black text-brand-navy dark:text-white text-sm truncate print:text-black">
                      {leg.operator?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Tracto / Eco
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs print:text-black">
                      {leg.unit
                        ? `${leg.unit.marca || ""} ${leg.unit.modelo || ""} • Eco: ${leg.unit.numero_economico} (${leg.unit.placas})`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Trayecto
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs print:text-black flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-emerald-500" />{" "}
                      {leg.trip?.origin || "S/D"}
                      <span className="text-slate-300 mx-1">➔</span>
                      <MapPin className="h-3 w-3 text-rose-500" />{" "}
                      {leg.trip?.destination || "S/D"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estadísticas Extraídas de Bitácora */}
              <div className="grid grid-cols-3 gap-3 print:gap-4">
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 print:bg-white print:border-slate-300 flex flex-col items-center justify-center text-center">
                  <Route className="h-5 w-5 text-blue-500 mb-1" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Recorrido
                  </span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm print:text-black">
                    {calcOperativos.distancia}
                  </span>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 print:bg-white print:border-slate-300 flex flex-col items-center justify-center text-center">
                  <Clock className="h-5 w-5 text-amber-500 mb-1" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Duración
                  </span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm print:text-black">
                    {calcOperativos.tiempo}
                  </span>
                </div>
                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 print:bg-white print:border-slate-300 flex flex-col items-center justify-center text-center">
                  <Activity className="h-5 w-5 text-purple-500 mb-1" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Paradas / Evt
                  </span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm print:text-black">
                    {calcOperativos.paradas} reg.
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA (Finanzas) */}
            <div className="md:col-span-5 flex flex-col justify-between">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-xl shadow-sm space-y-4 flex-1 mb-4 print:shadow-none print:border-slate-300 print:p-0 print:mb-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2 print:text-slate-600 print:border-slate-300">
                  Desglose Financiero
                </h4>

                <div className="space-y-3 text-xs font-medium">
                  {/* SECCIÓN 1: INGRESOS Y BONOS */}
                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 print:text-black">
                    <span>Sueldo Base Operativo</span>
                    <span className="font-mono font-semibold">
                      {formatCurrencyLocal(liquidacion?.pagoBaseBruto || 0)}
                    </span>
                  </div>

                  {listaConceptos
                    .filter((c: ConceptoExtra) => c.tipo === "ingreso")
                    .map((c: ConceptoExtra) => (
                      <div
                        key={c.id}
                        className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 print:text-black"
                      >
                        <span>{c.descripcion}</span>
                        <span className="font-mono font-semibold">
                          +{formatCurrencyLocal(c.monto)}
                        </span>
                      </div>
                    ))}

                  <div className="my-2 border-b border-dashed border-slate-200 dark:border-slate-700 print:border-slate-300"></div>

                  {/* SECCIÓN 2: ANTICIPOS Y VALES */}
                  {(leg?.anticipo_viaticos || 0) > 0 && (
                    <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 print:text-black">
                      <span>Anticipo de Viáticos</span>
                      <span className="font-mono font-semibold">
                        -{formatCurrencyLocal(leg.anticipo_viaticos)}
                      </span>
                    </div>
                  )}

                  {(leg?.anticipo_combustible || 0) > 0 && (
                    <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 print:text-black">
                      <span>Vales de Combustible (Anticipos)</span>
                      <span className="font-mono font-semibold">
                        -{formatCurrencyLocal(leg.anticipo_combustible)}
                      </span>
                    </div>
                  )}

                  {(leg?.otros_anticipos || 0) > 0 && (
                    <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 print:text-black">
                      <span>Otros Anticipos Operativos</span>
                      <span className="font-mono font-semibold">
                        -{formatCurrencyLocal(leg.otros_anticipos)}
                      </span>
                    </div>
                  )}

                  {/* SECCIÓN 3: PENALIZACIONES Y DESCUENTOS */}
                  {(liquidacion?.combustibleFaltante || 0) > 0 && (
                    <div className="flex justify-between items-start text-rose-600 dark:text-rose-400 print:text-black font-bold">
                      <div className="flex flex-col">
                        <span>Faltante Diésel (Registro de detalles)</span>
                      </div>
                      <span className="font-mono font-black mt-0.5">
                        -
                        {formatCurrencyLocal(
                          liquidacion?.combustibleFaltante || 0,
                        )}
                      </span>
                    </div>
                  )}

                  {listaConceptos
                    .filter((c: ConceptoExtra) => c.tipo === "deduccion")
                    .map((c: ConceptoExtra) => (
                      <div
                        key={c.id}
                        className="flex justify-between items-center text-rose-600 dark:text-rose-400 print:text-black"
                      >
                        <span>{c.descripcion}</span>
                        <span className="font-mono font-semibold">
                          -{formatCurrencyLocal(c.monto)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* GRAN TOTAL */}
              <div className="relative bg-slate-900 p-5 rounded-xl shadow-lg flex justify-between items-center overflow-hidden shrink-0 print:bg-white print:border-2 print:border-black print:shadow-none print:mt-4">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-navy to-slate-900 z-0 print:hidden"></div>
                <div className="relative z-10">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 print:text-black">
                    Total Depositado
                  </span>
                  <span className="text-3xl font-black font-mono text-white tracking-tight print:text-black">
                    {formatCurrencyLocal(liquidacion?.neto_a_pagar || 0)}
                  </span>
                </div>
                <div className="relative z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 print:border-none print:bg-transparent">
                  <DollarSign className="h-6 w-6 text-emerald-400 print:text-black" />
                </div>
              </div>
            </div>
          </div>

          {/* FIRMAS */}
          <div className="mt-12 pt-8 print:pt-16 print:mt-16">
            <div className="relative flex items-center pb-8 mb-8 print:pb-12 ">
              <div className="w-full border-t-2 border-dashed border-slate-300 print:border-black/40"></div>
            </div>
            <div className="flex justify-between gap-12 sm:gap-24 px-8 md:px-16 mb-8 print:px-12">
              <div className="flex-1 text-center">
                <div className="border-t border-slate-800 print:border-black pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 print:text-black">
                    Conformidad
                  </p>
                  <p className="text-xs font-bold text-slate-600 mt-1 truncate print:text-slate-800">
                    {leg.operator?.name || "Firma del Operador"}
                  </p>
                  <p className="text-[8px] text-slate-500 font-medium mt-0.5 print:text-slate-600">
                    Recibe
                  </p>
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="border-t border-slate-800 print:border-black pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 print:text-black">
                    Autorización
                  </p>
                  <p className="text-xs font-bold text-slate-600 mt-1 truncate print:text-slate-800">
                    Depto. Finanzas / Dispatch
                  </p>
                  <p className="text-[8px] text-slate-500 font-medium mt-0.5 print:text-slate-600">
                    Entrega
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[8px] text-slate-500 text-center leading-relaxed px-4 md:px-12 print:text-slate-600 print:max-w-2xl print:mx-auto">
              Este documento ampara la liquidación de los movimientos descritos.
              Al firmar, el operador acepta de conformidad los descuentos y
              pagos realizados, no reservándose acción ni derecho legal en
              contra de la empresa.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 sm:p-6 bg-card/80 dark:bg-card/80 backdrop-blur-md border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-3 print:hidden">
          <Button
            className="w-full sm:w-auto min-w-[120px] haptic-press font-black uppercase tracking-widest text-[10px]"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            className="w-full sm:w-auto min-w-[220px] gap-2 haptic-press font-black uppercase tracking-widest text-[10px] border-none text-white bg-brand-dark hover:bg-brand-dark/90 shadow-lg"
            size="lg"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Imprimir Documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
