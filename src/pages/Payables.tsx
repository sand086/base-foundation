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
  Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { ManageCategoriesModal } from "@/features/suppliers/components/ManageCategoriesModal";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

import {
  RegisterExpenseModal,
  LocalPrefillData,
} from "@/features/payables/components/RegisterExpenseModal";
import { InvoicePayablesDetailSheet } from "@/features/payables/components/InvoicePayablesDetailSheet";
import { PayableInvoice } from "@/features/payables/types";

import { ImportXMLExpenseModal } from "@/features/payables/components/ImportXMLExpenseModal";

import { RegisterPaymentModal } from "@/features/treasury/components/RegisterPaymentModal";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";

import {
  getInvoiceStatusInfo,
  getClasificacionLabel,
  getClasificacionColor,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

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

  // 👇 Aquí está la corrección: Extraemos todo de una sola vez
  const {
    bankAccounts,
    isLoading: isLoadingBankAccounts,
    refresh: refreshBankAccounts,
  } = useBankAccounts();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false);
  const [isManageCatOpen, setIsManageCatOpen] = useState(false);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);

  const [invoiceToDelete, setInvoiceToDelete] = useState<PayableInvoice | null>(
    null,
  );
  const [selectedInvoice, setSelectedInvoice] = useState<PayableInvoice | null>(
    null,
  );
  const [editingInvoice, setEditingInvoice] = useState<PayableInvoice | null>(
    null,
  );
  const [prefillData, setPrefillData] = useState<LocalPrefillData | null>(null);

  useEffect(() => {
    const fromPurchases = searchParams.get("fromPurchases");
    if (fromPurchases === "true") {
      const prefill: LocalPrefillData = {
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

  const handleBulkUploadSuccess = () => {
    setIsXmlModalOpen(false);
    refreshInvoices?.();
  };

  const normalizedInvoices = useMemo(() => {
    const dataArray = Array.isArray(invoices)
      ? invoices
      : (invoices as any).items ||
        (invoices as any).data ||
        (invoices as any).results ||
        [];

    return dataArray.map((inv: any) => ({
      ...inv,
      supplier_razon_social:
        inv.supplier_razon_social ||
        inv.supplier?.razon_social ||
        inv.proveedor ||
        "Desconocido",
      saldo_pendiente: inv.saldo_pendiente || 0,
      monto_total: inv.monto_total || 0,
    })) as PayableInvoice[];
  }, [invoices]);

  const allPayments = useMemo(() => {
    const rows = normalizedInvoices.flatMap((inv) => {
      const supplierName = inv.supplier_razon_social || "";
      const folioFactura =
        inv.folio_interno ||
        inv.id.toString() ||
        (inv.uuid ? inv.uuid.substring(0, 8) : "");
      const payments = inv.payments || [];

      return payments.map((p: any) => ({
        id: p.id,
        proveedor: supplierName,
        folioFactura,
        fecha_pago: p.fecha_pago || "",
        monto: p.monto,
        metodo_pago: p.metodo_pago || "Transferencia",
        complemento_uuid: p.complemento_uuid || null,
        factura_original: inv,
      }));
    });

    return rows.sort((a, b) => {
      const da = parseDateSafe(a.fecha_pago)?.getTime() ?? 0;
      const db = parseDateSafe(b.fecha_pago)?.getTime() ?? 0;
      return db - da;
    });
  }, [normalizedInvoices]);

  const kpis = useMemo(() => {
    const totalVencido = normalizedInvoices
      .filter((inv) => getInvoiceStatusInfo(inv).status === "danger")
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const totalPorPagar = normalizedInvoices
      .filter((inv) => {
        const s = getInvoiceStatusInfo(inv).status;
        return s === "warning" || s === "default";
      })
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const totalParcial = normalizedInvoices
      .filter((inv) => getInvoiceStatusInfo(inv).status === "info")
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const fromPurchasesCount = normalizedInvoices.filter(
      (inv) => !!inv.orden_compra_id,
    ).length;

    return { totalVencido, totalPorPagar, totalParcial, fromPurchasesCount };
  }, [normalizedInvoices]);

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

      // Disparamos la actualización de ambos módulos
      await Promise.all([
        refreshInvoices?.(),
        refreshBankAccounts?.(), // <--- Ya funciona correctamente
      ]);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const payablesColumns: ColumnDef<PayableInvoice>[] = useMemo(
    () => [
      {
        key: "folio_interno",
        header: "Folio / ID",
        render: (_, row) => (
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
            {row.folio_interno || row.id}
          </span>
        ),
      },
      {
        key: "supplier_razon_social",
        header: "Proveedor",
        render: (value) => (
          <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
            {value || "—"}
          </span>
        ),
      },
      {
        key: "clasificacion",
        header: "Clasificación",
        render: (value) => {
          if (!value)
            return <span className="text-[10px] text-muted-foreground">—</span>;
          return (
            <Badge className={getClasificacionColor(value)}>
              {getClasificacionLabel(value)}
            </Badge>
          );
        },
      },
      {
        key: "concepto",
        header: "Concepto",
        render: (value) => (
          <span className="max-w-[200px] truncate text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
            {value}
          </span>
        ),
      },
      {
        key: "fecha_vencimiento",
        header: "Vencimiento",
        type: "date",
        render: (value, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          const isOverdue =
            statusInfo.status === "danger" && (row.saldo_pendiente || 0) > 0;
          return (
            <span
              className={
                isOverdue
                  ? "text-red-600 font-bold"
                  : "text-slate-600 dark:text-slate-300 font-medium text-xs"
              }
            >
              {value || "—"}
            </span>
          );
        },
      },
      {
        key: "monto_total",
        header: "Monto",
        type: "number",
        render: (value) => (
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        key: "saldo_pendiente",
        header: "Saldo",
        type: "number",
        render: (value, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          const isOverdue =
            statusInfo.status === "danger" && (row.saldo_pendiente || 0) > 0;
          return (
            <span
              className={`font-mono text-sm font-black ${
                value === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isOverdue
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {formatMoney(value)}
            </span>
          );
        },
      },
      {
        key: "estatus",
        header: "Estatus",
        type: "status",
        statusOptions: ["pendiente", "pago_parcial", "pagado", "cancelado"],
        render: (_, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          return (
            <StatusBadge status={statusInfo.status}>
              {statusInfo.label}
            </StatusBadge>
          );
        },
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <div className="flex items-center justify-center">
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
                  onClick={() => {
                    setSelectedInvoice(row);
                    setIsDetailSheetOpen(true);
                  }}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Eye className="h-4 w-4 mr-2 text-blue-500" /> Ver Detalle
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditingInvoice(row);
                    setPrefillData(null);
                    setIsExpenseModalOpen(true);
                  }}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Edit className="h-4 w-4 mr-2 text-brand-green" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedInvoice(row);
                    setIsPaymentModalOpen(true);
                  }}
                  disabled={row.saldo_pendiente === 0}
                  className={cn(
                    "gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer",
                    row.saldo_pendiente > 0
                      ? "text-amber-600 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-900/30"
                      : "opacity-50",
                  )}
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Registrar Pago
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => {
                    setInvoiceToDelete(row);
                    setIsDeleteInvoiceOpen(true);
                  }}
                  className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  const paymentsColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID Pago",
        render: (value) => (
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
            {value}
          </span>
        ),
      },
      {
        key: "proveedor",
        header: "Proveedor",
        render: (value) => (
          <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
            {value}
          </span>
        ),
      },
      {
        key: "folioFactura",
        header: "Folio Factura",
        render: (value) => (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {value}
          </span>
        ),
      },
      {
        key: "fecha_pago",
        header: "Fecha Pago",
        type: "date",
        render: (value) => {
          const fecha = parseDateSafe(value);
          return (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {fecha
                ? format(fecha, "dd MMM yyyy", { locale: es }).toUpperCase()
                : "—"}
            </span>
          );
        },
      },
      {
        key: "monto",
        header: "Monto",
        type: "number",
        render: (value) => (
          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        key: "metodo_pago",
        header: "Método",
        render: (value) => <StatusBadge status="info">{value}</StatusBadge>,
      },
      {
        key: "comprobante",
        header: "Comprobante",
        sortable: false,
        render: () => (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-[10px] font-black uppercase tracking-widest haptic-press shadow-sm border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
            onClick={() => toast.info("Descarga de comprobante en desarrollo")}
          >
            <Download className="h-3 w-3" /> REP
          </Button>
        ),
      },
    ],
    [],
  );

  const isLoading = isLoadingInvoices || isLoadingBankAccounts;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter pb-20">
      <PageHeader
        title="Cuentas por Pagar & Gastos"
        description="Gestión centralizada de facturas de proveedores y control de pagos."
        icon={
          <CreditCard className="h-8 w-8 text-brand-navy dark:text-white" />
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="border-indigo-500 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-black tracking-wide shadow-sm haptic-press transition-all"
            onClick={() => setIsXmlModalOpen(true)}
          >
            <FileCode2 className="h-4 w-4 mr-2 text-indigo-600" /> Leer Reporte
            SAT
          </Button>

          <ActionButton
            size="md"
            onClick={() => {
              setEditingInvoice(null);
              setPrefillData(null);
              setIsExpenseModalOpen(true);
            }}
            className="bg-brand-red hover:bg-brand-red/90 text-white shadow-brand-red/20 shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" /> Registrar Gasto
          </ActionButton>
        </div>
      </PageHeader>

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

        <TabsContent
          value="cuentas"
          className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6"
        >
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

          <Card className="shadow-2xl border-none overflow-hidden bg-transparent">
            <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
              <EnhancedDataTable
                data={normalizedInvoices}
                columns={payablesColumns}
                exportFileName="cuentas_por_pagar"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="pagos"
          className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6"
        >
          <Card className="shadow-2xl border-none overflow-hidden bg-transparent">
            <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
              <EnhancedDataTable
                data={allPayments}
                columns={paymentsColumns}
                exportFileName="pagos_emitidos"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportXMLExpenseModal
        open={isXmlModalOpen}
        onOpenChange={setIsXmlModalOpen}
        onSuccess={handleBulkUploadSuccess}
      />

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

      {/*  MODAL ALERTA ESCALERITA CxP */}
      <AlertDialog
        open={isDeleteInvoiceOpen}
        onOpenChange={setIsDeleteInvoiceOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 dark:from-rose-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  ¿Eliminar Factura?
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Acción Irreversible • Cuentas por Pagar
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás intentando eliminar la factura con folio interno{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight font-mono">
                  {invoiceToDelete?.folio_interno || "—"}
                </b>
                .
              </p>

              {/* LÓGICA DE LA ESCALERITA: SI YA TIENE PAGOS, BLOQUEAMOS VISUALMENTE */}
              {invoiceToDelete &&
              (invoiceToDelete.saldo_pendiente || 0) <
                (invoiceToDelete.monto_total || 0) ? (
                <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                      BLOQUEO POR AUDITORÍA (TESORERÍA)
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80 font-bold">
                    Esta factura no se puede eliminar porque ya tiene abonos o
                    pagos registrados en los bancos. <br />
                    <br />
                    Si necesitas corregirla,{" "}
                    <span className="underline">
                      primero debes ir al módulo de Tesorería y anular el pago
                    </span>{" "}
                    para que el dinero regrese a la cuenta.
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                      Pérdida de Datos
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                    Esta acción no se puede deshacer y{" "}
                    <b className="font-black underline">
                      borrará permanentemente el registro
                    </b>
                    .
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setInvoiceToDelete(null)}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>

              {/* SOLO MUESTRA EL BOTÓN DE ELIMINAR SI NO TIENE PAGOS */}
              {(!invoiceToDelete ||
                (invoiceToDelete.saldo_pendiente || 0) ===
                  (invoiceToDelete.monto_total || 0)) && (
                <AlertDialogAction
                  variant="destructive"
                  size="lg"
                  onClick={handleConfirmDeleteInvoice}
                  className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  Sí, eliminar
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
