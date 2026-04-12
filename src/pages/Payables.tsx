import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Download,
  FileText,
  AlertCircle,
  Eye,
  Edit,
  CreditCard,
  MoreHorizontal,
  Package,
  Trash2,
  Receipt,
  FileCode2,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { ManageCategoriesModal } from "@/features/suppliers/components/ManageCategoriesModal";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

import { RegisterExpenseModal } from "@/features/payables/components/RegisterExpenseModal";
import { InvoicePayablesDetailSheet } from "@/features/payables/components/InvoicePayablesDetailSheet";
import { PayableInvoice } from "@/features/payables/types";

import { RegisterPaymentModal } from "@/features/treasury/components/RegisterPaymentModal";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";

import {
  getInvoiceStatusInfo,
  getClasificacionLabel,
  getClasificacionColor,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PrefillData {
  proveedor: string;
  proveedorId: string;
  concepto: string;
  montoTotal: number;
  ordenCompraId: string;
  ordenCompraFolio: string;
}

const safeLower = (v: unknown) =>
  typeof v === "string" ? v.toLowerCase() : "";
const isValidDate = (d: Date) => !Number.isNaN(d.getTime());
const parseDateSafe = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return isValidDate(d) ? d : null;
};

export default function Payables() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { valueAsNumber: defaultIva } = useSystemConfig("iva_porcentaje");
  const { valueAsNumber: defaultRetencion } = useSystemConfig(
    "retencion_porcentaje",
  );
  const { value: defaultMoneda } = useSystemConfig("moneda_base");

  const {
    suppliers,
    invoices,
    isLoadingInvoices,
    refreshInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    registerPayment,
    updateIndirectCategory,
    deleteIndirectCategory,
    indirectCategories,
  } = useSuppliers();

  const { bankAccounts, isLoading: isLoadingBankAccounts } = useBankAccounts();

  const [searchCxP, setSearchCxP] = useState("");
  const [searchPagos, setSearchPagos] = useState("");

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false);
  const [isManageCatOpen, setIsManageCatOpen] = useState(false);

  const [invoiceToDelete, setInvoiceToDelete] = useState<PayableInvoice | null>(
    null,
  );
  const [selectedInvoice, setSelectedInvoice] = useState<PayableInvoice | null>(
    null,
  );
  const [editingInvoice, setEditingInvoice] = useState<PayableInvoice | null>(
    null,
  );
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  useEffect(() => {
    const fromPurchases = searchParams.get("fromPurchases");
    if (fromPurchases === "true") {
      const prefill: PrefillData = {
        proveedor: searchParams.get("proveedor") || "",
        proveedorId: searchParams.get("proveedorId") || "",
        concepto: searchParams.get("concepto") || "",
        montoTotal: parseFloat(searchParams.get("monto") || "0"),
        ordenCompraId: searchParams.get("ordenId") || "",
        ordenCompraFolio: searchParams.get("ordenFolio") || "",
      };

      setPrefillData(prefill);
      setEditingInvoice(null);
      setIsExpenseModalOpen(true);

      setSearchParams({});
      toast.info("Datos pre-llenados desde Orden de Compra", {
        description: `${prefill.ordenCompraFolio} - ${prefill.proveedor}`,
      });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleOpen = () => setIsManageCatOpen(true);
    document.addEventListener("open-manage-categories", handleOpen);
    return () =>
      document.removeEventListener("open-manage-categories", handleOpen);
  }, []);

  const kpis = useMemo(() => {
    const totalVencido = invoices
      .filter((inv) => getInvoiceStatusInfo(inv).status === "danger")
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const totalPorPagar = invoices
      .filter((inv) => {
        const s = getInvoiceStatusInfo(inv).status;
        return s === "warning" || s === "default";
      })
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const totalParcial = invoices
      .filter((inv) => getInvoiceStatusInfo(inv).status === "info")
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const fromPurchasesCount = invoices.filter(
      (inv) => !!inv.orden_compra_id,
    ).length;

    return { totalVencido, totalPorPagar, totalParcial, fromPurchasesCount };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = safeLower(searchCxP);
    return invoices.filter((inv) => {
      const proveedor = safeLower(inv.supplier_razon_social || "");
      const uuid = safeLower(inv.uuid || "");
      const concepto = safeLower(inv.concepto || "");
      return proveedor.includes(q) || uuid.includes(q) || concepto.includes(q);
    });
  }, [invoices, searchCxP]);

  const allPayments = useMemo(() => {
    const rows = invoices.flatMap((inv) => {
      const supplierName = inv.supplier_razon_social || "";
      const folioFactura =
        inv.folio_interno ||
        inv.id.toString() ||
        (inv.uuid ? inv.uuid.substring(0, 8) : "");
      const payments = inv.payments || [];

      return payments.map((p) => ({
        id: p.id,
        proveedor: supplierName,
        folioFactura,
        fecha_pago: p.fecha_pago || "",
        monto: p.monto,
        metodo_pago: p.metodo_pago || "Transferencia",
        complemento_uuid: p.complemento_uuid || null,
      }));
    });

    const filtered = rows.filter(
      (r) =>
        safeLower(r.proveedor).includes(safeLower(searchPagos)) ||
        safeLower(r.folioFactura).includes(safeLower(searchPagos)),
    );

    return filtered.sort((a, b) => {
      const da = parseDateSafe(a.fecha_pago)?.getTime() ?? 0;
      const db = parseDateSafe(b.fecha_pago)?.getTime() ?? 0;
      return db - da;
    });
  }, [invoices, searchPagos]);

  const handleCreateInvoice = async (invoiceData: Partial<PayableInvoice>) => {
    const payloadConDefaults = {
      ...invoiceData,
      moneda: invoiceData.moneda || defaultMoneda || "MXN",
      iva:
        invoiceData.iva !== undefined
          ? invoiceData.iva
          : (invoiceData.subtotal || 0) * (defaultIva / 100),
      retenciones:
        invoiceData.retenciones !== undefined
          ? invoiceData.retenciones
          : (invoiceData.subtotal || 0) * (defaultRetencion / 100),
    };

    const ok = await createInvoice(payloadConDefaults);
    if (ok) {
      setIsExpenseModalOpen(false);
      setPrefillData(null);
      await refreshInvoices?.();
    }
  };

  const handleUpdateInvoice = async (invoiceData: Partial<PayableInvoice>) => {
    if (!editingInvoice) return;
    const ok = await updateInvoice(editingInvoice.id, invoiceData);
    if (ok) {
      setEditingInvoice(null);
      setIsExpenseModalOpen(false);
      await refreshInvoices?.();
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const ok = await deleteInvoice(invoiceToDelete.id);
    if (ok) {
      setIsDeleteInvoiceOpen(false);
      setInvoiceToDelete(null);
      await refreshInvoices?.();
    }
  };

  const handleRegisterPayment = async (invoiceId: number, paymentData: any) => {
    const ok = await registerPayment(invoiceId, paymentData);
    if (ok) {
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      await refreshInvoices?.();
    }
  };

  const handleViewInvoice = (invoice: PayableInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailSheetOpen(true);
  };

  const handleEditInvoice = (invoice: PayableInvoice) => {
    setEditingInvoice(invoice);
    setPrefillData(null);
    setIsExpenseModalOpen(true);
  };

  const handlePayInvoice = (invoice: PayableInvoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const isLoading = isLoadingInvoices || isLoadingBankAccounts;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter pb-20">
      <PageHeader
        title="Cuentas por Pagar & Gastos"
        description="Gestión centralizada de facturas de proveedores y control de pagos."
        icon={
          <CreditCard className="h-8 w-8 text-brand-navy dark:text-white" />
        }
      />

      <Tabs defaultValue="cuentas" className="w-full space-y-6">
        <div className="w-full overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
          <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md p-1 h-14 rounded-xl border border-slate-200/50 dark:border-white/10 inline-flex min-w-max sm:w-auto">
            <TabsTrigger
              value="cuentas"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Cuentas por Pagar
            </TabsTrigger>

            <TabsTrigger
              value="pagos"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Pagos Emitidos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: CUENTAS POR PAGAR */}
        <TabsContent
          value="cuentas"
          className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6"
        >
          {/* KPI CARDS (Tahoe UI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              className={cn(
                "p-6 flex items-center gap-5 group transition-all cursor-default relative overflow-hidden",
                "hover:border-rose-300 dark:hover:border-rose-500/50",
              )}
            >
              <div className="p-3.5 rounded-2xl border shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out relative z-10 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-center relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Total Vencido
                </p>
                <p className="text-2xl font-black leading-none tracking-tighter text-rose-600 dark:text-rose-400">
                  ${kpis.totalVencido.toLocaleString("es-MX")}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-5 group transition-all cursor-default hover:border-amber-300 dark:hover:border-amber-500/50 relative overflow-hidden">
              <div className="p-3.5 rounded-2xl border shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out relative z-10 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-center relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Por Pagar (Vigente)
                </p>
                <p className="text-2xl font-black leading-none tracking-tighter text-amber-600 dark:text-amber-400">
                  ${kpis.totalPorPagar.toLocaleString("es-MX")}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-5 group transition-all cursor-default hover:border-blue-300 dark:hover:border-blue-500/50 relative overflow-hidden">
              <div className="p-3.5 rounded-2xl border shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out relative z-10 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-center relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Pagos Parciales
                </p>
                <p className="text-2xl font-black leading-none tracking-tighter text-blue-600 dark:text-blue-400">
                  ${kpis.totalParcial.toLocaleString("es-MX")}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-5 group hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-default">
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                <Package className="h-6 w-6 text-brand-navy dark:text-slate-300" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Desde Purchases
                </p>
                <p className="text-3xl font-black text-brand-navy dark:text-white leading-none tracking-tighter">
                  {kpis.fromPurchasesCount}
                </p>
              </div>
            </Card>
          </div>

          {/* TABLA PRINCIPAL (Liquid Glass Tahoe) */}
          <Card className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-5 px-6 gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por proveedor, UUID o concepto..."
                  value={searchCxP}
                  onChange={(e) => setSearchCxP(e.target.value)}
                  className="pl-10 h-10 bg-white/50 dark:bg-black/20 border-slate-200 dark:border-white/10"
                />
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setEditingInvoice(null);
                  setPrefillData(null);
                  setIsExpenseModalOpen(true);
                }}
                className="w-full sm:w-auto haptic-press shadow-md shadow-brand-red/20 bg-brand-red hover:bg-brand-red/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Gasto / Factura
              </Button>
            </CardHeader>

            <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
              {isLoading ? (
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 p-8 text-center animate-pulse">
                  Cargando facturas...
                </div>
              ) : (
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                      <DataTableHead>ID</DataTableHead>
                      <DataTableHead>Proveedor</DataTableHead>
                      <DataTableHead>Clas.</DataTableHead>
                      <DataTableHead>Concepto</DataTableHead>
                      <DataTableHead>Vencimiento</DataTableHead>
                      <DataTableHead className="text-right">
                        Monto
                      </DataTableHead>
                      <DataTableHead className="text-right">
                        Saldo
                      </DataTableHead>
                      <DataTableHead>Estatus</DataTableHead>
                      <DataTableHead className="text-center">
                        Acciones
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {filteredInvoices.map((invoice) => {
                      const statusInfo = getInvoiceStatusInfo(invoice);
                      const saldo = invoice.saldo_pendiente || 0;
                      const monto = invoice.monto_total || 0;
                      const venc = invoice.fecha_vencimiento || "";
                      const isOverdue =
                        statusInfo.status === "danger" && saldo > 0;
                      const clasificacion = invoice.clasificacion || "";

                      return (
                        <DataTableRow
                          key={String(invoice.id)}
                          className={cn(
                            "border-b border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors",
                            isOverdue && "bg-red-50/30 dark:bg-red-950/20",
                          )}
                        >
                          <DataTableCell className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                            {invoice.folio_interno || invoice.id}
                          </DataTableCell>
                          <DataTableCell className="font-bold text-slate-800 dark:text-slate-200">
                            {invoice.supplier_razon_social || "—"}
                          </DataTableCell>
                          <DataTableCell>
                            {clasificacion ? (
                              <Badge
                                className={getClasificacionColor(clasificacion)}
                              >
                                {getClasificacionLabel(clasificacion)}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </DataTableCell>
                          <DataTableCell className="max-w-[150px] truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                            {invoice.concepto}
                          </DataTableCell>
                          <DataTableCell
                            className={
                              isOverdue
                                ? "text-red-600 font-bold"
                                : "text-slate-600 dark:text-slate-300 font-medium text-xs"
                            }
                          >
                            {venc}
                          </DataTableCell>
                          <DataTableCell className="text-right font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                            ${monto.toLocaleString("es-MX")}
                          </DataTableCell>
                          <DataTableCell
                            className={`text-right font-mono text-sm font-black ${
                              saldo === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isOverdue
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            ${saldo.toLocaleString("es-MX")}
                          </DataTableCell>
                          <DataTableCell>
                            <StatusBadge status={statusInfo.status}>
                              {statusInfo.label}
                            </StatusBadge>
                          </DataTableCell>
                          <DataTableCell>
                            <div className="flex items-center justify-center pr-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                                  >
                                    <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleViewInvoice(invoice)}
                                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                                  >
                                    <Eye className="h-4 w-4 mr-2 text-blue-500" />{" "}
                                    Ver Detalle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEditInvoice(invoice)}
                                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                                  >
                                    <Edit className="h-4 w-4 mr-2 text-brand-green" />{" "}
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="dark:bg-white/10" />
                                  <DropdownMenuItem
                                    onClick={() => handlePayInvoice(invoice)}
                                    disabled={saldo === 0}
                                    className={cn(
                                      "gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer",
                                      saldo > 0
                                        ? "text-amber-600 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-900/30"
                                        : "opacity-50",
                                    )}
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />{" "}
                                    Registrar Pago
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="dark:bg-white/10" />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setInvoiceToDelete(invoice);
                                      setIsDeleteInvoiceOpen(true);
                                    }}
                                    className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PAGOS Y COMPLEMENTOS */}
        <TabsContent
          value="pagos"
          className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6"
        >
          <Card className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-5 px-6 gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por proveedor o folio..."
                  value={searchPagos}
                  onChange={(e) => setSearchPagos(e.target.value)}
                  className="pl-10 h-10 bg-white/50 dark:bg-black/20 border-slate-200 dark:border-white/10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto haptic-press shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
              >
                <FileCode2 className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                Leer REP / Constancia
              </Button>
            </CardHeader>
            <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
              {isLoading ? (
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 p-8 text-center animate-pulse">
                  Cargando pagos...
                </div>
              ) : (
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                      <DataTableHead>ID Pago</DataTableHead>
                      <DataTableHead>Proveedor</DataTableHead>
                      <DataTableHead>Folio Factura</DataTableHead>
                      <DataTableHead>Fecha Pago</DataTableHead>
                      <DataTableHead className="text-right">
                        Monto
                      </DataTableHead>
                      <DataTableHead>Método</DataTableHead>
                      <DataTableHead>Comprobante</DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {allPayments.map((p) => {
                      const fecha = parseDateSafe(p.fecha_pago);
                      return (
                        <DataTableRow
                          key={String(p.id)}
                          className="border-b border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <DataTableCell className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                            {p.id}
                          </DataTableCell>
                          <DataTableCell className="font-bold text-brand-navy dark:text-white">
                            {p.proveedor}
                          </DataTableCell>
                          <DataTableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {p.folioFactura}
                          </DataTableCell>
                          <DataTableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {fecha
                              ? format(fecha, "dd MMM yyyy", {
                                  locale: es,
                                }).toUpperCase()
                              : "—"}
                          </DataTableCell>
                          <DataTableCell className="text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ${Number(p.monto || 0).toLocaleString("es-MX")}
                          </DataTableCell>
                          <DataTableCell>
                            <StatusBadge status="info">
                              {p.metodo_pago}
                            </StatusBadge>
                          </DataTableCell>
                          <DataTableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 h-8 text-[10px] font-black uppercase tracking-widest haptic-press shadow-sm border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                              onClick={() =>
                                toast.info(
                                  "Descarga de comprobante en desarrollo",
                                )
                              }
                            >
                              <Download className="h-3 w-3" /> REP
                            </Button>
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALES */}
      <RegisterExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={(open) => {
          setIsExpenseModalOpen(open);
          if (!open) {
            setEditingInvoice(null);
            setPrefillData(null);
          }
        }}
        onSubmit={editingInvoice ? handleUpdateInvoice : handleCreateInvoice}
        suppliers={suppliers}
        editInvoice={editingInvoice}
        prefillData={prefillData}
      />

      {selectedInvoice && (
        <InvoicePayablesDetailSheet
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
          invoice={selectedInvoice}
        />
      )}

      {selectedInvoice && (
        <RegisterPaymentModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          invoice={selectedInvoice}
          bankAccounts={bankAccounts || []}
          onSubmit={handleRegisterPayment}
        />
      )}

      <ManageCategoriesModal
        open={isManageCatOpen}
        onOpenChange={setIsManageCatOpen}
        categories={indirectCategories}
        onUpdate={updateIndirectCategory}
        onDelete={deleteIndirectCategory}
      />

      <AlertDialog
        open={isDeleteInvoiceOpen}
        onOpenChange={setIsDeleteInvoiceOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-md flex-col overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 border border-rose-200 dark:border-rose-500/20">
                <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  ¿Eliminar Factura?
                </AlertDialogTitle>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              Se eliminará la factura con folio interno{" "}
              <strong>{invoiceToDelete?.folio_interno || "—"}</strong>. Esta
              acción no se puede deshacer y borrará los pagos asociados.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex w-full gap-3 justify-end">
              <AlertDialogCancel
                onClick={() => setInvoiceToDelete(null)}
                className="haptic-press font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteInvoice}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] haptic-press shadow-rose-600/20"
              >
                Sí, eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
