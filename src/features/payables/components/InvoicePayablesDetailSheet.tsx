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
} from "lucide-react";
import { useEffect } from "react";

// FIX: Cambiamos a PayableInvoice (Facturas de Proveedores)
import type { PayableInvoice } from "@/features/payables/types";
import { getInvoiceStatusInfo } from "@/lib/utils";

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

export function InvoicePayablesDetailSheet({
  open,
  onOpenChange,
  invoice,
  onPayClick,
}: InvoiceDetailSheetProps) {
  useEffect(() => {
    if (invoice && open) {
      console.log("🔥 FACTURA DE PROVEEDOR ABIERTA:", invoice);
    }
  }, [invoice, open]);

  if (!invoice) return null;

  // VACUNA TYPESCRIPT
  const inv = invoice as any;
  const statusInfo = getInvoiceStatusInfo(inv);

  const id = safeStr(inv.id);
  const folioInterno = safeStr(inv.folio_interno) || `ID-${id}`;
  const uuid = safeStr(inv.uuid) || "NO TIMBRADO";

  // FIX: Ajustamos las propiedades a Proveedor (Supplier) en lugar de Cliente
  const entidadNombre =
    safeStr(inv.supplier?.razon_social) ||
    safeStr(inv.supplier_razon_social) ||
    "Proveedor Desconocido";

  const entidadRfc = safeStr(inv.supplier?.rfc) || "RFC NO DISPONIBLE";

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

  const handleDownload = (urlOrName: string) => {
    if (urlOrName.startsWith("http")) {
      window.open(urlOrName, "_blank", "noopener,noreferrer");
    } else if (urlOrName.startsWith("/")) {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const finalUrl = baseUrl ? `${baseUrl}${urlOrName}` : urlOrName;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    }
  };

  const fC = (n: any) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  const fD = (d: any) => (d ? new Date(d).toLocaleDateString("es-MX") : "—");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[560px] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-4 border-b flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 mt-2">
            <Receipt className="h-5 w-5 text-brand-navy" />
            Detalle de Gasto / CXP
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Folio / Interno
              </p>
              <p className="font-mono font-bold text-lg text-foreground">
                {folioInterno}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={statusInfo.status}>
                {statusInfo.label}
              </StatusBadge>
            </div>
          </div>

          {/* Proveedor */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Datos del Proveedor
              </span>
            </div>
            <p className="font-semibold text-foreground text-base">
              {entidadNombre}
            </p>
            <p className="font-mono text-xs text-slate-500 mt-1 uppercase">
              {entidadRfc}
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Folio Fiscal SAT (UUID)
              </p>
              <p className="font-mono text-xs bg-muted p-2 rounded break-all border border-border/50 text-slate-600">
                {uuid}
              </p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded border border-border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" /> Emisión
              </div>
              <p className="font-medium">{fD(fechaEmision)}</p>
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
                {fD(fechaVencimiento)}
              </p>
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" /> Monto Total
              </div>
              <p className="text-xl font-bold text-foreground">
                {fC(montoTotal)}
              </p>
            </div>
            <div
              className={`p-4 rounded-lg ${saldoPendiente > 0 ? "bg-amber-50 border border-amber-100" : "bg-emerald-50 border border-emerald-100"}`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CreditCard className="h-3 w-3" /> Saldo a Pagar
              </div>
              <p
                className={`text-xl font-bold ${saldoPendiente > 0 ? "text-amber-700" : "text-emerald-700"}`}
              >
                {fC(saldoPendiente)}
              </p>
            </div>
          </div>

          <Separator />

          {/* HISTORIAL DE PAGOS */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Historial de Pagos Egresados (
                {payments.length})
              </h3>
            </div>

            {payments.length === 0 ? (
              <div className="p-4 text-center bg-muted/30 rounded-lg border border-dashed mt-3">
                <p className="text-sm text-muted-foreground">
                  No hay pagos registrados
                </p>
              </div>
            ) : (
              <div className="mt-3 border rounded-xl overflow-hidden">
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50">
                      <DataTableHead className="text-[10px] font-black uppercase">
                        Fecha
                      </DataTableHead>
                      <DataTableHead className="text-right text-[10px] font-black uppercase">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-xs text-muted-foreground">
                        Ref.
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {payments.map((p: any) => {
                      const fecha = safeStr(p.fecha_pago ?? p.fecha);
                      const monto = toNumber(p.monto);
                      const referencia = safeStr(p.referencia ?? "—");

                      return (
                        <DataTableRow key={safeStr(p.id)}>
                          <DataTableCell className="text-xs font-medium">
                            {fD(fecha)}
                          </DataTableCell>
                          <DataTableCell className="text-right font-bold text-emerald-600">
                            {fC(monto)}
                          </DataTableCell>
                          <DataTableCell className="text-xs text-muted-foreground">
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

          <Separator />

          {/* ARCHIVOS FACTURA ORIGINAL */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
            <h3 className="text-sm font-semibold text-brand-dark mb-1 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Factura de Origen
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
              Descarga la factura o comprobante.
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
                {pdfUrl ? "PDF Factura" : "Sin PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white"
                disabled={!xmlUrl}
                onClick={() => xmlUrl && handleDownload(xmlUrl)}
              >
                <Download className="h-3 w-3 text-blue-500" />{" "}
                {xmlUrl ? "XML Factura" : "Sin XML"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
