import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  MoreHorizontal,
  FileText,
  AlertCircle,
  Eye,
  CreditCard,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// 🚀 FSD: Importaciones de Hooks, Componentes y APIs
import { usePayables } from "@/features/payables/hooks/usePayables";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import axiosClient from "@/api/axiosClient";

import { RegisterPaymentModal } from "@/features/treasury/components/RegisterPaymentModal";
import { InvoicePayablesDetailSheet } from "@/features/payables/components/InvoicePayablesDetailSheet";
import { getStatusFromLabel, StatusBadge } from "@/components/ui/status-badge";

export default function Payables() {
  // 🚀 CONEXIÓN REAL AL BACKEND
  const { invoices, isLoading, error, refetch } = usePayables();
  const { accounts: bankAccounts } = useBankAccounts();

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const formatCurrency = (amount: number, moneda: string = "MXN") =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda || "MXN",
    }).format(Math.abs(amount || 0)); // 🚀 FIX: Math.abs para quitar negativos visuales

  // KPIs Dinámicos basados en la BD real
  const kpis = useMemo(() => {
    if (!invoices)
      return { totalPendiente: 0, vencidas: 0, pagadas: 0, total: 0 };

    return {
      totalPendiente: invoices
        .filter((i) => i.estatus !== "pagado")
        .reduce((acc, curr) => acc + (curr.saldo_pendiente || 0), 0),
      vencidas: invoices.filter(
        (i) =>
          new Date(i.fecha_vencimiento) < new Date() && i.estatus !== "pagado",
      ).length,
      pagadas: invoices.filter((i) => i.estatus === "pagado").length,
      total: invoices.length,
    };
  }, [invoices]);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        key: "folio",
        header: "Folio / UUID",
        render: (_, row) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px]">
              {row.folio || row.uuid?.split("-")[0] || "S/F"}
            </span>
            <span
              className="text-[9px] text-slate-400 font-mono tracking-wider truncate max-w-[120px]"
              title={row.uuid}
            >
              {row.uuid?.substring(0, 18)}...
            </span>
          </div>
        ),
      },
      {
        key: "supplier_razon_social",
        header: "Proveedor",
        render: (_, row) => (
          <div className="flex flex-col">
            <span
              className="font-black text-brand-navy dark:text-white uppercase tracking-tight truncate max-w-[200px]"
              title={row.supplier_razon_social}
            >
              {row.supplier_razon_social || "Proveedor General"}
            </span>
            {row.cost_center && (
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                CECO: {row.cost_center.nombre}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "fecha_vencimiento",
        header: "Vencimiento",
        render: (v) => {
          const isVencida = new Date(v as string) < new Date();
          return (
            <span
              className={`text-xs font-bold ${isVencida ? "text-brand-red" : "text-slate-600 dark:text-slate-300"}`}
            >
              {v ? format(new Date(v as string), "dd/MMM/yyyy") : "N/A"}
            </span>
          );
        },
      },
      {
        key: "monto_total",
        header: "Monto Total",
        type: "number",
        render: (v, r) => (
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
            {formatCurrency(v as number, r.moneda)}
          </span>
        ),
      },
      {
        key: "saldo_pendiente",
        header: "Saldo",
        type: "number",
        render: (v, r) => (
          <span
            className={`font-mono text-sm font-bold ${(v as number) > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"}`}
          >
            {formatCurrency(v as number, r.moneda)}
          </span>
        ),
      },
      {
        key: "estatus",
        header: "Estatus",
        render: (v, r) => {
          let estatusCalculado = v as string;
          if (
            estatusCalculado !== "pagado" &&
            new Date(r.fecha_vencimiento) < new Date()
          ) {
            estatusCalculado = "vencido";
          }
          return (
            <StatusBadge status={getStatusFromLabel(estatusCalculado)}>
              {estatusCalculado}
            </StatusBadge>
          );
        },
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
            >
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(row);
                  setIsDetailOpen(true);
                }}
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                Ver Detalles
              </DropdownMenuItem>

              {row.saldo_pendiente > 0 && (
                <>
                  <DropdownMenuSeparator className="dark:bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedInvoice(row);
                      setIsPaymentModalOpen(true);
                    }}
                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800 text-emerald-600"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <PageHeader
          title="CUENTAS POR PAGAR (CxP)"
          description="Control de facturas de proveedores y egresos operativos"
        />
        <Button
          onClick={refetch}
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto font-bold text-[10px] uppercase tracking-widest"
        >
          <RefreshCcw
            className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
          />
          Sincronizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-slate-400 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Total Facturas
            </p>
            <p className="text-3xl font-black">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Saldo por Pagar
            </p>
            <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(kpis.totalPendiente)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-brand-red dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Facturas Vencidas
            </p>
            <p className="text-3xl font-black text-brand-red">
              {kpis.vencidas}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Facturas Pagadas
            </p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {kpis.pagadas}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-transparent">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
            <FileText className="h-5 w-5 text-brand-red" />
            Catálogo de CxP
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-blue" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Cargando Bóveda Financiera...
              </p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center text-brand-red">
              <AlertCircle className="h-8 w-8 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Error al cargar datos
              </p>
            </div>
          ) : (
            <EnhancedDataTable
              data={invoices || []}
              columns={columns}
              exportFileName="Cuentas_Por_Pagar"
              searchPlaceholder="Buscar por proveedor, folio o UUID..."
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL DETALLES DE FACTURA */}
      {selectedInvoice && (
        <InvoicePayablesDetailSheet
          invoice={selectedInvoice}
          open={isDetailOpen}
          onOpenChange={(isOpen) => {
            setIsDetailOpen(isOpen);
            if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
          }}
          onPaymentSuccess={refetch}
        />
      )}

      {/* MODAL REGISTRAR PAGO (TESORERÍA) */}
      {selectedInvoice && (
        <RegisterPaymentModal
          invoice={selectedInvoice}
          open={isPaymentModalOpen}
          onOpenChange={(isOpen) => {
            setIsPaymentModalOpen(isOpen);
            if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
          }}
          bankAccounts={bankAccounts || []}
          onSubmit={async (invoiceId, paymentPayload) => {
            try {
              // Impactamos el Backend (Esto descuenta del banco y actualiza la CxP)
              await axiosClient.post(
                `/api/suppliers/invoices/${invoiceId}/payments`,
                paymentPayload,
              );

              toast.success(
                "Pago registrado con éxito. Se actualizó la Tesorería.",
              );

              // Cerramos el modal de pago y actualizamos la tabla
              setIsPaymentModalOpen(false);
              setTimeout(() => setSelectedInvoice(null), 300);
              refetch();
            } catch (err: any) {
              console.error(err);
              toast.error(
                err.response?.data?.detail || "Error al registrar el pago",
              );
            }
          }}
        />
      )}
    </div>
  );
}
