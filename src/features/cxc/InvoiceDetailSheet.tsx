import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Building2,
  Receipt,
  Link2,
  AlertCircle,
} from "lucide-react";
import {
  ReceivableInvoice,
  getInvoiceStatusInfo,
  calculateDaysOverdue,
} from "./types";

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ReceivableInvoice | null;
}

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoice,
}: InvoiceDetailSheetProps) {
  if (!invoice) return null;

  const statusInfo = getInvoiceStatusInfo(invoice);
  const daysOverdue = calculateDaysOverdue(invoice.fechaVencimiento);
  const paymentPercentage =
    ((invoice.montoTotal - invoice.saldoPendiente) / invoice.montoTotal) * 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[580px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-navy" />
            Detalle de Factura
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Folio
              </p>
              <p className="font-mono font-bold text-xl text-brand-dark">
                {invoice.folio}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={statusInfo.status}>
                {statusInfo.label}
              </StatusBadge>
              {invoice.requiereREP && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                  PENDIENTE REP
                </span>
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Client
              </span>
            </div>
            <p className="font-semibold text-brand-dark">{invoice.cliente}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {invoice.clienteRfc}
            </p>
          </div>

          {/* Payment Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progreso de Pago</span>
              <span className="text-sm font-bold">
                {paymentPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={paymentPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Cobrado: $
                {(invoice.montoTotal - invoice.saldoPendiente).toLocaleString(
                  "es-MX",
                )}
              </span>
              <span>
                Pendiente: ${invoice.saldoPendiente.toLocaleString("es-MX")}
              </span>
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha Emisión
              </div>
              <p className="font-medium">{invoice.fechaEmision}</p>
            </div>
            <div
              className={`p-3 rounded border ${daysOverdue > 0 ? "bg-red-50 border-red-200" : "bg-slate-50"}`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha Vencimiento
              </div>
              <p
                className={`font-medium ${daysOverdue > 0 ? "text-status-danger" : ""}`}
              >
                {invoice.fechaVencimiento}
                {daysOverdue > 0 && (
                  <span className="text-xs ml-2">(+{daysOverdue} días)</span>
                )}
              </p>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-100 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                Monto Total
              </div>
              <p className="text-xl font-bold text-brand-dark">
                ${invoice.montoTotal.toLocaleString("es-MX")}{" "}
                <span className="text-xs">{invoice.moneda}</span>
              </p>
            </div>
            <div
              className={`p-4 rounded-lg ${invoice.saldoPendiente > 0 ? "bg-amber-50" : "bg-emerald-50"}`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <AlertCircle className="h-3 w-3" />
                Saldo Pendiente
              </div>
              <p
                className={`text-xl font-bold ${invoice.saldoPendiente > 0 ? "text-amber-700" : "text-emerald-700"}`}
              >
                ${invoice.saldoPendiente.toLocaleString("es-MX")}{" "}
                <span className="text-xs">{invoice.moneda}</span>
              </p>
            </div>
          </div>

          {/* Conceptos */}
          <div>
            <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Conceptos Facturados ({invoice.conceptos.length})
            </h3>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>Descripción</DataTableHead>
                  <DataTableHead className="text-center">Cant.</DataTableHead>
                  <DataTableHead className="text-right">Importe</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {invoice.conceptos.map((concepto) => (
                  <DataTableRow key={concepto.id}>
                    <DataTableCell className="text-sm max-w-[200px] truncate">
                      {concepto.descripcion}
                    </DataTableCell>
                    <DataTableCell className="text-center text-sm">
                      {concepto.cantidad}
                    </DataTableCell>
                    <DataTableCell className="text-right font-medium">
                      ${concepto.importe.toLocaleString("es-MX")}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          {/* Related Services */}
          {invoice.serviciosRelacionados.length > 0 && (
            <div className="p-3 bg-slate-50 rounded border">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Servicios Relacionados
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {invoice.serviciosRelacionados.map((srvId) => (
                  <span
                    key={srvId}
                    className="px-2 py-1 bg-brand-navy/10 text-brand-navy text-xs font-mono rounded"
                  >
                    {srvId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Historial de Cobros ({invoice.cobros.length})
            </h3>

            {invoice.cobros.length === 0 ? (
              <div className="p-4 text-center bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No hay cobros registrados
                </p>
              </div>
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Fecha</DataTableHead>
                    <DataTableHead className="text-right">Monto</DataTableHead>
                    <DataTableHead>Ref.</DataTableHead>
                    <DataTableHead>REP</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {invoice.cobros.map((cobro) => (
                    <DataTableRow key={cobro.id}>
                      <DataTableCell className="text-sm">
                        {cobro.fecha}
                      </DataTableCell>
                      <DataTableCell className="text-right font-medium text-emerald-700">
                        ${cobro.monto.toLocaleString("es-MX")}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs">
                        {cobro.referencia}
                      </DataTableCell>
                      <DataTableCell>
                        {cobro.requiereREP ? (
                          <StatusBadge
                            status={
                              cobro.estatusREP === "pendiente"
                                ? "warning"
                                : "success"
                            }
                          >
                            {cobro.estatusREP === "pendiente"
                              ? "Pendiente"
                              : "Generado"}
                          </StatusBadge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 flex-1">
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2 flex-1">
              <Download className="h-4 w-4" />
              Descargar XML
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
