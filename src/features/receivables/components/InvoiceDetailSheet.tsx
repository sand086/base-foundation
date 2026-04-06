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
  const daysOverdue = calculateDaysOverdue(invoice.fecha_vencimiento);

  // Limpiamos los fallbacks en caso de que vengan de otro nombre en la API
  const montoTotal = invoice.monto_total || 0;
  const saldoPendiente = invoice.saldo_pendiente || 0;

  const paymentPercentage =
    montoTotal > 0 ? ((montoTotal - saldoPendiente) / montoTotal) * 100 : 0;

  // 🚀 AQUÍ ESTÁ TU LÓGICA INTELIGENTE (Fallback)
  const listaConceptos =
    invoice.conceptos && Array.isArray(invoice.conceptos)
      ? invoice.conceptos
      : invoice.concepto
        ? [
            {
              id: "unico",
              descripcion: invoice.concepto,
              cantidad: 1,
              importe: invoice.subtotal || montoTotal,
            },
          ]
        : [];

  const listaServicios = invoice.servicios_relacionados || [];
  const listaCobros = invoice.payments || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[580px] overflow-y-auto bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl border-l border-slate-200 dark:border-white/10 shadow-2xl">
        <SheetHeader className="pb-4 border-b border-slate-200 dark:border-white/10">
          <SheetTitle className="flex items-center gap-2 text-brand-navy dark:text-white font-black uppercase tracking-tighter text-xl">
            <Receipt className="h-5 w-5 text-emerald-600" />
            Detalle de Factura
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                Folio Fiscal / Interno
              </p>
              <p className="font-mono font-black text-2xl text-brand-navy dark:text-white">
                {invoice.folio_interno || "S/F"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={statusInfo.status}>
                {statusInfo.label}
              </StatusBadge>
              {invoice.requiere_rep && (
                <span className="px-2 py-1 bg-amber-100/50 text-amber-700 border border-amber-200/50 rounded-md font-black text-[9px] uppercase tracking-widest">
                  PENDIENTE REP
                </span>
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Datos del Cliente
              </span>
            </div>
            <p className="font-black text-slate-800 dark:text-slate-200 uppercase text-sm">
              {invoice.cliente ||
                invoice.client?.razon_social ||
                "CLIENTE NO DEFINIDO"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold mt-1">
              {invoice.cliente_rfc ||
                invoice.client?.rfc ||
                "RFC NO DISPONIBLE"}
            </p>
          </div>

          {/* Payment Progress Bar */}
          <div className="space-y-3 p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Progreso de Pago
              </span>
              <span className="text-sm font-black text-emerald-600">
                {paymentPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={paymentPercentage}
              className="h-2 bg-slate-100 dark:bg-slate-800"
              indicatorClassName="bg-emerald-500"
            />
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>
                Cobrado: $
                {(montoTotal - saldoPendiente).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span>
                Pendiente: $
                {saldoPendiente.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Emisión
              </div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {invoice.fecha_emision
                  ? new Date(invoice.fecha_emision).toLocaleDateString("es-MX")
                  : "—"}
              </p>
            </div>
            <div
              className={`p-4 rounded-2xl border ${daysOverdue > 0 ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50" : "bg-slate-50/50 border-slate-200 dark:bg-slate-900/50 dark:border-white/10"}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                <Calendar
                  className={`h-3.5 w-3.5 ${daysOverdue > 0 ? "text-red-500" : "text-blue-500"}`}
                />
                Vencimiento
              </div>
              <p
                className={`font-bold text-sm ${daysOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}
              >
                {invoice.fecha_vencimiento
                  ? new Date(invoice.fecha_vencimiento).toLocaleDateString(
                      "es-MX",
                    )
                  : "—"}
                {daysOverdue > 0 && invoice.saldo_pendiente > 0 && (
                  <span className="block text-[9px] mt-1 text-red-500 font-black animate-pulse">
                    (+{daysOverdue} DÍAS VENCIDO)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-brand-navy rounded-2xl shadow-md text-white">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                <DollarSign className="h-3.5 w-3.5" />
                Monto Total
              </div>
              <p className="text-2xl font-black font-mono tracking-tighter">
                $
                {montoTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                <span className="text-[10px] text-slate-400">
                  {invoice.moneda || "MXN"}
                </span>
              </p>
            </div>
            <div
              className={`p-5 rounded-2xl border shadow-sm ${saldoPendiente > 0 ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50"}`}
            >
              <div
                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-2 ${saldoPendiente > 0 ? "text-amber-600/70 dark:text-amber-500/70" : "text-emerald-600/70 dark:text-emerald-500/70"}`}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Saldo Pendiente
              </div>
              <p
                className={`text-2xl font-black font-mono tracking-tighter ${saldoPendiente > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"}`}
              >
                $
                {saldoPendiente.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                <span className="text-[10px] opacity-70">
                  {invoice.moneda || "MXN"}
                </span>
              </p>
            </div>
          </div>

          {/* Conceptos */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Conceptos Facturados ({listaConceptos.length})
            </h3>
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <DataTable>
                <DataTableHeader className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-white/10">
                  <DataTableRow className="hover:bg-transparent">
                    <DataTableHead className="text-[9px] font-black uppercase tracking-widest h-10">
                      Descripción
                    </DataTableHead>
                    <DataTableHead className="text-center text-[9px] font-black uppercase tracking-widest h-10">
                      Cant.
                    </DataTableHead>
                    <DataTableHead className="text-right text-[9px] font-black uppercase tracking-widest h-10 pr-4">
                      Importe
                    </DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {/* 🚀 MAGIA APLICADA: Aquí usamos listaConceptos en lugar de invoice.conceptos */}
                  {listaConceptos.map((concepto: any, i: number) => (
                    <DataTableRow
                      key={concepto.id || i}
                      className="border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      <DataTableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[200px] truncate py-3">
                        {concepto.descripcion}
                      </DataTableCell>
                      <DataTableCell className="text-center text-xs font-medium py-3">
                        {concepto.cantidad || 1}
                      </DataTableCell>
                      <DataTableCell className="text-right font-mono font-bold text-slate-700 dark:text-slate-300 pr-4 py-3">
                        $
                        {Number(concepto.importe || 0).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </div>

          {/* Related Services */}
          {listaServicios.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Servicios Relacionados
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {listaServicios.map((srvId: any) => (
                  <span
                    key={srvId}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-black font-mono tracking-widest rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    {srvId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Historial de Cobros ({listaCobros.length})
            </h3>

            {listaCobros.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  No hay cobros registrados
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <DataTable>
                  <DataTableHeader className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-white/10">
                    <DataTableRow className="hover:bg-transparent">
                      <DataTableHead className="text-[9px] font-black uppercase tracking-widest h-10">
                        Fecha
                      </DataTableHead>
                      <DataTableHead className="text-right text-[9px] font-black uppercase tracking-widest h-10">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-[9px] font-black uppercase tracking-widest h-10">
                        Ref.
                      </DataTableHead>
                      <DataTableHead className="text-[9px] font-black uppercase tracking-widest h-10 text-center pr-4">
                        REP
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {listaCobros.map((cobro: any) => (
                      <DataTableRow
                        key={cobro.id}
                        className="border-b border-slate-100 dark:border-white/5 last:border-0"
                      >
                        <DataTableCell className="text-xs font-medium py-3 text-slate-600 dark:text-slate-400">
                          {cobro.fecha_pago || cobro.fecha}
                        </DataTableCell>
                        <DataTableCell className="text-right font-mono font-black text-emerald-600 py-3">
                          $
                          {Number(cobro.monto).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </DataTableCell>
                        <DataTableCell className="font-mono text-[10px] font-bold text-slate-500 py-3">
                          {cobro.referencia || "—"}
                        </DataTableCell>
                        <DataTableCell className="text-center pr-4 py-3">
                          {cobro.complemento_uuid || cobro.requiereREP ? (
                            <StatusBadge
                              status={
                                cobro.estatusREP === "pendiente" ||
                                !cobro.complemento_uuid
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {cobro.estatusREP === "pendiente" ||
                              !cobro.complemento_uuid
                                ? "Pendiente"
                                : "Generado"}
                            </StatusBadge>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              N/A
                            </span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
            <Button
              variant="outline"
              className="flex-1 h-11 font-black text-[10px] uppercase tracking-widest border-slate-200 shadow-sm haptic-press"
            >
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 font-black text-[10px] uppercase tracking-widest border-slate-200 shadow-sm haptic-press text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" /> XML
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
