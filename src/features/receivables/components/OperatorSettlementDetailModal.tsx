import * as React from "react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import {
  Receipt,
  MapPin,
  Clock,
  Route,
  Activity,
  Fuel,
  Download,
  ShieldCheck,
  FileText,
  Gauge,
  DollarSign,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
  esAutomatico?: boolean;
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
  const [activeReceiptTab, setActiveReceiptTab] = React.useState<string>("");
  const [isExporting, setIsExporting] = React.useState(false); // <--- ESTADO CLAVE PARA EL PDF
  const pdfRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open && selectedLegsData?.length > 0) {
      setActiveReceiptTab(String(selectedLegsData[0].id));
    }
  }, [open, selectedLegsData]);

  const formatCurrencyLocal = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const finalAuditDetails = React.useMemo(() => {
    if (
      auditDetails &&
      auditDetails.hasData &&
      (Number(auditDetails.vales) > 0 || Number(auditDetails.km) > 0)
    ) {
      return auditDetails;
    }

    let totalKms = 0;
    let totalEcm = 0;
    let totalVales = 0;
    let totalPenalizacion = 0;

    if (previewData) {
      totalKms += Number(previewData.total_kms || 0);
      totalVales += Number(previewData.consumo_real || 0);
      totalEcm += Number(previewData.consumo_esperado || 0);
      totalPenalizacion += Number(previewData.deduccion_combustible || 0);
    }

    if (totalKms === 0 && totalVales === 0) {
      selectedLegsData.forEach((mov) => {
        const kRecorridos =
          mov.odometro_final && mov.odometro_inicial
            ? mov.odometro_final - mov.odometro_inicial
            : 0;
        totalKms += kRecorridos > 0 ? kRecorridos : 0;
        totalPenalizacion += Number(mov.monto_penalizaciones || 0);

        const auditEvent = mov.timeline_events?.find(
          (e: any) =>
            e.location === "Conciliación de Combustible" ||
            e.comments?.includes("Detalles Fase"),
        );
        if (auditEvent && auditEvent.comments) {
          const cleanText = auditEvent.comments.replace(/\n/g, " ");
          const vMatch = cleanText.match(/Vales:\s*([\d.,]+)/);
          const ecmMatch = cleanText.match(/Litros ECM:\s*([\d.,]+)/);
          if (vMatch) totalVales += Number(vMatch[1].replace(/,/g, ""));
          if (ecmMatch) totalEcm += Number(ecmMatch[1].replace(/,/g, ""));
        }
      });
    }

    const rend = totalVales > 0 ? (totalKms / totalVales).toFixed(2) : "0.00";
    const veredicto = totalPenalizacion > 0 ? "COBRO_OPERADOR" : "CONCILIADO";

    return {
      km: totalKms,
      ltEcm: totalEcm,
      vales: totalVales,
      rend: rend,
      veredicto: veredicto,
      fechaAudit: format(new Date(), "dd/MM/yyyy HH:mm"),
      textOriginal: `Conciliación sumatoria de ${selectedLegsData.length} movimiento(s) para este recibo.`,
    };
  }, [auditDetails, previewData, selectedLegsData]);

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);
    setIsExporting(true); // Forzamos a que todos los recibos se hagan visibles

    const htmlElement = document.documentElement;
    const wasDark = htmlElement.classList.contains("dark");

    if (wasDark) {
      htmlElement.classList.remove("dark");
    }

    // Damos tiempo a React de renderizar todos los Tabs en pantalla antes de la foto
    await new Promise((resolve) => setTimeout(resolve, 300));

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
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * canvasRatio;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const topOperatorName = selectedLegsData[0]?.operator?.name || "Operador";
      pdf.save(
        `Liquidacion_${topOperatorName}_${format(new Date(), "dd-MMM-yyyy")}.pdf`,
      );

      toast?.success?.("Documento PDF descargado con éxito");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast?.error?.("Error al generar el documento PDF");
    } finally {
      if (wasDark) htmlElement.classList.add("dark");
      setIsExporting(false); // Volvemos a ocultar los recibos no activos
      setIsGeneratingPDF(false);
    }
  };

  if (!selectedLegsData || selectedLegsData.length === 0) return null;

  const numLegs = selectedLegsData.length;

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          id="print-modal"
          className="w-[95vw] sm:max-w-4xl p-0 flex flex-col max-h-[90vh] bg-card/90 dark:bg-brand-navy/95 backdrop-blur-xl border-none shadow-2xl rounded-2xl overflow-hidden animate-modal-show print:static print:transform-none print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0 print:overflow-visible print:block"
        >
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
          .page-break { page-break-after: always; }
        `}</style>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100/80 dark:bg-slate-950/80 print:bg-white flex flex-col sm:p-6">
            {/* ======================= TABS NAVEGACIÓN ======================= */}
            {!isExporting && numLegs > 1 && (
              <div className="w-full flex justify-center mb-6 print:hidden shrink-0">
                <Tabs
                  value={activeReceiptTab}
                  onValueChange={setActiveReceiptTab}
                  className="w-full max-w-3xl"
                >
                  <TabsList className="w-full flex overflow-x-auto justify-start bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 h-auto custom-scrollbar">
                    {selectedLegsData.map((leg, index) => (
                      <TabsTrigger
                        key={`tab-${leg.id}`}
                        value={String(leg.id)}
                        className="px-6 py-2.5 font-bold data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-lg whitespace-nowrap text-xs uppercase tracking-widest text-slate-500 data-[state=active]:text-slate-900 dark:text-slate-400 dark:data-[state=active]:text-white transition-all"
                      >
                        Mvto #{index + 1} (TRP-
                        {leg.trip?.public_id || leg.trip?.id})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* ======================= CONTENEDOR DE TICKETS ======================= */}
            <div
              ref={pdfRef}
              className={cn(
                "w-full bg-transparent flex flex-col print:bg-white",
                isExporting ? "gap-6" : "gap-0", // Solo hay gap si se están mostrando todos para la foto
              )}
            >
              {selectedLegsData.map((leg, index) => {
                // LÓGICA DE VISIBILIDAD: Se muestra si está exportando PDF, si es el tab activo, o si solo hay 1 recibo
                const isVisible =
                  isExporting ||
                  activeReceiptTab === String(leg.id) ||
                  numLegs === 1;

                const isHistorico = activeTab === "historico";
                const legSueldoBase = isHistorico
                  ? leg.monto_sueldo || 0
                  : (liquidacion?.pagoBaseBruto || 0) / numLegs;
                const legBonos = isHistorico
                  ? leg.monto_bonos || 0
                  : (liquidacion?.bonosAdicionales || 0) / numLegs;
                const legManiobras = isHistorico
                  ? leg.monto_maniobras || 0
                  : (liquidacion?.deduccionesManuales || 0) / numLegs;
                const legPenalizacion = isHistorico
                  ? leg.monto_penalizaciones || 0
                  : (liquidacion?.combustibleFaltante || 0) / numLegs;

                const rawConceptos = isHistorico
                  ? leg.desglose_conceptos || []
                  : conceptosExtra.map((c) => ({
                      ...c,
                      monto: c.monto / numLegs,
                    }));

                const legConceptos = rawConceptos.filter(
                  (c: any) => !c.esAutomatico,
                );

                const legViaticos = leg.anticipo_viaticos || 0;
                const legCombustible = leg.anticipo_combustible || 0;
                const legOtrosAnticipos = leg.otros_anticipos || 0;

                const legNetoCalculado =
                  legSueldoBase +
                  legBonos -
                  (legManiobras +
                    legPenalizacion +
                    legViaticos +
                    legCombustible +
                    legOtrosAnticipos);

                let legAudit: any = {
                  km: "0",
                  ltEcm: "0",
                  vales: "0",
                  rend: "0.00",
                  veredicto:
                    legPenalizacion > 0 ? "COBRO_OPERADOR" : "CONCILIADO",
                  textOriginal: "Sin observaciones de auditoría registradas.",
                  fechaAudit: "N/A",
                };

                if (
                  isHistorico &&
                  auditDetails &&
                  auditDetails.hasData &&
                  numLegs === 1
                ) {
                  legAudit = auditDetails;
                } else {
                  const auditEvent = leg.timeline_events?.find(
                    (e: any) =>
                      e.location === "Conciliación de Combustible" ||
                      e.comments?.includes("Detalles Fase"),
                  );

                  if (auditEvent && auditEvent.comments) {
                    const cleanText = auditEvent.comments.replace(/\n/g, " ");
                    const kmMatch = cleanText.match(/Km ECM:\s*([\d.,]+)/);
                    const ltEcmMatch = cleanText.match(
                      /Litros ECM:\s*([\d.,]+)/,
                    );
                    const valesMatch = cleanText.match(/Vales:\s*([\d.,]+)/);
                    const rendMatch = cleanText.match(/Rend Real:\s*([\d.,]+)/);
                    const verMatch = cleanText.match(/Ver:\s*([A-Z_]+)/);

                    const extKm = kmMatch
                      ? Number(kmMatch[1].replace(/,/g, ""))
                      : 0;
                    const extLtEcm = ltEcmMatch
                      ? Number(ltEcmMatch[1].replace(/,/g, ""))
                      : 0;
                    const extVales = valesMatch
                      ? Number(valesMatch[1].replace(/,/g, ""))
                      : 0;

                    legAudit = {
                      km: String(extKm),
                      ltEcm: String(extLtEcm),
                      vales: String(extVales),
                      rend: rendMatch
                        ? rendMatch[1]
                        : extVales > 0
                          ? (extKm / extVales).toFixed(2)
                          : "0.00",
                      veredicto: verMatch
                        ? verMatch[1]
                        : legPenalizacion > 0
                          ? "COBRO_OPERADOR"
                          : "CONCILIADO",
                      textOriginal: auditEvent.comments,
                      fechaAudit: leg.last_update
                        ? format(new Date(leg.last_update), "dd/MM/yyyy HH:mm")
                        : "N/A",
                    };
                  } else if (!isHistorico && numLegs === 1 && previewData) {
                    legAudit = {
                      km: String(previewData.total_kms || 0),
                      ltEcm: String(previewData.consumo_esperado || 0),
                      vales: String(previewData.consumo_real || 0),
                      rend:
                        previewData.consumo_real > 0
                          ? (
                              previewData.total_kms / previewData.consumo_real
                            ).toFixed(2)
                          : "0.00",
                      veredicto:
                        legPenalizacion > 0 ? "COBRO_OPERADOR" : "CONCILIADO",
                      textOriginal: `Calculado en pre-liquidación. Dif: ${previewData.diferencia_litros?.toFixed(2) || "0.00"}L.`,
                      fechaAudit: format(new Date(), "dd/MM/yyyy HH:mm"),
                    };
                  }
                }

                return (
                  <div
                    key={leg.id}
                    className={cn(
                      "w-full max-w-3xl mx-auto transition-opacity duration-300",
                      isVisible ? "block" : "hidden",
                      index < numLegs - 1 && isExporting ? "page-break" : "",
                    )}
                  >
                    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 sm:p-10 shadow-2xl dark:shadow-black/50 ring-1 ring-slate-200/60 dark:ring-white/10 sm:rounded-2xl shrink-0 print:shadow-none print:ring-0 print:rounded-none print:p-0 print:max-w-none">
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
                            {format(new Date(), "dd/MMM/yyyy HH:mm", {
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* BODY */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-7 space-y-4">
                          {/* Detalles Operación Múltiple */}
                          <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <div className="flex justify-between items-center mb-3 border-b pb-2 border-slate-200 dark:border-white/10">
                              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                                Detalles de la Operación
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[8px] h-4 py-0 px-1 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                              >
                                Mvto. {index + 1} de {numLegs}
                              </Badge>
                            </div>
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
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                                  Folio Referencia
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                  {leg.trip?.public_id || `TRP-${leg.trip_id}`}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                                  Fase / Tipo
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                                  {leg.leg_type?.replace("_", " ")}
                                </span>
                              </div>

                              <div className="col-span-2 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[9px] uppercase font-black text-slate-500 block mb-1 tracking-widest">
                                      Trayecto Ejecutado
                                    </span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2 truncate">
                                      <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                      {leg.trip?.origin || "Patio Origen"}
                                      <span className="text-slate-300 dark:text-slate-600 mx-1 shrink-0">
                                        ➔
                                      </span>
                                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                                      {leg.trip?.destination || "Patio Destino"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-black text-slate-500 block mb-1 tracking-widest">
                                      Cliente y Contenedores
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">
                                      {" "}
                                      {leg.trip?.clientName ||
                                        "Movimiento Interno"}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 block truncate">
                                      Contenedores:{" "}
                                      {[
                                        leg.trip?.contenedor_1,
                                        leg.trip?.contenedor_2,
                                      ]
                                        .filter(Boolean)
                                        .join(" / ") || "Sin caja asignada"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm break-inside-avoid mt-4">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                                Conciliación Diésel
                              </span>
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {legAudit.fechaAudit}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center shadow-sm flex flex-col justify-center items-center">
                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                                  KMs ECM
                                </p>
                                <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                                  {Number(legAudit.km || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center shadow-sm flex flex-col justify-center items-center">
                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                                  Litros ECM
                                </p>
                                <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                                  {Number(legAudit.ltEcm || 0).toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20 text-center shadow-sm flex flex-col justify-center items-center">
                                <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 mb-1 tracking-tighter">
                                  Litros Vales
                                </p>
                                <p className="font-mono font-black text-amber-700 dark:text-amber-300 text-sm">
                                  {Number(legAudit.vales || 0).toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-100 dark:border-blue-500/20 flex flex-col justify-center items-center text-center shadow-sm">
                                <p className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 mb-1 tracking-widest">
                                  Rend. Real
                                </p>
                                <p className="font-mono font-black text-blue-700 dark:text-blue-300 text-lg flex items-baseline gap-1">
                                  {legAudit.rend || "0.00"}
                                  <span className="text-[9px] font-bold uppercase opacity-60">
                                    km/L
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-blue-400" />{" "}
                                Notas Adicionales
                              </p>
                              <p className="text-[10px] font-mono font-medium leading-relaxed italic text-slate-600 dark:text-slate-400">
                                {legAudit.textOriginal ||
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
                                  {Number(
                                    leg?.odometro_final || 0,
                                  ).toLocaleString()}{" "}
                                  km
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-5 flex flex-col justify-between">
                          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 p-5 rounded-xl shadow-sm space-y-4 flex-1 mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                              Desglose Financiero (Por Movimiento)
                            </h4>

                            <div className="space-y-3 text-xs font-medium">
                              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                <span>Sueldo Base (Proporcional)</span>
                                <span className="font-mono font-semibold">
                                  {formatCurrencyLocal(legSueldoBase)}
                                </span>
                              </div>

                              {legConceptos
                                .filter(
                                  (c: ConceptoExtra) => c.tipo === "ingreso",
                                )
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

                              {legViaticos > 0 && (
                                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                                  <span>Anticipo de Viáticos</span>
                                  <span className="font-mono font-semibold">
                                    -{formatCurrencyLocal(legViaticos)}
                                  </span>
                                </div>
                              )}

                              {legCombustible > 0 && (
                                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                                  <span>Vales Combustible (Anticipo)</span>
                                  <span className="font-mono font-semibold">
                                    -{formatCurrencyLocal(legCombustible)}
                                  </span>
                                </div>
                              )}

                              {legOtrosAnticipos > 0 && (
                                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                                  <span>Otros Anticipos</span>
                                  <span className="font-mono font-semibold">
                                    -{formatCurrencyLocal(legOtrosAnticipos)}
                                  </span>
                                </div>
                              )}

                              {legPenalizacion > 0 && (
                                <div className="flex justify-between items-start text-rose-600 dark:text-rose-400 font-bold">
                                  <div className="flex flex-col">
                                    <span>Faltante Diésel (Penalización)</span>
                                  </div>
                                  <span className="font-mono font-black mt-0.5">
                                    -{formatCurrencyLocal(legPenalizacion)}
                                  </span>
                                </div>
                              )}

                              {legConceptos
                                .filter(
                                  (c: ConceptoExtra) => c.tipo === "deduccion",
                                )
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

                          {/* GRAN TOTAL POR MOVIMIENTO */}
                          <div className="relative bg-slate-900 dark:bg-black p-5 rounded-xl shadow-lg flex justify-between items-center overflow-hidden shrink-0 border dark:border-white/10">
                            <div className="relative z-10">
                              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                                Neto por Movimiento
                              </span>
                              <span className="text-3xl font-black font-mono text-white tracking-tight">
                                {formatCurrencyLocal(legNetoCalculado)}
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
                                Recibe (Mvto {index + 1})
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
                          Este documento ampara la liquidación individual del
                          movimiento #{leg.trip?.public_id || leg.trip_id}. Al
                          firmar, el operador acepta de conformidad los
                          descuentos y pagos realizados para esta fase
                          operativa.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                "Generando Documentos..."
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descargar Recibos (PDF)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
