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
} from "lucide-react";
import type { PayableInvoice } from "@/features/payables/types";
import { getInvoiceStatusInfo } from "@/lib/utils";

type AnyInvoice = PayableInvoice & Record<string, any>;

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PayableInvoice | null;
  onPayClick?: (invoice: PayableInvoice) => void;
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
  if (!invoice) return null;

  const inv = invoice as AnyInvoice;
  const statusInfo = getInvoiceStatusInfo(invoice);

  // === EXTRACCIÓN DE DATOS CORREGIDA (Soporta CxC y CxP) ===
  const id = safeStr(inv.id);
  const folioInterno = safeStr(inv.folio_interno) || `ID-${id}`;
  const uuid = safeStr(inv.uuid) || "NO TIMBRADO";

  const entidadNombre =
    safeStr(inv.client?.razon_social) ||
    safeStr(inv.supplier_razon_social) ||
    safeStr(inv.proveedor) ||
    "Público en General";

  const entidadRfc =
    safeStr(inv.client?.rfc) ||
    safeStr(inv.supplier_rfc) ||
    safeStr(inv.rfc) ||
    "RFC NO DISPONIBLE";

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
      : [];

  const ordenFolio =
    safeStr(inv.orden_compra_folio) || safeStr(inv.ordenCompraFolio);

  // MANEJADOR DE DESCARGAS ROBUSTO
  const handleDownload = (urlOrName: string) => {
    if (urlOrName.startsWith("http")) {
      window.open(urlOrName, "_blank", "noopener,noreferrer");
    } else if (urlOrName.startsWith("/")) {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const finalUrl = baseUrl ? `${baseUrl}${urlOrName}` : urlOrName;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[540px] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-4 border-b flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 mt-2">
            <Receipt className="h-5 w-5 text-brand-navy" />
            Detalle de Factura
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Header: Folios y Status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Folio Interno
              </p>
              <p className="font-mono font-bold text-lg text-foreground">
                {folioInterno}
              </p>
              {ordenFolio && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Origen: <span className="font-mono">{ordenFolio}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={statusInfo.status}>
                {statusInfo.label}
              </StatusBadge>
              {saldoPendiente > 0 && onPayClick && (
                <Button
                  size="sm"
                  onClick={() => onPayClick(invoice)}
                  className="bg-brand-navy hover:bg-slate-800 text-white font-bold h-8 text-[10px] tracking-widest uppercase"
                >
                  <Banknote className="w-3 h-3 mr-2" /> Abonar / Pagar
                </Button>
              )}
            </div>
          </div>

          {/* Cliente / Proveedor con RFC */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Entidad Comercial
              </span>
            </div>
            <p className="font-semibold text-foreground text-base">
              {entidadNombre}
            </p>
            <p className="font-mono text-xs text-slate-500 mt-1 uppercase">
              RFC: {entidadRfc}
            </p>
          </div>

          {/* Concepto & UUID */}
          <div className="grid gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Concepto
              </p>
              <p className="text-sm text-slate-700">{concepto}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                Folio Fiscal SAT (UUID)
              </p>
              <p className="font-mono text-xs bg-muted p-2 rounded break-all border border-border/50 text-slate-600">
                {uuid}
              </p>
            </div>
          </div>

          {/* Fechas y Montos ... (Se mantiene igual tu grid) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded border border-border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" /> Fecha Emisión
              </div>
              <p className="font-medium">{fechaEmision}</p>
            </div>
            <div
              className={`p-3 rounded border ${statusInfo.status === "danger" ? "bg-red-50 border-red-200" : "bg-slate-50 border-border"}`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" /> Vencimiento
              </div>
              <p
                className={`font-medium ${statusInfo.status === "danger" ? "text-status-danger" : ""}`}
              >
                {fechaVencimiento}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" /> Monto Total
              </div>
              <p className="text-xl font-bold text-foreground">
                $
                {montoTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                <span className="text-xs">{moneda}</span>
              </p>
            </div>
            <div
              className={`p-4 rounded-lg ${saldoPendiente > 0 ? "bg-amber-50 border border-amber-100" : "bg-emerald-50 border border-emerald-100"}`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CreditCard className="h-3 w-3" /> Saldo Pendiente
              </div>
              <p
                className={`text-xl font-bold ${saldoPendiente > 0 ? "text-amber-700" : "text-emerald-700"}`}
              >
                $
                {saldoPendiente.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                <span className="text-xs">{moneda}</span>
              </p>
            </div>
          </div>

          <Separator />

          {/* =========================================================
              1. SECCIÓN: HISTORIAL DE PAGOS (LOS ABONOS / REP)
              ========================================================= */}
          <div>
            <h3 className="text-sm font-semibold text-brand-dark mb-1 flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Recibos de Pago (Abonos)
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
              Historial de abonos realizados. El comprobante SAT generado aquí
              es el{" "}
              <strong className="text-slate-600">
                Complemento de Pago (REP)
              </strong>
              .
            </p>

            {payments.length === 0 ? (
              <div className="p-4 text-center bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No hay pagos registrados
                </p>
              </div>
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Fecha</DataTableHead>
                    <DataTableHead className="text-right">Monto</DataTableHead>
                    <DataTableHead className="text-center">
                      Comprobante SAT (REP)
                    </DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {payments.map((p) => {
                    const fecha = safeStr(p.fecha_pago ?? p.fecha);
                    const monto = toNumber(p.monto);
                    const complementoUuid = safeStr(
                      p.complemento_uuid ?? p.complementoUuid,
                    );

                    return (
                      <DataTableRow key={safeStr(p.id)}>
                        <DataTableCell className="text-sm">
                          {fecha || "—"}
                        </DataTableCell>
                        <DataTableCell className="text-right font-medium text-emerald-700">
                          $
                          {monto.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </DataTableCell>
                        <DataTableCell className="text-center">
                          {complementoUuid ? (
                            <div className="flex justify-center items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar PDF del Pago"
                                className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                                onClick={() =>
                                  handleDownload(
                                    `/api/sat/invoice/${complementoUuid}/pdf`,
                                  )
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar XML del Pago"
                                className="h-7 w-7 text-blue-500 hover:bg-blue-50"
                                onClick={() =>
                                  handleDownload(
                                    `/api/sat/invoice/${complementoUuid}/xml`,
                                  )
                                }
                              >
                                <FileCode2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              No timbrado
                            </span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            )}
          </div>

          {/* =========================================================
              2. SECCIÓN: ARCHIVOS FACTURA ORIGINAL (LA DEUDA TOTAL)
              ========================================================= */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
            <h3 className="text-sm font-semibold text-brand-dark mb-1 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Factura de Origen (Por el Total)
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
              Estos son los archivos de la factura principal generada
              inicialmente (Factura de Ingreso, Carta Porte o Gasto), por el
              monto de <strong>${montoTotal.toLocaleString("es-MX")}</strong>.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white"
                disabled={!pdfUrl}
                onClick={() => pdfUrl && handleDownload(pdfUrl)}
              >
                <Download className="h-3 w-3 text-rose-500" />{" "}
                {pdfUrl ? "PDF Factura Original" : "PDF no disponible"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white"
                disabled={!xmlUrl}
                onClick={() => xmlUrl && handleDownload(xmlUrl)}
              >
                <Download className="h-3 w-3 text-blue-500" />{" "}
                {xmlUrl ? "XML Factura Original" : "XML no disponible"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
