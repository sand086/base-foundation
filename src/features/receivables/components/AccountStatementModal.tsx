import * as React from "react";
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
import { useState, useMemo, useRef, useEffect } from "react";
import {
  ReceivableInvoice,
  getInvoiceStatusInfo,
  calculateDaysOverdue,
} from "@/features/receivables/types";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

interface AccountStatementModalProps {
  open: boolean;
  onClose: () => void;
  invoices: ReceivableInvoice[];
  initialClient?: string;
  bankAccounts?: any[];
}

const companyBankData = {
  razonSocial: "Rápidos 3T S.A. de C.V.",
  rfc: "RTX110624KP5",
  cuentas: [
    {
      banco: "Banorte",
      clabe: "072180000000000001",
      cuenta: "0000000001",
      titular: "Rápidos 3T S.A. de C.V.",
    },
  ],
};

export function AccountStatementModal({
  open,
  onClose,
  invoices,
  initialClient = "all",
  bankAccounts = [],
}: AccountStatementModalProps) {
  const [selectedClient, setSelectedClient] = useState<string>(initialClient);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const displayBanks = (
    bankAccounts && bankAccounts.length > 0
      ? bankAccounts
      : companyBankData.cuentas
  ).filter((cuenta: any) => {
    const nombreBanco = String(
      cuenta.banco || cuenta.bank_name || cuenta.nombre_banco || "",
    ).toLowerCase();
    return nombreBanco.includes("banorte");
  });

  useEffect(() => {
    if (open) {
      setSelectedClient(initialClient);
    }
  }, [open, initialClient]);

  const clients = useMemo(() => {
    const uniqueClients = [...new Set(invoices.map((inv) => inv.cliente))];
    return uniqueClients.sort();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => inv.saldo_pendiente > 0);
    if (selectedClient !== "all") {
      filtered = filtered.filter((inv) => inv.cliente === selectedClient);
    }
    return filtered.sort(
      (a, b) =>
        new Date(a.fecha_vencimiento).getTime() -
        new Date(b.fecha_vencimiento).getTime(),
    );
  }, [invoices, selectedClient]);

  const totals = useMemo(() => {
    const corriente = filteredInvoices
      .filter((inv) => calculateDaysOverdue(inv.fecha_vencimiento) <= 0)
      .reduce((sum, inv) => sum + inv.saldo_pendiente, 0);

    const vencido = filteredInvoices
      .filter((inv) => calculateDaysOverdue(inv.fecha_vencimiento) > 0)
      .reduce((sum, inv) => sum + inv.saldo_pendiente, 0);

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

  const handleDownload = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);
    toast.info("Generando PDF...", {
      description: "Ajustando el documento para múltiples páginas.",
    });

    const htmlElement = document.documentElement;
    const wasDark = htmlElement.classList.contains("dark");
    if (wasDark) {
      htmlElement.classList.remove("dark");
    }

    const element = pdfRef.current;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    element.style.width = "900px";
    element.style.maxWidth = "900px";

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 900,
      });

      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 15;
      const contentWidth = pdfWidth - margin * 2;
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = contentWidth * canvasRatio;

      const pageHeightContent = pdfHeight - margin * 2;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
      heightLeft -= pageHeightContent;

      while (heightLeft > 1) {
        position -= pageHeightContent;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          position + margin,
          contentWidth,
          imgHeight,
        );
        heightLeft -= pageHeightContent;
      }

      const fileNameClient =
        selectedClient === "all"
          ? "Todos_Los_Clientes"
          : selectedClient.replace(/\s+/g, "_");

      pdf.save(
        `Estado_Cuenta_${fileNameClient}_${format(new Date(), "dd-MM-yyyy")}.pdf`,
      );

      toast.success("Estado de Cuenta generado con éxito");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar el documento PDF");
    } finally {
      if (wasDark) htmlElement.classList.add("dark");
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl print:bg-white print:shadow-none print:w-full print:max-w-none">
        <style media="print">{`
          @page { size: letter; margin: 15mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        `}</style>

        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10 print:hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
              <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-slate-700 dark:text-slate-300 drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Estado de Cuenta
              </DialogTitle>
              <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Resumen de facturas pendientes de cobro
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-6 mt-4 print:p-0 print:overflow-visible">
          <div className="flex items-center gap-4 p-5 border border-border rounded-2xl bg-card shadow-sm print:hidden">
            <div className="flex-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Filtrar por Cliente
              </Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-11 shadow-sm font-bold">
                  <SelectValue placeholder="Todos los clientes" />
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
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Fecha de Corte
              </p>
              <p className="font-bold text-foreground">{currentDate}</p>
            </div>
          </div>

          <div
            id="print-area"
            ref={pdfRef}
            className="p-5 border-2 border-dashed border-border rounded-2xl bg-card shadow-sm space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex justify-between items-start border-b border-border pb-4 break-inside-avoid">
              <div>
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500 dark:text-white/70" />
                  {companyBankData.razonSocial}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">
                  RFC: {companyBankData.rfc}
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground font-black text-[10px] print:border print:border-black print:text-black print:bg-white">
                ESTADO DE CUENTA
              </Badge>
            </div>

            {selectedClient !== "all" && (
              <div className="p-3 bg-muted/30 rounded-lg break-inside-avoid">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Cliente
                </p>
                <p className="font-black text-sm sm:text-base text-foreground break-words leading-tight mt-1">
                  {selectedClient}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2 text-[10px] break-inside-avoid">
                <DollarSign className="h-4 w-4" /> Facturas Pendientes
              </h3>

              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground break-inside-avoid">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>No hay facturas pendientes de cobro</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest py-2 border-b border-border min-w-[600px] break-inside-avoid">
                    <div className="col-span-2">Folio</div>
                    <div className="col-span-3">Cliente</div>
                    <div className="col-span-2 text-right">Monto</div>
                    <div className="col-span-2 text-right">Saldo</div>
                    <div className="col-span-2">Vencimiento</div>
                    <div className="col-span-1">Estado</div>
                  </div>

                  {filteredInvoices.map((invoice) => {
                    const statusInfo = getInvoiceStatusInfo(invoice);
                    const daysOverdue = calculateDaysOverdue(
                      invoice.fecha_vencimiento,
                    );
                    const isOverdue = daysOverdue > 0;

                    return (
                      <div
                        key={invoice.id}
                        className={`grid grid-cols-12 gap-2 text-sm py-2 border-b border-border/50 min-w-[600px] break-inside-avoid ${
                          isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <div className="col-span-2 font-mono font-bold text-foreground flex items-center">
                          {invoice.folio_interno}
                        </div>
                        <div className="col-span-3 text-[10px] sm:text-[11px] text-foreground font-bold leading-tight flex items-center pr-2 break-words">
                          {invoice.cliente}
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold text-foreground flex items-center justify-end">
                          {formatCurrency(invoice.monto_total)}
                        </div>
                        <div
                          className={`col-span-2 text-right font-mono font-black flex items-center justify-end ${
                            isOverdue
                              ? "text-destructive"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {formatCurrency(invoice.saldo_pendiente)}
                        </div>
                        <div className="col-span-2 flex flex-col justify-center text-foreground font-bold">
                          <span>
                            {new Date(
                              invoice.fecha_vencimiento,
                            ).toLocaleDateString("es-MX")}
                          </span>
                          {isOverdue && (
                            <span className="text-destructive font-bold text-[10px]">
                              +{daysOverdue}d vencido
                            </span>
                          )}
                        </div>
                        <div className="col-span-1 flex items-center">
                          {isOverdue ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 break-inside-avoid">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 mb-1 font-black">
                  <CheckCircle2 className="h-4 w-4" />
                  Por Vencer
                </div>
                <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 font-mono">
                  {formatCurrency(totals.corriente)}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 mb-1 font-black">
                  <AlertCircle className="h-4 w-4" />
                  Vencido
                </div>
                <p className="text-xl font-black text-red-800 dark:text-red-300 font-mono">
                  {formatCurrency(totals.vencido)}
                </p>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-primary mb-1 font-black">
                  <DollarSign className="h-4 w-4" />
                  Saldo Total
                </div>
                <p className="text-2xl font-black text-primary font-mono">
                  {formatCurrency(totals.total)}
                </p>
              </div>
            </div>

            <Separator className="bg-border break-inside-avoid" />

            <div className="break-inside-avoid">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Datos Bancarios para Depósito
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayBanks.map((cuenta: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-muted/50 border border-border rounded-lg break-inside-avoid"
                  >
                    <p className="font-black text-primary mb-3">
                      {cuenta.banco || cuenta.bank_name || cuenta.nombre_banco}
                    </p>
                    {/* AQUI SE REMOVIERON LOS TRUNCATES Y SE AGREGÓ WRAPPING SEGURO */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground shrink-0">
                          CLABE:
                        </span>
                        <span className="font-mono font-bold text-foreground text-right break-words">
                          {cuenta.clabe}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground shrink-0">
                          Cuenta:
                        </span>
                        <span className="font-mono font-bold text-foreground text-right break-words">
                          {cuenta.cuenta ||
                            cuenta.account_number ||
                            cuenta.numero_cuenta}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground shrink-0">
                          Titular:
                        </span>
                        <span className="text-[11px] font-bold text-foreground text-right break-words">
                          {cuenta.titular ||
                            cuenta.account_name ||
                            cuenta.nombre_titular ||
                            companyBankData.razonSocial}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-[10px] text-muted-foreground pt-4 border-t border-dashed border-border break-inside-avoid">
              <p>Documento generado el {currentDate}</p>
              <p className="mt-1 font-black uppercase tracking-widest">
                Rápidos 3T © {new Date().getFullYear()} - Sistema de Gestión
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10 print:hidden">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              variant="outline"
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px] gap-2"
              onClick={handlePrint}
              disabled={isGeneratingPDF}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px] gap-2"
              onClick={handleDownload}
              disabled={isGeneratingPDF}
            >
              <Download className="h-4 w-4" />
              {isGeneratingPDF ? "Generando..." : "Descargar PDF"}
            </Button>
            <Button
              onClick={onClose}
              disabled={isGeneratingPDF}
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
