import {
  Receipt,
  Download,
  Printer,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import {
  ReceivableInvoice,
  getInvoiceStatusInfo,
  calculateDaysOverdue,
} from "./types";
import { toast } from "sonner";

interface AccountStatementModalProps {
  open: boolean;
  onClose: () => void;
  invoices: ReceivableInvoice[];
}

// Mock company bank data
const companyBankData = {
  razonSocial: "Transportes Rápidos 3T S.A. de C.V.",
  rfc: "TR3T850101ABC",
  cuentas: [
    {
      banco: "Banamex",
      clabe: "002180700100000001",
      cuenta: "70010000000",
      titular: "Transportes Rápidos 3T S.A. de C.V.",
    },
    {
      banco: "Banorte",
      clabe: "072180000000000001",
      cuenta: "0000000001",
      titular: "Transportes Rápidos 3T S.A. de C.V.",
    },
  ],
};

export function AccountStatementModal({
  open,
  onClose,
  invoices,
}: AccountStatementModalProps) {
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Get unique clients
  const clients = useMemo(() => {
    const uniqueClients = [...new Set(invoices.map((inv) => inv.cliente))];
    return uniqueClients.sort();
  }, [invoices]);

  // Filter invoices by client and pending balance
  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => inv.saldoPendiente > 0);
    if (selectedClient !== "all") {
      filtered = filtered.filter((inv) => inv.cliente === selectedClient);
    }
    return filtered.sort(
      (a, b) =>
        new Date(a.fechaVencimiento).getTime() -
        new Date(b.fechaVencimiento).getTime(),
    );
  }, [invoices, selectedClient]);

  // Calculate totals
  const totals = useMemo(() => {
    const corriente = filteredInvoices
      .filter((inv) => calculateDaysOverdue(inv.fechaVencimiento) <= 0)
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);

    const vencido = filteredInvoices
      .filter((inv) => calculateDaysOverdue(inv.fechaVencimiento) > 0)
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);

    return {
      corriente,
      vencido,
      total: corriente + vencido,
    };
  }, [filteredInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const handleDownload = () => {
    toast.success("Generando PDF...", {
      description: "El estado de cuenta se descargará en unos segundos.",
    });
  };

  const handlePrint = () => {
    toast.success("Preparando impresión...", {
      description: "Se abrirá la ventana de impresión.",
    });
  };

  const currentDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Estado de Cuenta
          </DialogTitle>
          <DialogDescription>
            Resumen de facturas pendientes de cobro
          </DialogDescription>
        </DialogHeader>

        {/* Client Filter */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Filtrar por Client
            </Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Fecha de Corte</p>
            <p className="font-medium">{currentDate}</p>
          </div>
        </div>

        {/* Statement Content */}
        <div className="bg-white border-2 border-dashed border-muted rounded-lg p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {companyBankData.razonSocial}
              </h2>
              <p className="text-sm text-muted-foreground">
                RFC: {companyBankData.rfc}
              </p>
            </div>
            <Badge className="bg-primary text-white">ESTADO DE CUENTA</Badge>
          </div>

          {/* Client Info (if filtered) */}
          {selectedClient !== "all" && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Client
              </p>
              <p className="font-semibold text-lg">{selectedClient}</p>
            </div>
          )}

          {/* Invoice List */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Facturas Pendientes
            </h3>

            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-status-success" />
                <p>No hay facturas pendientes de cobro</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 border-b">
                  <div className="col-span-2">Folio</div>
                  <div className="col-span-3">Client</div>
                  <div className="col-span-2 text-right">Monto</div>
                  <div className="col-span-2 text-right">Saldo</div>
                  <div className="col-span-2">Vencimiento</div>
                  <div className="col-span-1">Estado</div>
                </div>

                {/* Invoice Rows */}
                {filteredInvoices.map((invoice) => {
                  const statusInfo = getInvoiceStatusInfo(invoice);
                  const daysOverdue = calculateDaysOverdue(
                    invoice.fechaVencimiento,
                  );
                  const isOverdue = daysOverdue > 0;

                  return (
                    <div
                      key={invoice.id}
                      className={`grid grid-cols-12 gap-2 text-sm py-2 border-b border-muted/50 ${
                        isOverdue ? "bg-red-50" : ""
                      }`}
                    >
                      <div className="col-span-2 font-mono font-medium">
                        {invoice.folio}
                      </div>
                      <div className="col-span-3 truncate">
                        {invoice.cliente}
                      </div>
                      <div className="col-span-2 text-right font-mono">
                        {formatCurrency(invoice.montoTotal)}
                      </div>
                      <div
                        className={`col-span-2 text-right font-mono font-bold ${
                          isOverdue
                            ? "text-status-danger"
                            : "text-status-warning"
                        }`}
                      >
                        {formatCurrency(invoice.saldoPendiente)}
                      </div>
                      <div className="col-span-2 flex flex-col">
                        <span>
                          {new Date(
                            invoice.fechaVencimiento,
                          ).toLocaleDateString("es-MX")}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-status-danger font-medium">
                            +{daysOverdue}d vencido
                          </span>
                        )}
                      </div>
                      <div className="col-span-1">
                        {isOverdue ? (
                          <AlertCircle className="h-4 w-4 text-status-danger" />
                        ) : (
                          <Clock className="h-4 w-4 text-status-warning" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-emerald-700 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Por Vencer (Corriente)
              </div>
              <p className="text-xl font-bold text-emerald-800 font-mono">
                {formatCurrency(totals.corriente)}
              </p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
                <AlertCircle className="h-4 w-4" />
                Vencido
              </div>
              <p className="text-xl font-bold text-red-800 font-mono">
                {formatCurrency(totals.vencido)}
              </p>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-primary mb-1">
                <DollarSign className="h-4 w-4" />
                Saldo Total
              </div>
              <p className="text-2xl font-bold text-primary font-mono">
                {formatCurrency(totals.total)}
              </p>
            </div>
          </div>

          <Separator className="border-2" />

          {/* Bank Details */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Datos Bancarios para Depósito
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyBankData.cuentas.map((cuenta, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border rounded-lg">
                  <p className="font-semibold text-primary mb-2">
                    {cuenta.banco}
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CLABE:</span>
                      <span className="font-mono font-medium">
                        {cuenta.clabe}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cuenta:</span>
                      <span className="font-mono">{cuenta.cuenta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Titular:</span>
                      <span className="text-xs truncate max-w-[200px]">
                        {cuenta.titular}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-dashed">
            <p>Documento generado el {currentDate}</p>
            <p className="mt-1">
              Transportes Rápidos 3T © 2025 - Sistema de Gestión
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
