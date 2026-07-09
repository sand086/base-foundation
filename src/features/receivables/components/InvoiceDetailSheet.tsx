import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Calendar,
  DollarSign,
  Building2,
  Receipt,
  CreditCard,
  Banknote,
  FileCode2,
  Hash,
  X,
  Truck,
  Barcode,
  Clock,
  ArrowDown,
  Box,
  Weight,
  Tag,
  Link as LinkIcon,
  MapPin,
  AlertTriangle,
  History,
  Loader2,
  Trash2,
  RefreshCw,
  Network,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { ReceivableInvoice } from "@/features/receivables/types";
import { getInvoiceStatusInfo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ReceivableInvoice | null;
  onPayClick?: (invoice: ReceivableInvoice) => void;
  onStampPayment?: (paymentId: number) => Promise<void>;
  onCancelPayments?: (paymentIds: number[]) => Promise<void>;
  onVerifySat?: (id: number) => Promise<void>;
  onRetryCancel?: (id: number, motivo: string) => Promise<void>;
}

const toNumber = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const safeStr = (v: any): string =>
  v === null || v === undefined ? "" : String(v);

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoice,
  onPayClick,
  onStampPayment,
  onCancelPayments,
  onVerifySat,
  onRetryCancel,
}: InvoiceDetailSheetProps) {
  const [stampingId, setStampingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    if (invoice && open) {
      console.log("FACTURA ABIERTA EN DETALLE:", invoice);
    }
  }, [invoice, open]);

  if (!invoice) return null;

  const inv = invoice as any;
  const statusInfo = getInvoiceStatusInfo(inv);

  const uuid = safeStr(inv.uuid) || "NO TIMBRADO";
  const uuidRelacionado = safeStr(inv.uuid_relacionado);
  const rawFolio = safeStr(inv.folio_interno) || safeStr(inv.folio);
  const displayFolio = rawFolio && rawFolio !== "S/F" ? rawFolio : uuid;

  const estatusStr = safeStr(inv.estatus || inv.status_sat).toUpperCase();
  const isCanceled = estatusStr === "CANCELADO";
  const inProcess = inv.status_sat === "PROCESO_CANCELACION";
  const hasSatError = inv.intentos_cancelacion > 0 && !isCanceled && !inProcess;

  const docHistory = Array.isArray(inv.document_history)
    ? inv.document_history
    : [];

  const groupedHistory = Object.values(
    docHistory.reduce((acc: any, doc: any) => {
      const v = doc.version || 1;
      if (!acc[v]) {
        acc[v] = {
          version: v,
          created_at: doc.created_at,
          is_active: doc.is_active,
          pdf: null,
          xml: null,
          acuse: null,
          filename: doc.filename
            ? doc.filename.replace(/\.(xml|pdf)$/i, "")
            : displayFolio,
        };
      }
      if (doc.document_type === "pdf") acc[v].pdf = doc;
      if (doc.document_type === "xml") acc[v].xml = doc;
      if (doc.document_type === "acuse_cancelacion") acc[v].acuse = doc;
      return acc;
    }, {}),
  ).sort((a: any, b: any) => b.version - a.version);

  // 🚀 EXTRAEMOS LA INFO DEL CLIENTE/PROVEEDOR BUSCANDO EN TODAS LAS VARIANTES POSIBLES
  const entidadNombre =
    safeStr(inv.client?.razon_social) ||
    safeStr(inv.supplier?.razon_social) ||
    safeStr(inv.cliente_proveedor_nombre) ||
    safeStr(inv.cliente) ||
    "Público en General / No Identificado";

  const entidadRfc =
    safeStr(inv.client?.rfc) ||
    safeStr(inv.supplier?.rfc) ||
    safeStr(inv.cliente_proveedor_rfc) ||
    safeStr(inv.rfc_cliente) ||
    "RFC NO DISPONIBLE";

  const concepto = safeStr(inv.concepto) || "Sin descripción";
  const fechaEmision =
    safeStr(inv.fecha_emision) || safeStr(inv.fechaEmision) || "—";
  const fechaVencimiento =
    safeStr(inv.fecha_vencimiento) || safeStr(inv.fechaVencimiento) || "—";

  const montoTotal = toNumber(inv.monto_total ?? inv.montoTotal);
  const subtotal = toNumber(inv.subtotal);
  const iva = toNumber(inv.iva);
  const retenciones = toNumber(inv.retenciones);
  const saldoPendiente = toNumber(inv.saldo_pendiente ?? inv.saldoPendiente);
  const moneda = safeStr(inv.moneda) || "MXN";

  const referenciaOperativa = safeStr(inv.referencia);
  const origen = safeStr(inv.trip_info?.origen) || "No especificado";
  const destino = safeStr(inv.trip_info?.destino) || "No especificado";
  const pesoTon = toNumber(inv.trip_info?.peso_toneladas);
  const contenedores =
    safeStr(inv.trip_info?.contenedores) || "Sin contenedores registrados";
  const productoSat = safeStr(inv.trip_info?.producto_sat) || "No especificado";

  const rawPayments: Array<any> = Array.isArray(inv.payments)
    ? inv.payments
    : Array.isArray(inv.pagos)
      ? inv.pagos
      : Array.isArray(inv.cobros)
        ? inv.cobros
        : [];

  const payments = rawPayments.filter(
    (p) => p.estatus !== "CANCELADO" && p.record_status !== "E",
  );

  const handleDownloadFromBackend = (
    type: "pdf" | "xml",
    targetUuid: string,
  ) => {
    if (!targetUuid || targetUuid === "NO TIMBRADO") {
      toast.error("No hay un UUID válido para descargar del SAT.");
      return;
    }
    const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "/api";
    const baseURL = rawBaseURL.replace(/\/$/, "");

    const timestamp = new Date().getTime();
    window.open(
      `${baseURL}/api/sat/invoice/${targetUuid}/${type}?t=${timestamp}`,
      "_blank",
    );
  };

  const handleDownloadUrl = (url: string, filename: string) => {
    const toastId = toast.loading(`Descargando ${filename}...`);
    try {
      const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      const baseURL = rawBaseURL.replace(/\/$/, "");
      const fileUrl = url.startsWith("http")
        ? url
        : `${baseURL}${url.startsWith("/") ? url : "/" + url}`;

      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${filename} descargado.`, { id: toastId });
    } catch {
      toast.error(`Fallo al descargar ${filename}`, { id: toastId });
    }
  };

  const handleStamp = async (paymentId: number) => {
    if (!onStampPayment) return;
    setStampingId(paymentId);
    try {
      await onStampPayment(paymentId);
    } catch (error) {
      console.error("Error al timbrar:", error);
    } finally {
      setStampingId(null);
    }
  };

  const handleCancelIndividual = async (paymentId: number) => {
    if (!onCancelPayments) return;
    if (
      !window.confirm(
        "¿Seguro que deseas anular este pago? Se devolverá la deuda a la factura y se enviará la cancelación al SAT.",
      )
    )
      return;

    setCancelingId(paymentId);
    try {
      await onCancelPayments([paymentId]);
    } catch (error) {
      console.error("Error al cancelar pago:", error);
    } finally {
      setCancelingId(null);
    }
  };

  const handleRebuildPdf = async () => {
    if (!inv.id) return;
    const toastId = toast.loading("Regenerando diseño del PDF...");
    setIsRebuilding(true);

    try {
      const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      const baseURL = rawBaseURL.replace(/\/$/, "");

      const res = await fetch(`${baseURL}/api/sat/rebuild-pdf/${inv.id}`);

      if (!res.ok) throw new Error("Error en servidor al regenerar");

      toast.success("PDF regenerado correctamente. Descárgalo de nuevo.", {
        id: toastId,
      });
    } catch (error) {
      toast.error("Hubo un error al regenerar el PDF", { id: toastId });
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleVerify = async () => {
    if (!onVerifySat) return;
    setIsVerifying(true);
    await onVerifySat(inv.id);
    setIsVerifying(false);
  };

  const fC = (n: any) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  const fD = (d: any) =>
    d && d !== "—"
      ? new Date(d).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const fDT = (d: any) => {
    if (!d || d === "—") return "—";
    return new Date(d).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isPaid = saldoPendiente <= 0;

  const xmlUrl = inv.xml_url || inv.xmlUrl;
  const pdfUrl = inv.pdf_url || inv.pdfUrl;
  const hasFallbackXml = !!(inv.uuid || xmlUrl);
  const hasFallbackPdf = !!(inv.uuid || pdfUrl);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[650px] bg-slate-50 dark:bg-background/95 backdrop-blur-xl border-l-slate-200 dark:border-l-white/10 p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 py-5 border-b border-border/50 flex flex-row items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-40 shadow-sm">
          <SheetTitle className="flex items-center gap-3 text-brand-navy dark:text-white font-black text-xl tracking-tight m-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Detalle de Comprobante
          </SheetTitle>

          <div className="flex items-center gap-3 mt-0">
            <StatusBadge
              status={statusInfo.status}
              className="shadow-sm font-black px-3 py-1"
            >
              {statusInfo.label}
            </StatusBadge>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* 🚨 ZONA DE ALERTAS INTELIGENTES */}
          {isCanceled && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                  Factura Cancelada
                </h4>
                <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 mt-1 leading-snug">
                  Cancelada el <strong>{fDT(inv.fecha_cancelacion)}</strong>.
                  Detalle SAT:{" "}
                  {inv.detalle_sat ||
                    (inv.motivo_cancelacion
                      ? `por el motivo "${inv.motivo_cancelacion}"`
                      : "Sin detalle.")}
                </p>
              </div>
            </div>
          )}

          {inProcess && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <Loader2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-spin" />
              <div className="flex-1">
                <h4 className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                  En Proceso de Cancelación
                </h4>
                <p className="text-sm font-medium text-amber-700/80 dark:text-amber-400/80 mt-1">
                  {inv.detalle_sat ||
                    "Esperando aprobación del Receptor en el Buzón Tributario."}
                </p>
                {onVerifySat && (
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    size="sm"
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3 h-3 mr-2",
                        isVerifying && "animate-spin",
                      )}
                    />
                    Consultar SAT ahora
                  </Button>
                )}
              </div>
            </div>
          )}

          {hasSatError && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-[11px] font-black text-red-800 dark:text-red-400 uppercase tracking-widest">
                  Rechazo de Cancelación (Intento {inv.intentos_cancelacion})
                </h4>
                <p className="text-sm font-medium text-red-700/80 dark:text-red-400/80 mt-1">
                  {inv.detalle_sat ||
                    "El SAT o el Receptor rechazaron la solicitud de cancelación."}
                </p>
                <div className="flex gap-2 mt-3">
                  {onRetryCancel && (
                    <Button
                      onClick={() => onRetryCancel(inv.id, "02")}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" /> Reintentar Forzado
                      (02)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 🌳 JERARQUÍA DEL VIAJE (PADRE / HIJOS) CON INFO DETALLADA 🌳 */}
          {(inv.factura_padre ||
            (inv.cartas_porte_hijas && inv.cartas_porte_hijas.length > 0)) && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl">
              <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                <Network className="w-4 h-4" /> Árbol de Documentos del Viaje
              </h4>

              {inv.factura_padre && (
                <div className="flex flex-col gap-1 mb-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300">
                      PADRE (Ingreso)
                    </Badge>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                      {inv.factura_padre.folio_interno ||
                        inv.factura_padre.folio ||
                        "S/F"}
                    </span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 ml-auto">
                      {fC(inv.factura_padre.monto_total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>
                      UUID: {inv.factura_padre.uuid || "No disponible"}
                    </span>
                    <StatusBadge
                      status={getInvoiceStatusInfo(inv.factura_padre).status}
                      className="text-[9px] py-0 px-1"
                    >
                      {inv.factura_padre.status_sat ||
                        inv.factura_padre.estatus ||
                        "TIMBRADA"}
                    </StatusBadge>
                  </div>
                  {/* Motivo Cancelación de Padre */}
                  {(inv.factura_padre.estatus === "CANCELADO" ||
                    inv.factura_padre.status_sat === "CANCELADO") &&
                    inv.factura_padre.motivo_cancelacion && (
                      <div className="mt-1 text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded">
                        Motivo de Cancelación:{" "}
                        {inv.factura_padre.motivo_cancelacion}
                      </div>
                    )}
                </div>
              )}

              {inv.cartas_porte_hijas?.map((hija: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 ml-4 relative"
                >
                  <div className="absolute w-4 h-6 border-l-2 border-b-2 border-slate-300 dark:border-slate-700 rounded-bl-lg -left-4 top-0"></div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50"
                    >
                      HIJA (C. Porte)
                    </Badge>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                      {hija.folio_interno || hija.folio || "S/F"}
                    </span>
                    <StatusBadge
                      status={getInvoiceStatusInfo(hija).status}
                      className="ml-auto text-[10px] px-2 py-0.5"
                    >
                      {hija.status_sat || hija.estatus || "TIMBRADA"}
                    </StatusBadge>
                  </div>
                  <div className="flex justify-between items-center pl-1 text-[10px] font-mono text-slate-500">
                    <span>UUID: {hija.uuid || "No disponible"}</span>
                    {hija.monto_total !== undefined && (
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {fC(hija.monto_total)}
                      </span>
                    )}
                  </div>
                  {/* Motivo Cancelación de Hija */}
                  {(hija.estatus === "CANCELADO" ||
                    hija.status_sat === "CANCELADO") &&
                    hija.motivo_cancelacion && (
                      <div className="mt-1 text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded w-fit">
                        Motivo de Cancelación: {hija.motivo_cancelacion}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start justify-between bg-white dark:bg-card p-5 rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm relative overflow-hidden group gap-4">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-navy group-hover:bg-blue-600 transition-colors"></div>
            <div className="flex-1 pl-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-500" /> Comprobante
              </p>
              <p className="font-mono font-black text-xl text-foreground tracking-tight break-all">
                {displayFolio}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Barcode className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    UUID:
                  </span>
                  <span className="font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 break-all">
                    {uuid}
                  </span>
                </div>

                {uuidRelacionado && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase">
                      {inv.is_nominal
                        ? "CP Relacionada:"
                        : "Sustituye al CFDI:"}
                    </span>
                    <span className="font-mono text-[10px] font-black text-indigo-700 dark:text-indigo-300 break-all">
                      {uuidRelacionado}
                    </span>
                  </div>
                )}

                {referenciaOperativa && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase">
                      Ref:
                    </span>
                    <span className="font-mono text-[10px] font-black text-blue-700 dark:text-blue-300 break-all">
                      {referenciaOperativa}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:items-end w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
              {!isPaid && !isCanceled && onPayClick && (
                <Button
                  onClick={() => onPayClick(invoice)}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black h-11 px-6 text-[11px] tracking-widest uppercase rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <Banknote className="w-4 h-4 mr-2" /> Cobrar / Pagar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 p-5 bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Entidad
                </span>
              </div>
              <p className="font-black text-foreground text-base leading-tight mb-3 break-words">
                {entidadNombre}
              </p>
              <div className="mt-auto">
                <span className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  RFC: {entidadRfc}
                </span>
              </div>
            </div>

            <div className="md:col-span-3 p-5 bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm flex flex-col">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Concepto
              </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed flex-1 break-words whitespace-pre-wrap">
                {concepto}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center">
                <span className="font-mono text-xs font-black text-brand-navy dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/50">
                  Moneda: {moneda}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div
                className={cn(
                  "col-span-2 p-4 rounded-2xl border flex flex-col justify-center shadow-sm",
                  isPaid
                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CreditCard
                    className={cn(
                      "h-4 w-4",
                      isPaid ? "text-emerald-600" : "text-amber-600",
                    )}
                  />
                  <p
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isPaid ? "text-emerald-600/70" : "text-amber-600/70",
                    )}
                  >
                    Saldo Pendiente
                  </p>
                </div>
                <p
                  className={cn(
                    "text-3xl font-black tracking-tighter",
                    isPaid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-500",
                  )}
                >
                  {fC(saldoPendiente)}
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    Emisión
                  </span>
                </div>
                <span className="font-bold text-sm text-foreground">
                  {fD(fechaEmision)}
                </span>
              </div>

              <div
                className={cn(
                  "p-4 rounded-2xl border shadow-sm flex flex-col justify-center",
                  statusInfo.status === "danger"
                    ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40"
                    : "bg-white dark:bg-card border-slate-200 dark:border-border/50",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock
                    className={cn(
                      "h-3.5 w-3.5",
                      statusInfo.status === "danger"
                        ? "text-rose-500"
                        : "text-slate-400",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider",
                      statusInfo.status === "danger"
                        ? "text-rose-600/70 dark:text-rose-400/70"
                        : "text-muted-foreground",
                    )}
                  >
                    Vencimiento
                  </span>
                </div>
                <span
                  className={cn(
                    "font-bold text-sm",
                    statusInfo.status === "danger"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground",
                  )}
                >
                  {fD(fechaVencimiento)}
                </span>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner flex flex-col justify-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-400" /> Resumen
                Financiero
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500">Subtotal:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {fC(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500">IVA:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {fC(iva)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Retenciones:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{fC(retenciones)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-black text-sm text-brand-navy dark:text-white uppercase tracking-wider">
                    Total Facturado:
                  </span>
                  <span className="font-mono text-xl font-black text-brand-navy dark:text-white">
                    {fC(montoTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {(origen !== "No especificado" || destino !== "No especificado") && (
            <>
              <Separator className="bg-slate-200 dark:bg-border/50" />
              <div className="space-y-4">
                <p className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-500" /> Detalles de
                  Operación
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Ruta del
                      Viaje
                    </span>
                    <div className="flex-1 flex flex-col justify-center space-y-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm break-words whitespace-normal leading-tight">
                        {origen}
                      </span>
                      <div className="flex items-center gap-2 text-slate-400">
                        <ArrowDown className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm break-words whitespace-normal leading-tight">
                        {destino}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" /> Producto
                        (Clave SAT)
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm break-words whitespace-normal leading-tight block">
                        {productoSat}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Weight className="w-3 h-3 text-slate-400" /> Peso
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                          {pesoTon > 0
                            ? `${pesoTon} Toneladas`
                            : "No registrado"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Box className="w-3 h-3 text-slate-400" />{" "}
                          Contenedores
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm break-words whitespace-normal block">
                          {contenedores}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-slate-200 dark:bg-border/50" />

          {/* HISTORIAL DE COBROS/PAGOS (REP) */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2 tracking-tight">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Historial de Pagos y REP
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-black">
                  {payments.length}
                </span>
              </h3>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">
                  No hay cobros ni complementos registrados.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-card">
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <DataTableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">
                        Fecha
                      </DataTableHead>
                      <DataTableHead className="text-[10px] font-black uppercase tracking-widest h-10">
                        Folio REP
                      </DataTableHead>
                      <DataTableHead className="text-[10px] font-black uppercase tracking-widest h-10 text-right">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-[10px] font-black uppercase tracking-widest h-10 text-right px-4">
                        Acciones
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {payments.map((p, i) => {
                      const payDate = p.fecha_pago || p.created_at;
                      const hasRep = !!p.uuid && p.uuid !== "NO TIMBRADO";
                      const payFolio = p.numero_complemento
                        ? `COM-${p.numero_complemento}`
                        : `INT-${p.id}`;
                      const isStamping = stampingId === p.id;
                      const isCanceling = cancelingId === p.id;
                      const canCancel = p.estatus !== "CANCELADO";

                      return (
                        <DataTableRow key={i} className="group transition-all">
                          <DataTableCell className="py-2.5 px-4">
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                              {fD(payDate)}
                            </span>
                          </DataTableCell>
                          <DataTableCell className="py-2.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs font-black text-brand-navy dark:text-blue-400">
                                {payFolio}
                              </span>
                              {hasRep ? (
                                <Badge
                                  variant="outline"
                                  className="w-fit text-[9px] bg-green-50 text-green-700 border-green-200"
                                >
                                  TIMBRADO
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="w-fit text-[9px] bg-slate-100 text-slate-500 border-slate-200"
                                >
                                  INTERNO
                                </Badge>
                              )}
                            </div>
                          </DataTableCell>
                          <DataTableCell className="text-right py-2.5">
                            <span className="font-black text-sm text-foreground">
                              {fC(p.monto)}
                            </span>
                          </DataTableCell>
                          <DataTableCell className="text-right py-2.5 px-4">
                            <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {hasRep ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDownloadFromBackend("pdf", p.uuid)
                                    }
                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                    title="Descargar REP PDF"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDownloadFromBackend("xml", p.uuid)
                                    }
                                    className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="Descargar REP XML"
                                  >
                                    <FileCode2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStamp(p.id)}
                                  disabled={isStamping}
                                  className="h-8 px-3 text-[10px] font-bold tracking-widest uppercase bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                >
                                  {isStamping ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  Timbrar
                                </Button>
                              )}

                              {canCancel && onCancelPayments && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelIndividual(p.id)}
                                  disabled={isCanceling}
                                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-1"
                                  title="Anular pago y cancelar REP"
                                >
                                  {isCanceling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              </div>
            )}
          </div>

          {/* HISTORIAL DE ARCHIVOS Y VERSIONES */}
          {groupedHistory.length > 0 && (
            <>
              <Separator className="bg-slate-200 dark:bg-border/50" />
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2 tracking-tight">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                      <History className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    Archivos y Versiones
                  </h3>

                  {hasFallbackPdf && !isCanceled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRebuildPdf}
                      disabled={isRebuilding}
                      className="h-8 px-3 text-[10px] font-bold tracking-widest uppercase bg-slate-50 text-slate-600 hover:text-brand-navy border-slate-200"
                    >
                      {isRebuilding ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Regenerar PDF
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {groupedHistory.map((ver: any, i: number) => {
                    const isLatest = i === 0;
                    return (
                      <div
                        key={ver.version}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all",
                          isLatest
                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                            : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50 opacity-75 hover:opacity-100",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                              isLatest
                                ? "bg-brand-navy text-white"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-500",
                            )}
                          >
                            v{ver.version}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                              {ver.filename}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {fDT(ver.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {isLatest && !ver.pdf && hasFallbackPdf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100"
                              onClick={() =>
                                handleDownloadFromBackend(
                                  "pdf",
                                  inv.uuid || "NO_TIMBRADO",
                                )
                              }
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
                            </Button>
                          )}

                          {isLatest && !ver.xml && hasFallbackXml && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100"
                              onClick={() =>
                                handleDownloadFromBackend(
                                  "xml",
                                  inv.uuid || "NO_TIMBRADO",
                                )
                              }
                            >
                              <FileCode2 className="w-3.5 h-3.5 mr-1.5" /> XML
                            </Button>
                          )}

                          {ver.pdf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100"
                              onClick={() =>
                                handleDownloadUrl(
                                  ver.pdf.file_url,
                                  ver.pdf.filename,
                                )
                              }
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
                            </Button>
                          )}

                          {ver.xml && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100"
                              onClick={() =>
                                handleDownloadUrl(
                                  ver.xml.file_url,
                                  ver.xml.filename,
                                )
                              }
                            >
                              <FileCode2 className="w-3.5 h-3.5 mr-1.5" /> XML
                            </Button>
                          )}

                          {ver.acuse && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100"
                              onClick={() =>
                                handleDownloadUrl(
                                  ver.acuse.file_url,
                                  ver.acuse.filename,
                                )
                              }
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />{" "}
                              Acuse
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
