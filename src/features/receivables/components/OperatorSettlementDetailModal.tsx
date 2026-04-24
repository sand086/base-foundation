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
  Fuel,
  GaugeCircle,
  Download,
  ShieldCheck,
  CheckCircle,
  ShieldAlert,
  FileText,
  Gauge,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
}

interface LiquidacionData {
  pagoBaseBruto?: number;
  neto_a_pagar?: number;
  combustibleFaltante?: number;
  consumoEsperadoLitros?: number;
  consumoRealLitros?: number;
  diferenciaLitros?: number;
  rendimientoReal?: number;
  [key: string]: any;
}

interface ModalDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLegsData: any[];
  liquidacion: LiquidacionData;
  conceptosExtra: ConceptoExtra[];
  previewData: any;
  activeTab: "pendientes" | "historico";
  empresaNombre: string;
  empresaRFC: string;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaLogo: string;
  auditDetails?: any;
}

export function OperatorSettlementDetailModal({
  open,
  onOpenChange,
  selectedLegsData,
  liquidacion,
  conceptosExtra,
  previewData,
  activeTab,
  empresaNombre,
  empresaRFC,
  empresaDireccion,
  empresaTelefono,
  empresaLogo,
  auditDetails,
}: ModalDetailsProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const pdfRef = React.useRef<HTMLDivElement>(null);

  const formatCurrencyLocal = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const leg = selectedLegsData[0];

  // ==========================================
  // 🚀 LA MAGIA SUCEDE AQUÍ: CONSTRUCTOR DE CONCILIACIÓN
  // ==========================================
  const finalAuditDetails = React.useMemo(() => {
    if (auditDetails && auditDetails.hasData) {
      return auditDetails;
    }

    if (
      activeTab === "pendientes" &&
      previewData &&
      (previewData.consumo_real > 0 || previewData.consumo_esperado > 0)
    ) {
      const kms = previewData.total_kms || 0;
      const vales = previewData.consumo_real || 0;
      const ecm = previewData.consumo_esperado || 0;
      const rend = vales > 0 ? (kms / vales).toFixed(2) : "0.00";
      const tieneMulta = (previewData.deduccion_combustible || 0) > 0;

      return {
        km: kms,
        ltEcm: ecm,
        vales: vales,
        rend: rend,
        veredicto: tieneMulta ? "COBRO_OPERADOR" : "CONCILIADO",
        fechaAudit: format(new Date(), "dd/MM/yyyy HH:mm"),
        textOriginal: `Calculado en pre-liquidación. Dif: ${previewData.diferencia_litros?.toFixed(2)}L. ${previewData.alertas?.length > 0 ? "Alertas: " + previewData.alertas.join(", ") : ""}`,
      };
    }

    return null;
  }, [auditDetails, previewData, activeTab]);

  const listaConceptos =
    activeTab === "pendientes" ? conceptosExtra : leg?.desglose_conceptos || [];

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

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);

    // 🚀 TRUCO MAESTRO: Forzamos el modo claro temporalmente para la "foto"
    const htmlElement = document.documentElement;
    const wasDark = htmlElement.classList.contains("dark");

    if (wasDark) {
      htmlElement.classList.remove("dark");
      // Pausa para que el navegador repinte la pantalla (efecto flash de cámara)
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `Liquidacion_${leg?.operator?.name || "Operador"}_${format(new Date(), "dd-MMM-yyyy")}.pdf`,
      );

      toast?.success?.("Documento PDF descargado con éxito");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast?.error?.("Error al generar el documento PDF");
    } finally {
      // Restauramos el modo oscuro inmediatamente después de la captura
      if (wasDark) {
        htmlElement.classList.add("dark");
      }
      setIsGeneratingPDF(false);
    }
  };

  if (!leg) return null;

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          id="print-modal"
          className="w-[95vw] sm:max-w-4xl p-0 flex flex-col max-h-[90vh] bg-card/90 dark:bg-brand-navy/95 backdrop-blur-xl border-none shadow-2xl rounded-2xl overflow-hidden animate-modal-show print:static print:transform-none print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0 print:overflow-visible print:block"
        >
          {/* SR Only Title para accesibilidad y evitar warnings de Radix */}
          <DialogTitle className="sr-only">
            Detalle de Recibo de Liquidación
          </DialogTitle>

          <style media="print">{`
          @page { size: letter; margin: 15mm; }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > *:not([data-radix-portal]) { display: none !important; }
          [data-radix-portal] > div:first-child { display: none !important; }
          [data-radix-portal], [role="dialog"], #print-modal {
            position: static !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        `}</style>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100/80 dark:bg-slate-950/80 print:bg-white flex justify-center sm:p-6">
            {/* EL "PAPEL" DEL RECIBO */}
            <div
              ref={pdfRef}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-3xl min-h-max p-6 sm:p-10 shadow-2xl dark:shadow-black/50 ring-1 ring-slate-200/60 dark:ring-white/10 sm:rounded-2xl shrink-0 print:shadow-none print:ring-0 print:rounded-none print:p-0 print:max-w-none transition-colors duration-300"
            >
              {/* HEADER */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/10 pb-6 mb-6">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner shrink-0 border border-slate-200 dark:border-white/10 overflow-hidden">
                    {empresaLogo ? (
                      <img
                        src={empresaLogo}
                        alt="Logo"
                        crossOrigin="anonymous"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-slate-900 dark:text-white" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                      {empresaNombre || "OPERADOR LOGÍSTICO"}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-mono font-bold mt-1">
                      RFC: {empresaRFC || "XAXX010101000"}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-[9px] sm:text-[10px] max-w-sm mt-0.5 leading-tight">
                      {empresaDireccion} • Tel: {empresaTelefono}
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider border border-slate-200 dark:border-white/10 shadow-sm">
                    LIQ-{leg.id}-{String(Date.now()).slice(-4)}
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-mono">
                    {format(new Date(), "dd/MMM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              {/* BODY */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-4">
                  {/* Detalles Operación */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 mb-3 block border-b pb-2 border-slate-200 dark:border-white/10">
                      Detalles de la Operación
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                          Operador
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-sm truncate">
                          {leg.operator?.name || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                          Tracto / Eco
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {leg.unit
                            ? `${leg.unit.marca || ""} ${leg.unit.modelo || ""} • Eco: ${leg.unit.numero_economico} (${leg.unit.placas})`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                          Trayecto
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-emerald-500" />{" "}
                          {leg.trip?.origin || "S/D"}
                          <span className="text-slate-300 dark:text-slate-600 mx-1">
                            ➔
                          </span>
                          <MapPin className="h-3 w-3 text-rose-500" />{" "}
                          {leg.trip?.destination || "S/D"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50/50 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-100 dark:border-blue-500/20 flex flex-col items-center justify-center text-center">
                      <Route className="h-5 w-5 text-blue-500 dark:text-blue-400 mb-1" />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        Recorrido
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                        {calcOperativos.distancia}
                      </span>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20 flex flex-col items-center justify-center text-center">
                      <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 mb-1" />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        Duración
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                        {calcOperativos.tiempo}
                      </span>
                    </div>
                    <div className="bg-purple-50/50 dark:bg-purple-500/10 p-3 rounded-xl border border-purple-100 dark:border-purple-500/20 flex flex-col items-center justify-center text-center">
                      <Activity className="h-5 w-5 text-purple-500 dark:text-purple-400 mb-1" />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        Paradas / Evt
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                        {calcOperativos.paradas} reg.
                      </span>
                    </div>
                  </div>

                  {/* ========================================== */}
                  {/* 4. BLOQUE UI DE AUDITORÍA DINÁMICO */}
                  {/* ========================================== */}
                  {finalAuditDetails ? (
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm break-inside-avoid mt-4">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <ShieldCheck className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                          Auditoría y Conciliación de Diésel
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">
                          Fecha Audit: {finalAuditDetails.fechaAudit}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center shadow-sm">
                          <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                            KMs ECM
                          </p>
                          <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                            {Number(finalAuditDetails.km || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center shadow-sm">
                          <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                            Litros ECM
                          </p>
                          <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                            {Number(finalAuditDetails.ltEcm || 0).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20 text-center shadow-sm">
                          <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 mb-1 tracking-tighter">
                            Litros Vales
                          </p>
                          <p className="font-mono font-black text-amber-700 dark:text-amber-300 text-sm">
                            {Number(finalAuditDetails.vales || 0).toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-100 dark:border-blue-500/20 flex flex-col justify-center items-center text-center shadow-sm">
                          <p className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 mb-1 tracking-widest">
                            Rendimiento Real
                          </p>
                          <p className="font-mono font-black text-blue-700 dark:text-blue-300 text-xl flex items-baseline gap-1">
                            {finalAuditDetails.rend || "0.00"}
                            <span className="text-[10px] font-bold uppercase opacity-60">
                              km/L
                            </span>
                          </p>
                        </div>
                        <div
                          className={cn(
                            "p-3 rounded-lg border flex flex-col justify-center items-center text-center shadow-sm",
                            finalAuditDetails.veredicto === "COBRO_OPERADOR"
                              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                              : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {finalAuditDetails.veredicto === "COBRO_OPERADOR" ? (
                            <ShieldAlert className="h-4 w-4 mb-1 text-rose-500 dark:text-rose-400" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mb-1 text-emerald-500 dark:text-emerald-400" />
                          )}
                          <p className="text-[9px] uppercase font-black tracking-widest mb-0.5 opacity-80">
                            Estatus Final
                          </p>
                          <p className="font-black text-xs uppercase leading-tight">
                            {finalAuditDetails.veredicto?.replace(/_/g, " ") ||
                              "CONCILIADO"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-blue-400" />{" "}
                          Detalles / Deducción de ruta
                        </p>
                        <p className="text-[10px] font-mono font-medium leading-relaxed italic text-slate-600 dark:text-slate-400">
                          {finalAuditDetails.textOriginal ||
                            "Sin observaciones adicionales registradas en la auditoría."}
                        </p>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                          <Gauge className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Odómetro Cerrado:
                          </span>
                          <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                            {Number(leg?.odometro_final || 0).toLocaleString()}{" "}
                            km
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 🚀 ALERTA DE QUE ESTE TRAMO NO TIENE DIÉSEL REGISTRADO
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center text-center mt-4">
                      <Fuel className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Sin datos de Combustible
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                        Este movimiento no cuenta con un dictamen de auditoría
                        de diésel o es un movimiento que no requiere combustible
                        (Ej. Patio).
                      </p>
                    </div>
                  )}
                  {/* FIN BLOQUE AUDITORIA */}
                </div>

                <div className="md:col-span-5 flex flex-col justify-between">
                  <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 p-5 rounded-xl shadow-sm space-y-4 flex-1 mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                      Desglose Financiero
                    </h4>

                    <div className="space-y-3 text-xs font-medium">
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
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
                            className="flex justify-between items-center text-emerald-600 dark:text-emerald-400"
                          >
                            <span>{c.descripcion}</span>
                            <span className="font-mono font-semibold">
                              +{formatCurrencyLocal(c.monto)}
                            </span>
                          </div>
                        ))}

                      <div className="my-2 border-b border-dashed border-slate-200 dark:border-slate-700"></div>

                      {(leg?.anticipo_viaticos || 0) > 0 && (
                        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                          <span>Anticipo de Viáticos</span>
                          <span className="font-mono font-semibold">
                            -{formatCurrencyLocal(leg.anticipo_viaticos)}
                          </span>
                        </div>
                      )}

                      {(leg?.anticipo_combustible || 0) > 0 && (
                        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                          <span>Vales de Combustible (Anticipos)</span>
                          <span className="font-mono font-semibold">
                            -{formatCurrencyLocal(leg.anticipo_combustible)}
                          </span>
                        </div>
                      )}

                      {(leg?.otros_anticipos || 0) > 0 && (
                        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                          <span>Otros Anticipos Operativos</span>
                          <span className="font-mono font-semibold">
                            -{formatCurrencyLocal(leg.otros_anticipos)}
                          </span>
                        </div>
                      )}

                      {(liquidacion?.combustibleFaltante || 0) > 0 && (
                        <div className="flex justify-between items-start text-rose-600 dark:text-rose-400 font-bold">
                          <div className="flex flex-col">
                            <span>Faltante Diésel (Penalización)</span>
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
                            className="flex justify-between items-center text-rose-600 dark:text-rose-400"
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
                  <div className="relative bg-slate-900 dark:bg-black p-5 rounded-xl shadow-lg flex justify-between items-center overflow-hidden shrink-0 border dark:border-white/10">
                    <div className="relative z-10">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                        Total Depositado
                      </span>
                      <span className="text-3xl font-black font-mono text-white tracking-tight">
                        {formatCurrencyLocal(liquidacion?.neto_a_pagar || 0)}
                      </span>
                    </div>
                    <div className="relative z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
                      <DollarSign className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* FIRMAS */}
              <div className="mt-12 pt-8 break-inside-avoid">
                <div className="relative flex items-center pb-8 mb-8">
                  <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700"></div>
                </div>
                <div className="flex justify-between gap-12 sm:gap-24 px-8 md:px-16 mb-8">
                  <div className="flex-1 text-center">
                    <div className="border-t border-slate-800 dark:border-slate-500 pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300">
                        Conformidad
                      </p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 truncate">
                        {leg.operator?.name || "Firma del Operador"}
                      </p>
                      <p className="text-[8px] text-slate-500 font-medium mt-0.5">
                        Recibe
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="border-t border-slate-800 dark:border-slate-500 pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300">
                        Autorización
                      </p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 truncate">
                        Depto. Finanzas / Dispatch
                      </p>
                      <p className="text-[8px] text-slate-500 font-medium mt-0.5">
                        Entrega
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] text-slate-500 text-center leading-relaxed px-4 md:px-12">
                  Este documento ampara la liquidación de los movimientos
                  descritos. Al firmar, el operador acepta de conformidad los
                  descuentos y pagos realizados, no reservándose acción ni
                  derecho legal en contra de la empresa.
                </p>
              </div>
            </div>
          </div>

          {/* FOOTER - BOTONES */}
          <DialogFooter className="p-4 sm:p-6 bg-white/90 dark:bg-brand-navy/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3 print:hidden shrink-0 z-10">
            <Button
              className="w-full sm:w-auto min-w-[120px] font-black uppercase tracking-widest text-[10px] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isGeneratingPDF}
            >
              Cerrar
            </Button>

            <Button
              className="w-full sm:w-auto min-w-[220px] gap-2 font-black uppercase tracking-widest text-[10px] border-none text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-lg transition-transform active:scale-95"
              size="lg"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                "Generando Documento..."
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descargar / Guardar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
