// src/features/cxp/InvoiceDetailSheet.tsx
//  ALINEADO a la actualización "DB real" (snake_case)
//  Soporta invoice mezclado (snake_case o camelCase) sin romper
//  Historial de pagos: invoice.payments (DB) y compat invoice.pagos (legacy)
//  Adjuntos: pdf_url / xml_url (DB) y compat pdfUrl / xmlUrl (legacy)
//  Render consistente con tu UI (DataTable + StatusBadge)

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

import type { PayableInvoice } from "@/features/cxp/types";
import { getInvoiceStatusInfo } from "@/features/cxp/types";

type AnyInvoice = PayableInvoice & Record<string, any>;

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PayableInvoice | null;
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
}: InvoiceDetailSheetProps) {
  if (!invoice) return null;

  const inv = invoice as AnyInvoice;
  const statusInfo = getInvoiceStatusInfo(invoice);

  // ===========
  // Normalización (snake_case preferido, fallback camelCase)
  // ===========
  const id = safeStr(inv.id);

  const proveedor =
    safeStr(inv.supplier_razon_social) ||
    safeStr(inv.proveedor) ||
    safeStr(inv.supplier_name) ||
    "—";

  const concepto = safeStr(inv.concepto) || "Sin descripción";
  const uuid = safeStr(inv.uuid) || "—";

  const fechaEmision =
    safeStr(inv.fecha_emision) || safeStr(inv.fechaEmision) || "—";
  const fechaVencimiento =
    safeStr(inv.fecha_vencimiento) || safeStr(inv.fechaVencimiento) || "—";

  const montoTotal = toNumber(inv.monto_total ?? inv.montoTotal);
  const saldoPendiente = toNumber(inv.saldo_pendiente ?? inv.saldoPendiente);

  const moneda = safeStr(inv.moneda) || "MXN";

  const pdfUrl = safeStr(inv.pdf_url ?? inv.pdfUrl);
  const xmlUrl = safeStr(inv.xml_url ?? inv.xmlUrl);

  // Payments: DB = payments[], legacy = pagos[]
  const payments: Array<any> = Array.isArray(inv.payments)
    ? inv.payments
    : Array.isArray(inv.pagos)
      ? inv.pagos
      : [];

  // Orden de compra (si lo traes)
  const ordenFolio =
    safeStr(inv.orden_compra_folio) || safeStr(inv.ordenCompraFolio);

  // ===========
  // Handlers (descarga simple / abre link si tienes URL real)
  // Si pdfUrl/xmlUrl son sólo nombres, aquí NO hacemos nada más.
  // ===========
  const handleDownload = (urlOrName: string) => {
    // Si ya guardas URL absoluta/relativa, abre en pestaña
    if (/^https?:\/\//i.test(urlOrName) || urlOrName.startsWith("/")) {
      window.open(urlOrName, "_blank", "noopener,noreferrer");
      return;
    }
    // Si sólo es nombre, puedes conectar aquí tu endpoint real
    // toast.info("Archivo registrado, falta endpoint de descarga");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-navy" />
            Detalle de Factura
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                ID Factura
              </p>
              <p className="font-mono font-bold text-lg text-brand-dark">
                {id}
              </p>
              {ordenFolio ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Origen: <span className="font-mono">{ordenFolio}</span>
                </p>
              ) : null}
            </div>
            <StatusBadge status={statusInfo.status}>
              {statusInfo.label}
            </StatusBadge>
          </div>

          {/* Proveedor */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Proveedor
              </span>
            </div>
            <p className="font-semibold text-brand-dark">{proveedor}</p>
          </div>

          {/* Concepto */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Concepto
            </p>
            <p className="text-sm text-slate-700">{concepto}</p>
          </div>

          {/* UUID */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Folio Fiscal (UUID)
            </p>
            <p className="font-mono text-xs bg-muted p-2 rounded break-all">
              {uuid}
            </p>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha Emisión
              </div>
              <p className="font-medium">{fechaEmision}</p>
            </div>

            <div
              className={`p-3 rounded border ${
                statusInfo.status === "danger"
                  ? "bg-red-50 border-red-200"
                  : "bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha Vencimiento
              </div>
              <p
                className={`font-medium ${
                  statusInfo.status === "danger" ? "text-status-danger" : ""
                }`}
              >
                {fechaVencimiento}
              </p>
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-100 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                Monto Total
              </div>
              <p className="text-xl font-bold text-brand-dark">
                ${montoTotal.toLocaleString("es-MX")}{" "}
                <span className="text-xs">{moneda}</span>
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                saldoPendiente > 0 ? "bg-amber-50" : "bg-emerald-50"
              }`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CreditCard className="h-3 w-3" />
                Saldo Pendiente
              </div>
              <p
                className={`text-xl font-bold ${
                  saldoPendiente > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                ${saldoPendiente.toLocaleString("es-MX")}{" "}
                <span className="text-xs">{moneda}</span>
              </p>
            </div>
          </div>

          <Separator />

          {/* Historial de pagos */}
          <div>
            <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Historial de Pagos ({payments.length})
            </h3>

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
                    <DataTableHead>Cuenta</DataTableHead>
                    <DataTableHead>Referencia</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {payments.map((p) => {
                    const fecha = safeStr(p.fecha_pago ?? p.fecha);
                    const monto = toNumber(p.monto);
                    const cuenta = safeStr(
                      p.cuenta_retiro_nombre ??
                        p.cuentaRetiro ??
                        p.cuenta_retiro ??
                        "",
                    );
                    const referencia = safeStr(p.referencia ?? "");

                    return (
                      <DataTableRow key={safeStr(p.id)}>
                        <DataTableCell className="text-sm">
                          {fecha || "—"}
                        </DataTableCell>
                        <DataTableCell className="text-right font-medium text-emerald-700">
                          ${monto.toLocaleString("es-MX")}
                        </DataTableCell>
                        <DataTableCell className="text-xs text-muted-foreground">
                          {cuenta || "—"}
                        </DataTableCell>
                        <DataTableCell className="font-mono text-xs">
                          {referencia || "—"}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            )}
          </div>

          {/* Adjuntos */}
          <div>
            <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Archivos Adjuntos
            </h3>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!pdfUrl}
                onClick={() => pdfUrl && handleDownload(pdfUrl)}
              >
                <Download className="h-3 w-3" />
                {pdfUrl || "PDF no disponible"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!xmlUrl}
                onClick={() => xmlUrl && handleDownload(xmlUrl)}
              >
                <Download className="h-3 w-3" />
                {xmlUrl || "XML no disponible"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
