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
  Clock,
  FileCode2,
  Loader2,
  Briefcase,
  FilterX,
  Check,
  Filter,
  Calendar,
  ChevronsUpDown,
  CheckSquare,
  Ban,
  RefreshCcw,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge, getStatusFromLabel } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// NUEVOS COMPONENTES IMPORTADOS PARA EL BUSCADOR Y CHECKBOX
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

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

import { getInvoiceStatusInfo } from "@/lib/utils";
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

  // ESTADOS PARA CANCELAR Y REABRIR
  const [isCancelInvoiceOpen, setIsCancelInvoiceOpen] = useState(false);
  const [isReopenInvoiceOpen, setIsReopenInvoiceOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<PayableInvoice | null>(
    null,
  );
  const [invoiceToReopen, setInvoiceToReopen] = useState<PayableInvoice | null>(
    null,
  );

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

  // ==========================================
  // ESTADOS PARA LOS FILTROS Y SELECCIÓN
  // ==========================================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cecoFilter, setCecoFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [openSupplierCombo, setOpenSupplierCombo] = useState(false);

  //  NUEVO: FILTROS DE RANGO DE FECHAS
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // ESTADO PARA CHECKBOXES
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);

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
      : (invoices as any)?.items ||
        (invoices as any)?.data ||
        (invoices as any)?.results ||
        [];

    return dataArray.map((inv: any) => ({
      ...inv,
      supplier_razon_social:
        inv.supplier_razon_social ||
        inv.supplier?.razon_social ||
        inv.proveedor ||
        "Desconocido",
      supplier_id: inv.supplier_id || inv.supplier?.id || null,
      saldo_pendiente: inv.saldo_pendiente || 0,
      monto_total: inv.monto_total || 0,
    })) as PayableInvoice[];
  }, [invoices]);

  // ==========================================
  // LÓGICA DE FILTRADO Y EXTRACCIÓN DE CECOS
  // ==========================================
  const uniqueCecos = useMemo(() => {
    const cecosMap = new Map();
    normalizedInvoices.forEach((inv: any) => {
      if (inv.cost_center) {
        cecosMap.set(inv.cost_center.id, inv.cost_center.nombre);
      }
    });
    return Array.from(cecosMap.entries()).map(([id, nombre]) => ({
      id: String(id),
      nombre,
    }));
  }, [normalizedInvoices]);

  //  SE ACTUALIZÓ PARA INCLUIR EL RANGO DE FECHAS
  const filteredInvoices = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const en5Dias = new Date(hoy);
    en5Dias.setDate(hoy.getDate() + 5);

    return normalizedInvoices.filter((inv: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        inv.folio_interno?.toLowerCase().includes(searchLower) ||
        inv.supplier_razon_social?.toLowerCase().includes(searchLower) ||
        inv.uuid?.toLowerCase().includes(searchLower) ||
        inv.concepto?.toLowerCase().includes(searchLower);

      let matchesStatus = false;
      const isActiva = inv.estatus !== "pagado" && inv.estatus !== "cancelado";
      const fechaVencimiento = new Date(inv.fecha_vencimiento);
      fechaVencimiento.setHours(0, 0, 0, 0);

      if (statusFilter === "all") {
        matchesStatus = true;
      } else if (statusFilter === "vencido") {
        matchesStatus = isActiva && fechaVencimiento < hoy;
      } else if (statusFilter === "por_vencer") {
        matchesStatus =
          isActiva && fechaVencimiento >= hoy && fechaVencimiento <= en5Dias;
      } else {
        matchesStatus =
          inv.estatus?.toLowerCase() === statusFilter.toLowerCase();
      }

      const matchesCeco =
        cecoFilter === "all" || String(inv.cost_center_id) === cecoFilter;

      const matchesSupplier =
        supplierFilter === "all" || String(inv.supplier_id) === supplierFilter;

      //  NUEVO: Lógica de Filtro por Rango de Fechas (Basado en Emisión o Vencimiento, según necesites, aquí es por Emisión)
      let matchesDate = true;
      if (startDate || endDate) {
        if (!inv.fecha_vencimiento) {
          // Si estamos filtrando por fecha y la factura no tiene fecha de vencimiento, la ocultamos
          matchesDate = false;
        } else {
          const vencimiento = inv.fecha_vencimiento.includes("T")
            ? inv.fecha_vencimiento.split("T")[0]
            : inv.fecha_vencimiento;

          if (startDate && vencimiento < startDate) matchesDate = false;
          if (endDate && vencimiento > endDate) matchesDate = false;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCeco &&
        matchesSupplier &&
        matchesDate
      );
    });
  }, [
    normalizedInvoices,
    searchTerm,
    statusFilter,
    cecoFilter,
    supplierFilter,
    startDate,
    endDate,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCecoFilter("all");
    setSupplierFilter("all");
    setStartDate("");
    setEndDate("");
    setSelectedInvoiceIds([]);
  };

  const allPayments = useMemo(() => {
    const rows = filteredInvoices.flatMap((inv: any) => {
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
  }, [filteredInvoices]);

  // ==========================================
  // KPIs DINÁMICOS Y CÁLCULO DE CHECKBOXES
  // ==========================================
  const kpis = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const en7Dias = new Date(hoy);
    en7Dias.setDate(hoy.getDate() + 7);

    const totalVencido = filteredInvoices
      .filter((inv) => {
        const fechaVencimiento = new Date(inv.fecha_vencimiento);
        return (
          fechaVencimiento < hoy &&
          inv.estatus !== "pagado" &&
          inv.estatus !== "cancelado"
        );
      })
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const totalPorPagar = filteredInvoices
      .filter((inv) => inv.estatus !== "pagado" && inv.estatus !== "cancelado")
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const totalParcial = filteredInvoices
      .filter((inv) => inv.estatus === "pago_parcial")
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    const compromisos7Dias = filteredInvoices
      .filter((inv) => {
        if (
          inv.estatus === "pagado" ||
          inv.estatus === "cancelado" ||
          inv.tipo_comprobante === "E" ||
          (inv.saldo_pendiente || 0) < 0
        )
          return false;
        const fechaVencimiento = new Date(inv.fecha_vencimiento);
        return fechaVencimiento >= hoy && fechaVencimiento <= en7Dias;
      })
      .reduce((sum, inv) => sum + (inv.saldo_pendiente || 0), 0);

    return { totalVencido, totalPorPagar, totalParcial, compromisos7Dias };
  }, [filteredInvoices]);

  const selectedTotalAmount = useMemo(() => {
    const selectedInvoicesData = filteredInvoices.filter((inv) =>
      selectedInvoiceIds.includes(inv.id),
    );
    return selectedInvoicesData.reduce(
      (sum, inv) => sum + (inv.saldo_pendiente || 0),
      0,
    );
  }, [filteredInvoices, selectedInvoiceIds]);

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

  const handleConfirmCancelInvoice = async () => {
    if (!invoiceToCancel) return;
    const ok = await updateInvoice(invoiceToCancel.id, {
      estatus: "cancelado",
    });
    if (ok) {
      setIsCancelInvoiceOpen(false);
      setInvoiceToCancel(null);
      toast.success("Factura cancelada correctamente.");
      await refreshInvoices?.();
    }
  };

  const handleConfirmReopenInvoice = async () => {
    if (!invoiceToReopen) return;
    const ok = await updateInvoice(invoiceToReopen.id, {
      estatus: "pendiente",
    });
    if (ok) {
      setIsReopenInvoiceOpen(false);
      setInvoiceToReopen(null);
      toast.success("Factura reabierta exitosamente.");
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
      setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoiceId));
      await Promise.all([refreshInvoices?.(), refreshBankAccounts?.()]);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // ==========================================
  // COLUMNAS (AÑADIDA COLUMNA DE SELECCIÓN)
  // ==========================================
  const payablesColumns: ColumnDef<PayableInvoice>[] = useMemo(
    () => [
      {
        key: "select",
        header: "Sel.",
        sortable: false,
        render: (_, row) => {
          const isDisabled =
            row.estatus === "pagado" || row.estatus === "cancelado";
          return (
            <div className="flex justify-center items-center h-full">
              <Checkbox
                checked={selectedInvoiceIds.includes(row.id)}
                disabled={isDisabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedInvoiceIds((prev) => [...prev, row.id]);
                  } else {
                    setSelectedInvoiceIds((prev) =>
                      prev.filter((id) => id !== row.id),
                    );
                  }
                }}
                aria-label={`Seleccionar factura ${row.folio_interno || row.id}`}
                className={cn(isDisabled && "opacity-50")}
              />
            </div>
          );
        },
      },
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
          <span
            className="font-black text-brand-navy dark:text-white uppercase tracking-tight block max-w-[200px] truncate"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        key: "cost_center",
        header: "Centro de Costos",
        render: (_, row) =>
          row.cost_center ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 uppercase tracking-widest whitespace-nowrap">
              <Briefcase className="h-3 w-3" />
              {row.cost_center.codigo || row.cost_center.nombre}
            </span>
          ) : (
            <span className="text-[10px] font-medium italic text-slate-400 uppercase tracking-widest">
              Sin Asignar
            </span>
          ),
      },
      {
        key: "concepto",
        header: "Concepto",
        render: (value) => (
          <span
            className="max-w-[200px] truncate text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block"
            title={value}
          >
            {value}
          </span>
        ),
      },
      {
        key: "fecha_vencimiento",
        header: "Vencimiento / Crédito",
        type: "date",
        render: (value, row) => {
          const isVencida =
            new Date(value as string) < new Date() &&
            row.estatus !== "pagado" &&
            row.estatus !== "cancelado";
          const diasCredito =
            row.supplier?.dias_credito || (row as any).dias_credito || 0;

          return (
            <div className="flex flex-col">
              <span
                className={`text-xs font-black ${isVencida ? "text-brand-red dark:text-red-500" : "text-slate-600 dark:text-slate-300"}`}
              >
                {value ? format(new Date(value as string), "dd/MMM/yyyy") : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-bold">
                {diasCredito > 0 ? `${diasCredito} Días` : "Contado"}
              </span>
            </div>
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
          const isNotaCredito =
            row.tipo_comprobante === "E" || (value as number) < 0;
          return (
            <span
              className={`font-mono text-sm font-black ${
                isNotaCredito
                  ? "text-blue-600 dark:text-blue-500"
                  : (value as number) > 0
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-emerald-600 dark:text-emerald-500"
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
        render: (v) => {
          const estatusReal = String(v).toLowerCase();
          return (
            <StatusBadge status={getStatusFromLabel(estatusReal)}>
              {estatusReal.replace("_", " ")}
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
                  disabled={
                    row.estatus === "cancelado" || row.estatus === "pagado"
                  }
                  className={cn(
                    "gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer",
                    row.estatus !== "cancelado" && row.estatus !== "pagado"
                      ? "text-amber-600 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-900/30"
                      : "opacity-50",
                  )}
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Registrar Pago
                </DropdownMenuItem>

                {row.estatus !== "pagado" && row.estatus !== "cancelado" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setInvoiceToCancel(row);
                      setIsCancelInvoiceOpen(true);
                    }}
                    className="gap-2 font-bold text-xs uppercase tracking-tight text-orange-600 cursor-pointer dark:focus:bg-orange-950/30"
                  >
                    <Ban className="h-4 w-4 mr-2" /> Cancelar Factura
                  </DropdownMenuItem>
                )}

                {row.estatus === "cancelado" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setInvoiceToReopen(row);
                      setIsReopenInvoiceOpen(true);
                    }}
                    className="gap-2 font-bold text-xs uppercase tracking-tight text-emerald-600 cursor-pointer dark:focus:bg-emerald-950/30"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" /> Reabrir Factura
                  </DropdownMenuItem>
                )}

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
    [selectedInvoiceIds],
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
        description="Gestión centralizada de facturas, control de pagos y filtros operativos."
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

      {/* ==========================================
          BARRA DE FILTROS SUPERIOR
          ========================================== */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm flex flex-col gap-5 relative z-10 transition-all">
        {/* ENCABEZADO DE FILTROS Y BOTÓN LIMPIAR */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Filter className="h-4 w-4 text-brand-blue" />
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Filtros de Búsqueda
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-400 flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors rounded-lg"
          >
            <FilterX className="h-3 w-3" /> Limpiar todo
          </Button>
        </div>

        {/* GRID DE FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* BÚSQUEDA GENERAL */}
          <div className="relative group col-span-1 md:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
            <Input
              placeholder="Buscar folio, UUID o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 focus-visible:ring-brand-blue/30 focus-visible:bg-white dark:focus-visible:bg-slate-900 transition-all rounded-xl"
            />
          </div>

          {/* COMBOBOX PROVEEDORES */}
          <div className="col-span-1">
            <Popover
              open={openSupplierCombo}
              onOpenChange={setOpenSupplierCombo}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSupplierCombo}
                  className="h-10 justify-between bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-900 w-full font-medium overflow-hidden rounded-xl transition-all"
                >
                  <span className="truncate text-slate-600 dark:text-slate-300 text-sm">
                    {supplierFilter === "all"
                      ? "Todos los Proveedores"
                      : suppliers?.find(
                          (s: any) => String(s.id) === supplierFilter,
                        )?.razon_social || "Proveedor"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 max-h-[300px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl z-50">
                <Command>
                  <CommandInput
                    placeholder="Buscar proveedor..."
                    className="h-10 text-sm"
                  />
                  <CommandEmpty className="p-4 text-sm text-center text-slate-500">
                    No se encontró el proveedor.
                  </CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-y-auto custom-scrollbar">
                    <CommandItem
                      onSelect={() => {
                        setSupplierFilter("all");
                        setOpenSupplierCombo(false);
                      }}
                      className="cursor-pointer font-bold text-xs uppercase tracking-tight"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-brand-blue",
                          supplierFilter === "all"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      Todos los Proveedores
                    </CommandItem>
                    {suppliers?.map((s: any) => (
                      <CommandItem
                        key={s.id}
                        value={s.razon_social}
                        onSelect={() => {
                          setSupplierFilter(String(s.id));
                          setOpenSupplierCombo(false);
                        }}
                        className="cursor-pointer text-xs uppercase tracking-tight"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-brand-blue",
                            supplierFilter === String(s.id)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {s.razon_social}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* ESTATUS */}
          <div className="col-span-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:ring-brand-blue/30 rounded-xl text-slate-600 dark:text-slate-300 font-medium">
                <SelectValue placeholder="Filtrar por Estatus" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-white/10">
                <SelectItem value="all" className="font-bold text-xs uppercase">
                  Todos los Estatus
                </SelectItem>
                <SelectItem value="pendiente" className="text-xs uppercase">
                  Pendiente
                </SelectItem>
                <SelectItem value="pago_parcial" className="text-xs uppercase">
                  Pago Parcial
                </SelectItem>
                <SelectItem
                  value="pagado"
                  className="text-xs uppercase text-emerald-600 dark:text-emerald-400 font-bold"
                >
                  Pagado
                </SelectItem>
                <SelectItem
                  value="cancelado"
                  className="text-xs uppercase text-slate-500"
                >
                  Cancelado
                </SelectItem>
                <SelectItem
                  value="vencido"
                  className="text-xs uppercase text-rose-600 dark:text-rose-400 font-bold"
                >
                  Vencido
                </SelectItem>
                <SelectItem
                  value="por_vencer"
                  className="text-xs uppercase text-amber-600 dark:text-amber-500 font-bold"
                >
                  Por Vencer (5 días)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CECO (CENTRO DE COSTOS) */}
          <div className="col-span-1">
            <Select value={cecoFilter} onValueChange={setCecoFilter}>
              <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:ring-brand-blue/30 rounded-xl text-slate-600 dark:text-slate-300 font-medium">
                <SelectValue placeholder="Centro de Costos (CECO)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-white/10">
                <SelectItem value="all" className="font-bold text-xs uppercase">
                  Todos los CECOs
                </SelectItem>
                {uniqueCecos.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="text-xs uppercase"
                  >
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* RANGO DE FECHAS (UNIFICADO EN ESTILO "PÍLDORA" COMPARTIDA) */}
          <div className="col-span-1 md:col-span-2 xl:col-span-4 mt-1">
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 h-11 shadow-inner focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all w-full max-w-2xl group">
              <Calendar className="h-4 w-4 text-slate-400 group-focus-within:text-brand-blue transition-colors mr-3 shrink-0" />

              <div className="flex items-center flex-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">
                  De
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 flex-1 text-sm border-none bg-transparent p-0 focus-visible:ring-0 shadow-none text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-4"></div>

              <div className="flex items-center flex-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">
                  Hasta
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 flex-1 text-sm border-none bg-transparent p-0 focus-visible:ring-0 shadow-none text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          PROYECCIÓN DINÁMICA DE PROVEEDOR
          ========================================== */}
      {supplierFilter !== "all" && (
        <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
          <div className="flex items-start md:items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-1">
                Proyección de Pago al Proveedor
              </h4>
              <p className="text-xs text-indigo-700 dark:text-indigo-400/80 font-medium leading-relaxed max-w-2xl">
                Si decides liquidar a este proveedor hoy, el total vencido
                actual es de{" "}
                <b className="font-black text-indigo-800 dark:text-indigo-200">
                  {formatMoney(kpis.totalVencido)}
                </b>{" "}
                y en los próximos 7 días vencerán{" "}
                <b className="font-black text-indigo-800 dark:text-indigo-200">
                  {formatMoney(kpis.compromisos7Dias)}
                </b>{" "}
                adicionales.
              </p>
            </div>
          </div>
          <div className="md:text-right border-t md:border-t-0 md:border-l border-indigo-200 dark:border-indigo-800/50 pt-4 md:pt-0 md:pl-6 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">
              Total a Pagar a proveedor seleccionado
            </p>
            <p className="text-2xl lg:text-3xl font-black text-indigo-700 dark:text-indigo-400 leading-none">
              {formatMoney(kpis.totalVencido + kpis.compromisos7Dias)}
            </p>
          </div>
        </div>
      )}

      {/* ==========================================
          BANNER DE FACTURAS SELECCIONADAS CON CHECKBOXES
          ========================================== */}
      {selectedInvoiceIds.length > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-300 shadow-lg relative z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest">
                Facturas Seleccionadas ({selectedInvoiceIds.length})
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400/80 font-medium">
                Has palomeado {selectedInvoiceIds.length} documento
                {selectedInvoiceIds.length > 1 ? "s" : ""} para analizar o
                liquidar.
              </p>
            </div>
          </div>
          <div className="md:text-right border-t md:border-t-0 md:border-l border-emerald-200 dark:border-emerald-800/50 pt-3 md:pt-0 md:pl-5 shrink-0 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                Monto Total de Facturas Seleccionadas
              </p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-none">
                {formatMoney(selectedTotalAmount)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedInvoiceIds([])}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900"
            >
              Desmarcar Todo
            </Button>
          </div>
        </div>
      )}

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
                  {formatMoney(kpis.totalVencido)}
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
                  {formatMoney(kpis.totalPorPagar)}
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
                  {formatMoney(kpis.totalParcial)}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-5 group hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-default relative overflow-hidden">
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out relative z-10 text-indigo-600 dark:text-indigo-400">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-center relative z-10">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1"
                  title="Flujo de efectivo requerido para facturas que vencen en los próximos 7 días"
                >
                  A Vencer (7 Días)
                </p>
                <p className="text-2xl font-black leading-none tracking-tighter text-indigo-600 dark:text-indigo-400">
                  {formatMoney(kpis.compromisos7Dias)}
                </p>
              </div>
            </Card>
          </div>

          <Card className="shadow-2xl border-none overflow-hidden bg-transparent">
            <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
              <EnhancedDataTable
                data={filteredInvoices}
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

      {/* ================================================== */}
      {/* NUEVO MODAL: CANCELAR FACTURA */}
      {/* ================================================== */}
      <AlertDialog
        open={isCancelInvoiceOpen}
        onOpenChange={setIsCancelInvoiceOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 dark:from-orange-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shadow-inner shrink-0 border border-orange-200 dark:border-orange-500/20">
                <Ban className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-orange-600 dark:text-orange-500 heading-crisp leading-none">
                  ¿Cancelar Factura?
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Cancelación Lógica • Cuentas por Pagar
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás a punto de cancelar la factura con folio{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight font-mono">
                  {invoiceToCancel?.folio_interno || invoiceToCancel?.id}
                </b>
                .
              </p>

              {invoiceToCancel &&
              (invoiceToCancel.saldo_pendiente || 0) <
                (invoiceToCancel.monto_total || 0) ? (
                <div className="p-5 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 rounded-r-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <h4 className="text-[10px] sm:text-[11px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest">
                      BLOQUEO POR AUDITORÍA (TESORERÍA)
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-orange-900 dark:text-orange-200/80 font-bold">
                    Esta factura no se puede cancelar porque ya tiene abonos o
                    pagos registrados en los bancos. <br />
                    <br />
                    Si necesitas cancelarla,{" "}
                    <span className="underline">
                      primero debes ir al módulo de Tesorería y anular el pago
                    </span>{" "}
                    para que el dinero regrese a la cuenta.
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-slate-100 dark:bg-slate-800/50 border-l-4 border-orange-500 rounded-r-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <h4 className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">
                      Efecto de la Cancelación
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    La factura cambiará a estatus <b>Cancelado</b> y dejará de
                    sumar a tu deuda total en las proyecciones. El registro
                    original <b>se conservará intacto</b> en la base de datos
                    para fines de auditoría, y podrás reabrirla posteriormente
                    si es necesario.
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
                onClick={() => setInvoiceToCancel(null)}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cerrar
              </AlertDialogCancel>

              {(!invoiceToCancel ||
                (invoiceToCancel.saldo_pendiente || 0) ===
                  (invoiceToCancel.monto_total || 0)) && (
                <AlertDialogAction
                  size="lg"
                  onClick={handleConfirmCancelInvoice}
                  className="w-full sm:w-auto haptic-press shadow-orange-600/10 flex-shrink-0 border-none bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  Confirmar Cancelación
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================== */}
      {/* NUEVO MODAL: REABRIR FACTURA */}
      {/* ================================================== */}
      <AlertDialog
        open={isReopenInvoiceOpen}
        onOpenChange={setIsReopenInvoiceOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 dark:from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner shrink-0 border border-emerald-200 dark:border-emerald-500/20">
                <RefreshCcw className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-emerald-600 dark:text-emerald-500 heading-crisp leading-none">
                  ¿Reabrir Factura?
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Reactivación • Cuentas por Pagar
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás a punto de reabrir la factura con folio{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight font-mono">
                  {invoiceToReopen?.folio_interno || invoiceToReopen?.id}
                </b>
                .
              </p>

              <div className="p-5 bg-slate-100 dark:bg-slate-800/50 border-l-4 border-emerald-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">
                    Efecto de la Reapertura
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  La factura regresará al estatus <b>Pendiente</b> y volverá a
                  ser calculada en tu deuda total. Su saldo pendiente se
                  restaurará al monto total de la factura.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setInvoiceToReopen(null)}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>

              <AlertDialogAction
                size="lg"
                onClick={handleConfirmReopenInvoice}
                className="w-full sm:w-auto haptic-press shadow-emerald-600/10 flex-shrink-0 border-none bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                Sí, Reabrir
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================== */}
      {/* MODAL ORIGINAL: ELIMINAR FACTURA DEFINITIVAMENTE   */}
      {/* ================================================== */}
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
                    . Considera usar la opción "Cancelar Factura" si solo
                    quieres ocultarla de los reportes.
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
                Cerrar
              </AlertDialogCancel>

              {(!invoiceToDelete ||
                (invoiceToDelete.saldo_pendiente || 0) ===
                  (invoiceToDelete.monto_total || 0)) && (
                <AlertDialogAction
                  variant="destructive"
                  size="lg"
                  onClick={handleConfirmDeleteInvoice}
                  className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  Sí, eliminar definitivamente
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
