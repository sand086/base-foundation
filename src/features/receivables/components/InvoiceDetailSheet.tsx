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
  Download,
  Calendar,
  DollarSign,
  Building2,
  Receipt,
  CreditCard,
  Banknote,
  FileCode2,
  Plus,
  Hash,
  AlertCircle,
  Coins,
  X, //  Importamos el icono de la X
} from "lucide-react";
import { useEffect } from "react";
import type { ReceivableInvoice } from "@/features/receivables/types";
import { getInvoiceStatusInfo } from "@/lib/utils";

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
      console.log("  FACTURA DE CLIENTE ABIERTA:", invoice);
    }
  }, [invoice, open]);

  if (!invoice) return null;

  // 🛡️ VACUNA TYPESCRIPT
  const inv = invoice as any;
  const statusInfo = getInvoiceStatusInfo(inv);

  // 💡 EXTRACCIÓN DE DATOS
  const uuid = safeStr(inv.uuid) || "NO TIMBRADO";
  const rawFolio = safeStr(inv.folio_interno) || safeStr(inv.folio);
  const displayFolio = rawFolio && rawFolio !== "S/F" ? rawFolio : uuid;

  const entidadNombre =
    safeStr(inv.client?.razon_social) || "Público en General";
  const entidadRfc = safeStr(inv.client?.rfc) || "RFC NO DISPONIBLE";

  const concepto = safeStr(inv.concepto) || "Sin descripción";
  const fechaEmision =
    safeStr(inv.fecha_emision) || safeStr(inv.fechaEmision) || "—";
  const fechaVencimiento =
    safeStr(inv.fecha_vencimiento) || safeStr(inv.fechaVencimiento) || "—";
  const montoTotal = toNumber(inv.monto_total ?? inv.montoTotal);
  const saldoPendiente = toNumber(inv.saldo_pendiente ?? inv.saldoPendiente);
  const moneda = safeStr(inv.moneda) || "MXN";
  const pdfUrl = safeStr(inv.pdf_url ?? inv.pdfUrl);
  const xmlUrl = safeStr(inv.xml_url ?? inv.xmlUrl);

  const payments: Array<any> = Array.isArray(inv.payments)
    ? inv.payments
    : Array.isArray(inv.pagos)
      ? inv.pagos
      : Array.isArray(inv.cobros)
        ? inv.cobros
        : [];

  const ordenFolio =
    safeStr(inv.orden_compra_folio) || safeStr(inv.ordenCompraFolio);

  //  DESCARGA ROBUSTA
  // 🛡️ DESCARGA ROBUSTA (Inmune a problemas de red y Axios)
  const handleDownload = (fileType: "pdf" | "xml", targetUuid: string) => {
    try {
      // 1. Tomamos la base URL de Vite o usamos /api como respaldo relativo
      const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      const baseURL = rawBaseURL.replace(/\/$/, "");

      // 2. Armamos la ruta exacta apuntando a nuestro backend en Python
      const fileUrl = `${baseURL}/sat/invoice/${targetUuid}/${fileType}`;

      // 3. Forzamos descarga nativa
      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.setAttribute("download", `CFDI_${targetUuid}.${fileType}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al descargar:", error);
    }
  };

  // 🎨 HELPERS DE UI
  const fC = (n: any) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  const fD = (d: any) =>
    d
      ? new Date(d).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const isPaid = saldoPendiente <= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[560px] bg-background/95 backdrop-blur-xl border-l-slate-200 dark:border-l-white/10"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* ================= HEADER CON BOTÓN CERRAR INCLUIDO ================= */}
        <SheetHeader className="pb-5 border-b border-border/50 flex flex-row items-center justify-between sticky top-0 bg-background/95 backdrop-blur-xl z-40 -mx-8 px-8 -mt-8 pt-8">
          <SheetTitle className="flex items-center gap-3 text-brand-navy dark:text-white font-bold text-xl normal-case tracking-tight">
            <div className="p-2 bg-brand-navy/5 dark:bg-brand-navy/20 rounded-xl border border-brand-navy/10 dark:border-brand-navy/30">
              <Receipt className="h-5 w-5 text-brand-navy dark:text-blue-400" />
            </div>
            Detalle de Factura
          </SheetTitle>

          <div className="flex items-center gap-3">
            <StatusBadge status={statusInfo.status} className="shadow-sm">
              {statusInfo.label}
            </StatusBadge>

            {/*  BOTÓN EXPLÍCITO DE CERRAR */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              onClick={() => onOpenChange(false)}
              title="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* CONTENEDOR CON SCROLL */}
        <div className="space-y-6 py-6 animate-in slide-in-from-right-4 duration-500 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar -mx-4 px-4">
          {/* ================= IDENTIFICACIÓN ================= */}
          <div className="flex items-start justify-between bg-card p-5 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-navy/50 group-hover:bg-brand-navy transition-colors"></div>
            <div className="flex-1 pr-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Hash className="w-3.5 h-3.5" /> Folio / Identificador
              </p>
              <p className="font-mono font-black text-[15px] sm:text-lg text-foreground tracking-tight break-all">
                {displayFolio}
              </p>
              {ordenFolio && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    Origen OC:
                  </span>
                  <span className="font-mono text-[10px] font-black text-slate-700 dark:text-slate-300">
                    {ordenFolio}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {!isPaid && onPayClick && (
                <Button
                  size="sm"
                  onClick={() => onPayClick(invoice)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs tracking-widest uppercase rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Banknote className="w-4 h-4 mr-2" /> Cobrar
                </Button>
              )}
            </div>
          </div>

          {/* ================= CLIENTE ================= */}
          <div className="p-5 bg-card rounded-2xl border border-border/50 shadow-sm transition-all hover:border-brand-navy/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Datos del Cliente
              </span>
            </div>
            <p className="font-black text-foreground text-lg leading-tight mb-1">
              {entidadNombre}
            </p>
            <div className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              RFC: {entidadRfc}
            </div>
          </div>

          {/* ================= CONCEPTO Y MONEDA ================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-4 bg-card rounded-2xl border border-border/50 shadow-sm">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                Concepto Facturado
              </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                {concepto}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-navy via-transparent to-transparent group-hover:opacity-20 transition-opacity"></div>
              <Coins className="h-5 w-5 text-slate-400 mb-1.5" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">
                Moneda
              </p>
              <p className="font-mono text-xl font-black text-brand-navy dark:text-blue-400">
                {moneda}
              </p>
            </div>
          </div>

          {/* ================= FINANCIERO ================= */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-4 bg-card rounded-2xl border border-border/50 flex items-center gap-4 shadow-sm">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <Calendar className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">
                    Emisión
                  </p>
                  <p className="font-bold text-sm text-foreground">
                    {fD(fechaEmision)}
                  </p>
                </div>
              </div>
              <div
                className={`p-4 bg-card rounded-2xl border flex items-center gap-4 shadow-sm ${statusInfo.status === "danger" ? "border-rose-200 dark:border-rose-900/50" : "border-border/50"}`}
              >
                <div
                  className={`p-2.5 rounded-xl ${statusInfo.status === "danger" ? "bg-rose-100 dark:bg-rose-900/30" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  {statusInfo.status === "danger" ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Calendar className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${statusInfo.status === "danger" ? "text-rose-600/70 dark:text-rose-400/70" : "text-muted-foreground"}`}
                  >
                    Vencimiento
                  </p>
                  <p
                    className={`font-bold text-sm ${statusInfo.status === "danger" ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}
                  >
                    {fD(fechaVencimiento)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              <div className="p-4 bg-brand-navy/5 dark:bg-brand-navy/10 rounded-2xl border border-brand-navy/10 dark:border-brand-navy/20 h-full flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-brand-navy/70 dark:text-blue-400" />
                  <p className="text-[10px] font-black text-brand-navy/70 dark:text-blue-400/70 uppercase tracking-widest">
                    Monto Total
                  </p>
                </div>
                <p className="text-2xl font-black text-brand-navy dark:text-white tracking-tighter">
                  {fC(montoTotal)}
                </p>
              </div>
              <div
                className={`p-4 rounded-2xl border h-full flex flex-col justify-center shadow-inner ${isPaid ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard
                    className={`h-3.5 w-3.5 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}
                  />
                  <p
                    className={`text-[10px] font-black uppercase tracking-widest ${isPaid ? "text-emerald-600/70" : "text-amber-600/70"}`}
                  >
                    Saldo Pendiente
                  </p>
                </div>
                <p
                  className={`text-2xl font-black tracking-tighter ${isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"}`}
                >
                  {fC(saldoPendiente)}
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* ================= HISTORIAL DE PAGOS (REP) ================= */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2 tracking-tight">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Historial de Cobros
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold ml-1">
                  {payments.length}
                </span>
              </h3>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                <Receipt className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  No hay cobros registrados
                </p>
                <p className="text-[10px] text-muted-foreground/70 max-w-[200px] leading-tight">
                  Los abonos que registres aparecerán aquí junto con su
                  Complemento de Pago (REP).
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b-border/50">
                      <DataTableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Fecha
                      </DataTableHead>
                      <DataTableHead className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Comprobante SAT (REP)
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
                          className="border-b-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <DataTableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {fD(fecha)}
                          </DataTableCell>
                          <DataTableCell className="text-right">
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                              {fC(monto)}
                            </span>
                          </DataTableCell>

                          <DataTableCell className="text-center">
                            {complementoUuid ? (
                              <div className="flex justify-center items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  title="Descargar PDF"
                                  className="h-8 w-8 rounded-lg text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/30 dark:border-rose-900/50 dark:hover:bg-rose-900/50 transition-all shadow-sm"
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
                                  className="h-8 w-8 rounded-lg text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-950/30 dark:border-blue-900/50 dark:hover:bg-blue-900/50 transition-all shadow-sm"
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

          <Separator className="bg-border/50" />

          {/* ================= ARCHIVOS FACTURA ORIGINAL ================= */}
          <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2 relative z-10">
              <FileText className="h-3.5 w-3.5" /> Archivos de Origen (Deuda
              Total)
            </h3>

            <div className="flex gap-3 relative z-10">
              <Button
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 font-bold tracking-wide h-10 rounded-xl backdrop-blur-sm transition-all"
                disabled={!uuid || uuid === "NO TIMBRADO"}
                onClick={() => handleDownload("pdf", uuid)}
              >
                <Download className="h-4 w-4 text-rose-400" /> PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 font-bold tracking-wide h-10 rounded-xl backdrop-blur-sm transition-all"
                disabled={!uuid || uuid === "NO TIMBRADO"}
                onClick={() => handleDownload("xml", uuid)}
              >
                <Download className="h-4 w-4 text-blue-400" /> XML
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
