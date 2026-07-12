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
  FileCode2,
  Calendar,
  DollarSign,
  Building2,
  Receipt,
  CreditCard,
  AlertTriangle,
  History,
  X,
  Clock,
  Hash,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import type { PayableInvoice } from "@/features/payables/types";
import { getInvoiceStatusInfo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PayableInvoice | null;
  onPayClick?: (invoice: PayableInvoice) => void;
  onPaymentSuccess?: () => void;
}

const toNumber = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const safeStr = (v: any): string =>
  v === null || v === undefined ? "" : String(v);

export function InvoicePayablesDetailSheet({
  open,
  onOpenChange,
  invoice,
  onPayClick,
}: InvoiceDetailSheetProps) {
  useEffect(() => {
    if (invoice && open) {
      console.log("🏢 FACTURA DE PROVEEDOR (CxP) ABIERTA:", invoice);
    }
  }, [invoice, open]);

  if (!invoice) return null;

  // VACUNA TYPESCRIPT
  const inv = invoice as any;
  const statusInfo = getInvoiceStatusInfo(inv);

  const id = safeStr(inv.id);
  const folioInterno =
    safeStr(inv.folio_interno) || safeStr(inv.folio) || `ID-${id}`;
  const uuid = safeStr(inv.uuid) || "NO TIMBRADO";

  // 👇 EXTRACCIÓN SEGURA HOMOLOGADA
  const estatusStr = safeStr(inv.estatus).toUpperCase();
  const isCanceled = estatusStr === "CANCELADO";

  let badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
  const badgeLabel = estatusStr;

  if (estatusStr === "TIMBRADA" || estatusStr === "TIMBRADO") {
    badgeColor = "bg-green-100 text-green-800 border-green-300";
  } else if (isCanceled) {
    badgeColor = "bg-red-100 text-red-800 border-red-300";
  } else if (estatusStr === "PROVISIONAL") {
    badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
  }

  const entidadNombre =
    safeStr(inv.cliente_proveedor_nombre) ||
    safeStr(inv.supplier?.razon_social) ||
    "Proveedor Desconocido";

  const entidadRfc =
    safeStr(inv.cliente_proveedor_rfc) ||
    safeStr(inv.supplier?.rfc) ||
    "RFC NO DISPONIBLE";

  const concepto = safeStr(inv.concepto) || "Gasto / Compra General";
  const fechaEmision =
    safeStr(inv.fecha_emision) || safeStr(inv.fechaEmision) || "—";
  const fechaVencimiento =
    safeStr(inv.fecha_vencimiento) || safeStr(inv.fechaVencimiento) || "—";

  // 💰 CAMPOS FINANCIEROS (Nuevos desde el backend)
  const montoTotal = toNumber(inv.monto_total ?? inv.montoTotal);
  const subtotal = toNumber(inv.subtotal);
  const iva = toNumber(inv.iva);
  const retenciones = toNumber(inv.retenciones);
  const saldoPendiente = toNumber(inv.saldo_pendiente ?? inv.saldoPendiente);
  const moneda = safeStr(inv.moneda) || "MXN";

  const isPaid = saldoPendiente <= 0 && montoTotal > 0;

  // HISTORIAL Y ARCHIVOS
  const pdfUrl = safeStr(inv.pdf_url ?? inv.pdfUrl);
  const xmlUrl = safeStr(inv.xml_url ?? inv.xmlUrl);
  const docHistory = Array.isArray(inv.document_history)
    ? inv.document_history
    : [];
  const payments: Array<any> = Array.isArray(inv.payments)
    ? inv.payments
    : Array.isArray(inv.pagos)
      ? inv.pagos
      : [];

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
            : folioInterno,
        };
      }
      if (doc.document_type === "pdf") acc[v].pdf = doc;
      if (doc.document_type === "xml") acc[v].xml = doc;
      if (doc.document_type === "acuse_cancelacion") acc[v].acuse = doc;
      return acc;
    }, {}),
  ).sort((a: any, b: any) => b.version - a.version);

  // ============================================================================
  // DESCARGAS
  // ============================================================================
  const handleDownload = (urlOrName: string) => {
    if (urlOrName.startsWith("http")) {
      window.open(urlOrName, "_blank", "noopener,noreferrer");
    } else if (urlOrName.startsWith("/")) {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const finalUrl = baseUrl ? `${baseUrl}${urlOrName}` : urlOrName;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
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

  // ============================================================================
  // FORMATTERS
  // ============================================================================
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[650px] bg-slate-50 dark:bg-background/95 backdrop-blur-xl border-l-slate-200 dark:border-l-white/10 p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* HEADER FLOTANTE */}
        <SheetHeader className="px-6 py-5 border-b border-border/50 flex flex-row items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-40 shadow-sm">
          <SheetTitle className="flex items-center gap-3 text-brand-navy dark:text-white font-black text-xl tracking-tight m-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Detalle de Cuenta por Pagar
          </SheetTitle>

          <div className="flex items-center gap-3 mt-0">
            <Badge
              variant="outline"
              className={cn("shadow-sm font-black px-3 py-1", badgeColor)}
            >
              {badgeLabel}
            </Badge>
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
          {/* ALERTA DE CANCELACIÓN */}
          {isCanceled && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                  Factura Cancelada por el Proveedor
                </h4>
                <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 mt-1 leading-snug">
                  Este comprobante fue cancelado el{" "}
                  <strong>{fDT(inv.fecha_cancelacion)}</strong>
                  {inv.motivo_cancelacion
                    ? ` (Motivo SAT: ${inv.motivo_cancelacion})`
                    : ""}
                  .
                </p>
              </div>
            </div>
          )}

          {/* TARJETA PRINCIPAL: FOLIO Y BOTÓN DE PAGO */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between bg-white dark:bg-card p-5 rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm relative overflow-hidden group gap-4">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-navy group-hover:bg-blue-600 transition-colors"></div>
            <div className="flex-1 pl-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-500" /> Folio Interno /
                Serie
              </p>
              <div className="flex items-center gap-3">
                <p className="font-mono font-black text-xl text-foreground tracking-tight break-all">
                  {folioInterno}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    UUID:
                  </span>
                  <span className="font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 break-all">
                    {uuid}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
              {!isPaid && !isCanceled && onPayClick && (
                <Button
                  onClick={() => onPayClick(invoice)}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black h-11 px-6 text-[11px] tracking-widest uppercase rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Registrar Pago
                </Button>
              )}
            </div>
          </div>

          {/* GRID: PROVEEDOR Y CONCEPTO (IDÉNTICO A CXC) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 p-5 bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Proveedor
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
                <FileText className="w-3.5 h-3.5" /> Concepto / Gasto
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

          {/* GRID: SALDO, FECHAS Y RESUMEN FINANCIERO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* IZQUIERDA: SALDO Y FECHAS */}
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
                    Deuda Pendiente
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

            {/* DERECHA: RESUMEN FINANCIERO */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner flex flex-col justify-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-400" /> Resumen de
                Compra
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
                    Total Factura:
                  </span>
                  <span className="font-mono text-xl font-black text-brand-navy dark:text-white">
                    {fC(montoTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200 dark:bg-border/50" />

          {/* HISTORIAL DE PAGOS REGISTRADOS */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2 tracking-tight">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Abonos y Pagos Registrados
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-black">
                  {payments.length}
                </span>
              </h3>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">
                  No hay pagos registrados para este proveedor.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-card">
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                      <DataTableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">
                        Fecha
                      </DataTableHead>
                      <DataTableHead className="text-right text-[10px] font-black uppercase tracking-widest h-10">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">
                        Referencia
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {payments.map((p: any) => {
                      const fecha = safeStr(p.fecha_pago ?? p.fecha);
                      const monto = toNumber(p.monto);
                      const referencia = safeStr(p.referencia ?? "—");

                      return (
                        <DataTableRow
                          key={safeStr(p.id)}
                          className="border-b-slate-100 dark:border-b-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <DataTableCell className="py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {fD(fecha)}
                          </DataTableCell>
                          <DataTableCell className="text-right py-2.5">
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                              {fC(monto)}
                            </span>
                          </DataTableCell>
                          <DataTableCell className="py-2.5 px-4 text-xs font-mono text-muted-foreground">
                            {referencia}
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

          {/* TABLA DE EXPEDIENTE Y VERSIONES */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-slate-200 dark:border-border/50 shadow-sm relative overflow-hidden group">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 relative z-10">
              <History className="h-3.5 w-3.5 text-blue-500" /> Expediente y
              Archivos
            </h3>

            <div className="border border-slate-200 dark:border-border/50 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/20 relative z-10">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow className="bg-slate-100/50 dark:bg-slate-800/50 border-b-slate-200 dark:border-b-border/50 hover:bg-transparent">
                    <DataTableHead className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest py-3 h-auto">
                      Documento
                    </DataTableHead>
                    <DataTableHead className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest py-3 h-auto">
                      Fecha Carga
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
                        className={cn(
                          "border-b-slate-100 dark:border-b-border/50 transition-colors",
                          group.is_active
                            ? "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            : "opacity-60 grayscale hover:grayscale-0",
                        )}
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
                    // FALLBACK: Si no hay historial pero sí URLs directas (Ej. Facturas subidas manuales)
                    <DataTableRow className="border-b-slate-100 dark:border-b-border/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <DataTableCell className="py-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {folioInterno || "Factura_Proveedor"}
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
                              onClick={() => handleDownload(pdfUrl)}
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
                              onClick={() => handleDownload(xmlUrl)}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
