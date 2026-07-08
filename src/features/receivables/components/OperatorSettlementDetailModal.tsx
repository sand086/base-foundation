import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Receipt,
  MapPin,
  Activity,
  Download,
  ShieldCheck,
  FileText,
  Gauge,
  DollarSign,
  Truck,
  Snowflake,
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
  const [isExporting, setIsExporting] = React.useState(false);
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

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);
    setIsExporting(true);

    const htmlElement = document.documentElement;
    const wasDark = htmlElement.classList.contains("dark");

    if (wasDark) {
      htmlElement.classList.remove("dark");
    }

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
      setIsExporting(false);
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
                isExporting ? "gap-6" : "gap-0",
              )}
            >
              {selectedLegsData.map((leg, index) => {
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
                const legPenalizacion = isHistorico
                  ? leg.monto_penalizaciones || 0
                  : (liquidacion?.combustibleFaltante || 0) / numLegs;

                // ⚡ EXTRACCIÓN QUIRÚRGICA: Leemos exactamente lo que se escribió en la conciliación
                let pTracto = 0;
                let pMoto = 0;
                let extKm = 0,
                  extLtEcm = 0,
                  extVales = 0,
                  rendTracto = "0.00",
                  txtTracto = "";
                let extHorasMoto = 0,
                  extLtEcmMoto = 0,
                  extValesMoto = 0,
                  rendMoto = "0.00",
                  txtMoto = "";

                const auditEvents =
                  leg.timeline_events?.filter(
                    (e: any) =>
                      e.location === "Conciliación de Combustible" ||
                      e.comments?.includes("Detalles Fase"),
                  ) || [];

                const tractoEvents = auditEvents.filter(
                  (e: any) => !e.comments?.includes("(MG)"),
                );
                const mgEvents = auditEvents.filter((e: any) =>
                  e.comments?.includes("(MG)"),
                );

                if (tractoEvents.length > 0) {
                  const u = tractoEvents[tractoEvents.length - 1]; // Toma el último
                  txtTracto = u.comments || "";
                  const kmM = txtTracto.match(/(?:Km|Hrs) ECM:\s*([\d.,]+)/);
                  const ltM = txtTracto.match(/Litros ECM:\s*([\d.,]+)/);
                  const valM = txtTracto.match(
                    /Vales(?:\s+Tracto)?:\s*([\d.,]+)/,
                  );
                  const rM = txtTracto.match(/Rend Real:\s*([\d.,]+)/);
                  const descM = txtTracto.match(/descuento de \$([\d.,]+)/i);

                  if (kmM) extKm = Number(kmM[1].replace(/,/g, ""));
                  if (ltM) extLtEcm = Number(ltM[1].replace(/,/g, ""));
                  if (valM) extVales = Number(valM[1].replace(/,/g, ""));
                  if (rM) rendTracto = rM[1];
                  if (descM) pTracto = Number(descM[1].replace(/,/g, ""));
                }

                if (mgEvents.length > 0) {
                  const u = mgEvents[mgEvents.length - 1]; // Toma el último
                  txtMoto = u.comments || "";
                  const kmM = txtMoto.match(/(?:Km|Hrs) ECM:\s*([\d.,]+)/);
                  const ltM = txtMoto.match(/Litros ECM:\s*([\d.,]+)/);
                  const valM = txtMoto.match(/Vales(?:\s+Moto)?:\s*([\d.,]+)/);
                  const rM = txtMoto.match(/Rend Real:\s*([\d.,]+)/);
                  const descM = txtMoto.match(/descuento de \$([\d.,]+)/i);

                  if (kmM) extHorasMoto = Number(kmM[1].replace(/,/g, ""));
                  if (ltM) extLtEcmMoto = Number(ltM[1].replace(/,/g, ""));
                  if (valM) extValesMoto = Number(valM[1].replace(/,/g, ""));
                  if (rM) rendMoto = rM[1];
                  if (descM) pMoto = Number(descM[1].replace(/,/g, ""));
                }

                // Fallback si la regex falló pero sabemos que hay penalización
                if (pTracto === 0 && pMoto === 0 && legPenalizacion > 0) {
                  pTracto = legPenalizacion;
                }

                const penalizacionTracto = pTracto;
                const penalizacionMoto = pMoto;

                const legAudit: any = {
                  km: String(extKm),
                  ltEcm: String(extLtEcm),
                  vales: String(extVales),
                  rend: rendTracto,
                  horasMoto: String(extHorasMoto),
                  ltMoto: String(extLtEcmMoto),
                  valesMoto: String(extValesMoto),
                  rendMoto: rendMoto,
                  veredicto:
                    penalizacionTracto > 0 || penalizacionMoto > 0
                      ? "COBRO_OPERADOR"
                      : "CONCILIADO",
                  textOriginal:
                    [txtTracto, txtMoto].filter(Boolean).join("\n\n") ||
                    "Sin observaciones de auditoría registradas.",
                  fechaAudit: leg.last_update
                    ? format(new Date(leg.last_update), "dd/MM/yyyy HH:mm")
                    : "N/A",
                };

                const legNetoCalculado =
                  legSueldoBase +
                  legBonos -
                  (legManiobras +
                    penalizacionTracto +
                    penalizacionMoto +
                    legViaticos +
                    legCombustible +
                    legOtrosAnticipos);

                // Identificadores de Equipo
                const ecoTracto = leg.unit?.numero_economico || "TRACTO";
                const ecoMoto =
                  leg.trip?.motogenerator_1_unit?.numero_economico ||
                  leg.trip?.motogenerator_2_unit?.numero_economico ||
                  "MOTO";

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
                          {/* Detalles Operación */}
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
                                  {leg.operator?.name
                                    ? leg.operator.name
                                        .trim()
                                        .split(/\s+/)
                                        .slice(0, 2)
                                        .join(" ")
                                    : "N/A"}
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
                                Conciliación Tractocamión
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

                            {/* ======================= MÓDULO MOTOGENERADOR CONDICIONAL ======================= */}
                            {(Number(legAudit.valesMoto) > 0 ||
                              Number(legAudit.horasMoto) > 0) && (
                              <div className="mt-6 mb-4">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <Activity className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                                    Conciliación Motogenerador
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center shadow-sm flex flex-col justify-center items-center">
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                                      Horas Motor
                                    </p>
                                    <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                                      {Number(legAudit.horasMoto || 0).toFixed(
                                        1,
                                      )}{" "}
                                      h
                                    </p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center shadow-sm flex flex-col justify-center items-center">
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                                      Litros Esperados
                                    </p>
                                    <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                                      {Number(legAudit.ltMoto || 0).toFixed(1)}
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 dark:bg-purple-500/10 p-3 rounded-lg border border-purple-100 dark:border-purple-500/20 text-center shadow-sm flex flex-col justify-center items-center">
                                    <p className="text-[9px] uppercase font-bold text-purple-600 dark:text-purple-400 mb-1 tracking-tighter">
                                      Litros Vales
                                    </p>
                                    <p className="font-mono font-black text-purple-700 dark:text-purple-300 text-sm">
                                      {Number(legAudit.valesMoto || 0).toFixed(
                                        1,
                                      )}
                                    </p>
                                  </div>
                                  <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-100 dark:border-blue-500/20 flex flex-col justify-center items-center text-center shadow-sm">
                                    <p className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 mb-1 tracking-widest">
                                      Lts / Hr
                                    </p>
                                    <p className="font-mono font-black text-blue-700 dark:text-blue-300 text-lg flex items-baseline gap-1">
                                      {legAudit.rendMoto || "0.00"}
                                      <span className="text-[9px] font-bold uppercase opacity-60">
                                        L/h
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* ============================================================================== */}

                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm mt-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-blue-400" />{" "}
                                Notas Adicionales
                              </p>
                              <p className="text-[10px] font-mono font-medium leading-relaxed italic text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                {legAudit.textOriginal ||
                                  "Sin observaciones adicionales registradas en la auditoría."}
                              </p>
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
                                <span className="font-medium text-emerald-400">
                                  Sueldo Base (Proporcional)
                                </span>
                                <span className="font-mono font-semibold text-emerald-400">
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

                              {/* VALES DE COBRO EXACTOS (Desglosados visualmente) */}
                              {penalizacionTracto > 0 && (
                                <div className="flex justify-between items-start text-rose-600 dark:text-rose-400 font-bold bg-rose-50/50 dark:bg-rose-500/10 p-2 rounded-lg border border-rose-100 dark:border-rose-500/20">
                                  <div className="flex flex-col">
                                    <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-widest">
                                      <Truck className="h-3 w-3" /> Faltante
                                      Diésel ({ecoTracto})
                                    </span>
                                  </div>
                                  <span className="font-mono font-black mt-0.5">
                                    -{formatCurrencyLocal(penalizacionTracto)}
                                  </span>
                                </div>
                              )}

                              {penalizacionMoto > 0 && (
                                <div className="flex justify-between items-start text-rose-600 dark:text-rose-400 font-bold bg-purple-50/50 dark:bg-purple-500/10 p-2 rounded-lg border border-purple-100 dark:border-purple-500/20 mt-2">
                                  <div className="flex flex-col">
                                    <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-widest">
                                      <Snowflake className="h-3 w-3" /> Faltante
                                      Diésel ({ecoMoto})
                                    </span>
                                  </div>
                                  <span className="font-mono font-black mt-0.5">
                                    -{formatCurrencyLocal(penalizacionMoto)}
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
