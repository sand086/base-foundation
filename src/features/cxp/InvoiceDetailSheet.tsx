import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from '@/components/ui/data-table';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign, 
  Building2,
  Receipt,
  CreditCard
} from 'lucide-react';
import { PayableInvoice, getInvoiceStatusInfo } from './types';

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PayableInvoice | null;
}

export function InvoiceDetailSheet({ open, onOpenChange, invoice }: InvoiceDetailSheetProps) {
  if (!invoice) return null;

  const statusInfo = getInvoiceStatusInfo(invoice);

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
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">ID Factura</p>
              <p className="font-mono font-bold text-lg text-brand-dark">{invoice.id}</p>
            </div>
            <StatusBadge status={statusInfo.status}>
              {statusInfo.label}
            </StatusBadge>
          </div>

          {/* Provider */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proveedor</span>
            </div>
            <p className="font-semibold text-brand-dark">{invoice.proveedor}</p>
          </div>

          {/* Concepto */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Concepto</p>
            <p className="text-sm text-slate-700">{invoice.concepto || 'Sin descripción'}</p>
          </div>

          {/* UUID */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Folio Fiscal (UUID)</p>
            <p className="font-mono text-xs bg-muted p-2 rounded break-all">{invoice.uuid}</p>
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
            <div className={`p-3 rounded border ${statusInfo.status === 'danger' ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha Vencimiento
              </div>
              <p className={`font-medium ${statusInfo.status === 'danger' ? 'text-status-danger' : ''}`}>
                {invoice.fechaVencimiento}
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
                ${invoice.montoTotal.toLocaleString('es-MX')} <span className="text-xs">{invoice.moneda}</span>
              </p>
            </div>
            <div className={`p-4 rounded-lg ${invoice.saldoPendiente > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CreditCard className="h-3 w-3" />
                Saldo Pendiente
              </div>
              <p className={`text-xl font-bold ${invoice.saldoPendiente > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ${invoice.saldoPendiente.toLocaleString('es-MX')} <span className="text-xs">{invoice.moneda}</span>
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Historial de Pagos ({invoice.pagos.length})
            </h3>
            
            {invoice.pagos.length === 0 ? (
              <div className="p-4 text-center bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">No hay pagos registrados</p>
              </div>
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Fecha</DataTableHead>
                    <DataTableHead className="text-right">Monto</DataTableHead>
                    <DataTableHead>Referencia</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {invoice.pagos.map((pago) => (
                    <DataTableRow key={pago.id}>
                      <DataTableCell className="text-sm">{pago.fecha}</DataTableCell>
                      <DataTableCell className="text-right font-medium text-emerald-700">
                        ${pago.monto.toLocaleString('es-MX')}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs">{pago.referencia}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </div>

          {/* Attachments */}
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
                disabled={!invoice.pdfUrl}
              >
                <Download className="h-3 w-3" />
                {invoice.pdfUrl || 'PDF no disponible'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={!invoice.xmlUrl}
              >
                <Download className="h-3 w-3" />
                {invoice.xmlUrl || 'XML no disponible'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
