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
  Download,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import type { ReceivableInvoice } from "@/features/receivables/types";
import { getInvoiceStatusInfo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ReceivableInvoice | null;
  onPayClick?: (invoice: ReceivableInvoice) => void;
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
}: InvoiceDetailSheetProps) {
  useEffect(() => {
    if (invoice && open) {
      console.log("FACTURA DE CLIENTE ABIERTA:", invoice);
    }
  }, [invoice, open]);

  if (!invoice) return null;

  const inv = invoice as any;
  const statusInfo = getInvoiceStatusInfo(inv);

  // 📝 EXTRACCIÓN DE DATOS FISCALES
  const uuid = safeStr(inv.uuid) || "NO TIMBRADO";
  const uuidRelacionado = safeStr(inv.uuid_relacionado); // Carta Porte origen
  const rawFolio = safeStr(inv.folio_interno) || safeStr(inv.folio);
  const displayFolio = rawFolio && rawFolio !== "S/F" ? rawFolio : uuid;

  // 👇 EXTRACCIÓN SEGURA (CANCELACIONES E HISTORIAL)
  const estatusStr = safeStr(inv.estatus || inv.status_sat).toUpperCase();
  const isCanceled = estatusStr === "CANCELADO";
  const docHistory = Array.isArray(inv.document_history)
    ? inv.document_history
    : [];
  const pdfUrl = safeStr(inv.pdf_url ?? inv.pdfUrl);
  const xmlUrl = safeStr(inv.xml_url ?? inv.xmlUrl);

  // AGRUPACIÓN DEL HISTORIAL POR VERSIÓN PARA LA TABLA
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
  ).sort((a: any, b: any) => b.version - a.version); // Orden descendente
  // 👆 -----------------------------------------------------

  const entidadNombre =
    safeStr(inv.client?.razon_social) ||
    safeStr(inv.cliente) ||
    "Público en General";
  const entidadRfc = safeStr(inv.client?.rfc) || "RFC NO DISPONIBLE";

  const concepto = safeStr(inv.concepto) || "Sin descripción";
  const fechaEmision =
    safeStr(inv.fecha_emision) || safeStr(inv.fechaEmision) || "—";
  const fechaVencimiento =
    safeStr(inv.fecha_vencimiento) || safeStr(inv.fechaVencimiento) || "—";

  // 💰 EXTRACCIÓN DE DESGLOSE
  const montoTotal = toNumber(inv.monto_total ?? inv.montoTotal);
  const subtotal = toNumber(inv.subtotal);
  const iva = toNumber(inv.iva);
  const retenciones = toNumber(inv.retenciones);
  const saldoPendiente = toNumber(inv.saldo_pendiente ?? inv.saldoPendiente);
  const moneda = safeStr(inv.moneda) || "MXN";

  // 🚚 EXTRACCIÓN DE DATOS OPERATIVOS (VIAJE)
  const referenciaOperativa = safeStr(inv.referencia);
  const origen = safeStr(inv.trip_info?.origen) || "No especificado";
  const destino = safeStr(inv.trip_info?.destino) || "No especificado";
  const pesoTon = toNumber(inv.trip_info?.peso_toneladas);
  const contenedores =
    safeStr(inv.trip_info?.contenedores) || "Sin contenedores registrados";
  const productoSat = safeStr(inv.trip_info?.producto_sat) || "No especificado";

  const payments: Array<any> = Array.isArray(inv.payments)
    ? inv.payments
    : Array.isArray(inv.pagos)
      ? inv.pagos
      : Array.isArray(inv.cobros)
        ? inv.cobros
        : [];

  const handleDownload = (fileType: "pdf" | "xml", targetUuid: string) => {
    const toastId = toast.loading(`Descargando ${fileType.toUpperCase()}...`);
    try {
      const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      const baseURL = rawBaseURL.replace(/\/$/, "");
      const fileUrl = `${baseURL}/api/sat/invoice/${targetUuid}/${fileType}`;

      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.setAttribute("download", `CFDI_${targetUuid}.${fileType}`);

      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`${fileType.toUpperCase()} descargado correctamente.`, {
        id: toastId,
      });
    } catch (error: any) {
      toast.error(`Fallo al descargar el ${fileType.toUpperCase()}`, {
        id: toastId,
      });
    }
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

  // FORMATEADOR DE FECHA Y HORA PARA LA TABLA
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[650px] bg-slate-50 dark:bg-background/95 backdrop-blur-xl border-l-slate-200 dark:border-l-white/10 p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* ================= HEADER FIJO ================= */}
        <SheetHeader className="px-6 py-5 border-b border-border/50 flex flex-row items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-40 shadow-sm">
          <SheetTitle className="flex items-center gap-3 text-brand-navy dark:text-white font-black text-xl tracking-tight m-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Detalle de Factura
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

        {/* ================= CONTENEDOR SCROLL ================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* 👇 ALERTA DE CANCELACIÓN */}
          {isCanceled && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                  Factura Cancelada
                </h4>
                <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 mt-1 leading-snug">
                  Este comprobante fue cancelado el{" "}
                  <strong>{fDT(inv.fecha_cancelacion)}</strong>
                  {inv.motivo_cancelacion
                    ? ` por el motivo "${inv.motivo_cancelacion}"`
                    : ""}
                  .
                </p>
              </div>
            </div>
          )}

          {/* IDENTIFICACIÓN */}
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
                      CP Relacionada:
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
                  <Banknote className="w-4 h-4 mr-2" /> Cobrar
                </Button>
              )}
            </div>
          </div>

          {/* CLIENTE Y CONCEPTO (GRID) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 p-5 bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Receptor
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
                <FileText className="w-3.5 h-3.5" /> Concepto de Facturación
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

          {/* DESGLOSE FINANCIERO Y FECHAS */}
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
                  <span className="font-bold text-slate-500">IVA (16%):</span>
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

          <Separator className="bg-slate-200 dark:bg-border/50" />

          {/* DATOS OPERATIVOS */}
          <div className="space-y-4">
            <p className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" /> Detalles de Operación
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
                      {pesoTon > 0 ? `${pesoTon} Toneladas` : "No registrado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Box className="w-3 h-3 text-slate-400" /> Contenedores
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm break-words whitespace-normal block">
                      {contenedores}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200 dark:bg-border/50" />

          {/* HISTORIAL DE COBROS (REP) */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2 tracking-tight">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Historial de Cobros y REP
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-black ml-1">
                  {payments.length}
                </span>
              </h3>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-card rounded-2xl border-2 border-dashed border-slate-200 dark:border-border flex flex-col items-center justify-center gap-2">
                <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-bold text-slate-500">
                  No hay cobros registrados
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[250px] leading-tight mx-auto">
                  Los abonos que registres aparecerán aquí junto con su
                  Complemento de Pago (REP).
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-border/50 rounded-2xl overflow-hidden bg-white dark:bg-card shadow-sm">
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50 dark:bg-slate-900/50 border-b-slate-200 dark:border-b-border/50 hover:bg-transparent">
                      <DataTableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest py-3">
                        Fecha
                      </DataTableHead>
                      <DataTableHead className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest py-3">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest py-3">
                        Archivos SAT
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {payments.map((p: any) => {
                      const fecha = safeStr(p.fecha_pago ?? p.fecha);
                      const monto = toNumber(p.monto);
                      const complementoUuid = safeStr(
                        p.complemento_uuid ?? p.complementoUuid,
                      );

                      return (
                        <DataTableRow
                          key={safeStr(p.id)}
                          className="border-b-slate-100 dark:border-b-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <DataTableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {fD(fecha)}
                          </DataTableCell>
                          <DataTableCell className="text-right">
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900/50">
                              {fC(monto)}
                            </span>
                          </DataTableCell>

                          <DataTableCell className="text-center">
                            {complementoUuid ? (
                              <div className="flex justify-center items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  title="Descargar PDF"
                                  className="h-8 w-8 rounded text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/30 dark:border-rose-900/50 dark:hover:bg-rose-900/50 transition-all"
                                  onClick={() =>
                                    handleDownload("pdf", complementoUuid)
                                  }
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  title="Descargar XML"
                                  className="h-8 w-8 rounded text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-950/30 dark:border-blue-900/50 dark:hover:bg-blue-900/50 transition-all"
                                  onClick={() =>
                                    handleDownload("xml", complementoUuid)
                                  }
                                >
                                  <FileCode2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                No timbrado
                              </span>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              </div>
            )}
          </div>

          <Separator className="bg-slate-200 dark:bg-border/50" />

          {/* 👇 TABLA DE EXPEDIENTE Y VERSIONES (CORREGIDA PARA QUE SIEMPRE SEA TABLA) */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm relative overflow-hidden group">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 relative z-10">
              <History className="h-3.5 w-3.5 text-blue-500" /> Expediente y
              Versiones de {inv.is_nominal ? "Carta Porte" : "Factura"}
            </h3>

            <div className="border border-slate-200 dark:border-border/50 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/20 relative z-10">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow className="bg-slate-100/50 dark:bg-slate-800/50 border-b-slate-200 dark:border-b-border/50 hover:bg-transparent">
                    <DataTableHead className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest py-3 h-auto">
                      Documento
                    </DataTableHead>
                    <DataTableHead className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest py-3 h-auto">
                      Fecha / Hora
                    </DataTableHead>
                    <DataTableHead className="text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest py-3 h-auto">
                      Descargas
                    </DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {groupedHistory.length > 0 ? (
                    groupedHistory.map((group: any) => (
                      <DataTableRow
                        key={`v-${group.version}`}
                        className={`border-b-slate-100 dark:border-b-border/50 transition-colors ${group.is_active ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" : "opacity-60 grayscale hover:grayscale-0"}`}
                      >
                        <DataTableCell className="py-2.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {group.filename}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                              Versión {group.version}{" "}
                              {group.is_active ? "(Activa)" : "(Obsoleta)"}
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-[11px] font-medium text-slate-600 dark:text-slate-400 py-2.5">
                          {fDT(group.created_at)}
                        </DataTableCell>
                        <DataTableCell className="text-center py-2.5">
                          <div className="flex justify-center items-center gap-1">
                            {group.pdf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar PDF"
                                className="h-7 w-7 rounded text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                onClick={() =>
                                  handleDownloadUrl(
                                    group.pdf.file_url,
                                    group.pdf.filename,
                                  )
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {group.xml && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar XML"
                                className="h-7 w-7 rounded text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                onClick={() =>
                                  handleDownloadUrl(
                                    group.xml.file_url,
                                    group.xml.filename,
                                  )
                                }
                              >
                                <FileCode2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {group.acuse && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar Acuse de Cancelación"
                                className="h-7 w-7 rounded text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                onClick={() =>
                                  handleDownloadUrl(
                                    group.acuse.file_url,
                                    group.acuse.filename,
                                  )
                                }
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    ))
                  ) : pdfUrl || xmlUrl ? (
                    // 👈 FALLBACK INTEGRADO DENTRO DE LA TABLA
                    <DataTableRow className="border-b-slate-100 dark:border-b-border/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <DataTableCell className="py-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {displayFolio || "Factura"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                            Versión Única (Activa)
                          </span>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-[11px] font-medium text-slate-600 dark:text-slate-400 py-2.5">
                        {fDT(inv.fecha_emision) || "—"}
                      </DataTableCell>
                      <DataTableCell className="text-center py-2.5">
                        <div className="flex justify-center items-center gap-1">
                          {pdfUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Descargar PDF"
                              className="h-7 w-7 rounded text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/50"
                              onClick={() => handleDownload("pdf", uuid)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {xmlUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Descargar XML"
                              className="h-7 w-7 rounded text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950/50"
                              onClick={() => handleDownload("xml", uuid)}
                            >
                              <FileCode2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ) : (
                    <DataTableRow>
                      <DataTableCell
                        colSpan={3}
                        className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs font-medium"
                      >
                        No hay documentos ni versiones registradas.
                      </DataTableCell>
                    </DataTableRow>
                  )}
                </DataTableBody>
              </DataTable>
            </div>
          </div>
          {/* 👆 FIN TABLA */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
