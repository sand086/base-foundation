import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  MoreHorizontal,
  Plus,
  CreditCard,
  Trash2,
  Clock,
  Ban,
  Loader2,
  BadgeDollarSign,
  ReceiptText,
  FileSignature,
  LinkIcon,
  Filter,
  FileText,
  AlertTriangle,
  FilterX,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { CreateInvoiceModal } from "@/features/receivables/components/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/receivables/components/InvoiceDetailSheet";
import { ClientRegisterPaymentModal } from "@/features/treasury/components/ClientRegisterPaymentModal";
import { AccountStatementModal } from "@/features/receivables/components/AccountStatementModal";
import { AgingExportModal } from "@/components/common/AgingExportModal";

import {
  ReceivableInvoice,
  FinalizableService,
  getInvoiceStatusInfo,
  calculateDaysOverdue,
} from "@/features/receivables/types";
import { cn } from "@/lib/utils";

import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { useReceivables } from "@/features/receivables/hooks/useReceivables";

export default function Receivables() {
  const {
    receivables,
    isLoadingReceivables,
    refreshReceivables,
    deleteReceivable,
    registerMultiplePaymentRep,
    reopenReceivable,
    stampInvoice,
    stampFreeInvoice,
  } = useReceivables();

  const { bankAccounts = [] } = useBankAccounts();

  // Estados UI
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Modales de Eliminación/Cancelación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false);
  const [isAgingModalOpen, setIsAgingModalOpen] = useState(false);

  // NUEVOS: Estados para filtros en la barra superior
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // <-- NUEVO ESTADO DE ESTATUS
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Selección de Facturas
  const [selectedInvoice, setSelectedInvoice] =
    useState<ReceivableInvoice | null>(null);
  const [invoicesToPay, setInvoicesToPay] = useState<ReceivableInvoice[]>([]);
  const [importedServices, setImportedServices] = useState<
    FinalizableService[] | undefined
  >();

  const [invoiceToDelete, setInvoiceToDelete] =
    useState<ReceivableInvoice | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] =
    useState<ReceivableInvoice | null>(null);

  const [selectedRows, setSelectedRows] = useState<ReceivableInvoice[]>([]);

  // FORMATEO DE DATOS DE LA API
  const formattedInvoices = useMemo(() => {
    let dataArray = [];
    if (Array.isArray(receivables)) {
      dataArray = receivables;
    } else if (receivables && typeof receivables === "object") {
      dataArray =
        (receivables as any).items ||
        (receivables as any).data ||
        (receivables as any).results ||
        [];
    }

    return dataArray
      .filter((inv: any) => {
        // Dejamos pasar TODAS las facturas reales
        return (
          inv.folio_interno !== "folio interno bueno" &&
          inv.estatus !== "cancelado"
        );
      })
      .map((inv: any) => {
        const clienteNombre =
          inv.client?.razon_social ||
          inv.clientName ||
          inv.client_razon_social ||
          "Cliente Desconocido";

        let diasCredito = Number(
          inv.dias_credito ||
            inv.client?.dias_credito ||
            inv.cliente?.dias_credito ||
            0,
        );

        if (clienteNombre.toUpperCase().includes("BRAUN")) {
          diasCredito = 8;
        }

        if (!diasCredito) {
          if (clienteNombre.toUpperCase().includes("HANSA")) diasCredito = 15;
          else if (clienteNombre.toUpperCase().includes("KARCHER"))
            diasCredito = 8;
          else diasCredito = 15;
        }

        const fechaEmision = inv.fecha_emision || inv.created_at;
        let fechaVencimientoCalculada = inv.fecha_vencimiento;

        if (fechaEmision) {
          const cleanDateStr = fechaEmision.includes("T")
            ? fechaEmision.split("T")[0]
            : fechaEmision;

          const fechaObj = new Date(cleanDateStr.replace(/-/g, "/"));
          fechaObj.setDate(fechaObj.getDate() + diasCredito);

          const yyyy = fechaObj.getFullYear();
          const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
          const dd = String(fechaObj.getDate()).padStart(2, "0");
          fechaVencimientoCalculada = `${yyyy}-${mm}-${dd}`;
        }

        // SINCRONIZACIÓN DE ESTATUS REAL
        const saldo =
          inv.saldo_pendiente !== undefined
            ? Number(inv.saldo_pendiente)
            : Number(inv.monto_total) || 0;
        const monto = Number(inv.monto_total) || 0;

        let finalEstatus = "";

        if (String(inv.estatus || inv.status).toLowerCase() === "cancelado") {
          finalEstatus = "CANCELADO";
        } else {
          // Calculamos la etiqueta oficial EXACTA ("PAGADA", "POR COBRAR", etc.)
          const statusInfoCalculated = getInvoiceStatusInfo({
            ...inv,
            saldo_pendiente: saldo,
            monto_total: monto,
            fecha_vencimiento: fechaVencimientoCalculada,
          } as any);

          finalEstatus = statusInfoCalculated.label;
        }

        return {
          ...inv,
          id: inv.id,
          client_id: inv.client_id || inv.cliente_id || inv.client?.id,
          folio:
            inv.folio_interno ||
            (inv.uuid ? inv.uuid.substring(0, 8) : `CXC-${inv.id}`),
          cliente: clienteNombre,
          monto_total: monto,
          saldo_pendiente: saldo,
          requiereREP: saldo > 0,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimientoCalculada,
          dias_credito: diasCredito,
          estatus: finalEstatus, // <-- ESTATUS LIMPIO Y EN MAYÚSCULAS
          referencia: inv.referencia || "S/R",
          cobros: inv.payments || [],
        };
      }) as ReceivableInvoice[];
  }, [receivables]);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    formattedInvoices.forEach((inv) => {
      if (inv.client_id && inv.cliente) {
        map.set(String(inv.client_id), inv.cliente);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [formattedInvoices]);

  // LÓGICA DE FILTRADO ACTUALIZADA (CLIENTE + ESTATUS + RANGO DE FECHAS)
  const filteredInvoices = useMemo(() => {
    let filtered = formattedInvoices;

    // 1. Filtro por Cliente
    if (selectedClientId !== "all") {
      filtered = filtered.filter(
        (inv) => String(inv.client_id) === selectedClientId,
      );
    }

    // 2. Filtro por Estatus (NUEVO CONTROL EXTERNO)
    if (selectedStatus !== "all") {
      filtered = filtered.filter(
        (inv) => String(inv.estatus).toUpperCase() === selectedStatus,
      );
    }

    // 3. Filtro por Rango de Fechas (Fecha Emisión)
    if (startDate) {
      filtered = filtered.filter((inv) => {
        if (!inv.fecha_emision) return false;
        const emision = inv.fecha_emision.includes("T")
          ? inv.fecha_emision.split("T")[0]
          : inv.fecha_emision;
        return emision >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter((inv) => {
        if (!inv.fecha_emision) return false;
        const emision = inv.fecha_emision.includes("T")
          ? inv.fecha_emision.split("T")[0]
          : inv.fecha_emision;
        return emision <= endDate;
      });
    }

    return filtered;
  }, [formattedInvoices, selectedClientId, selectedStatus, startDate, endDate]);

  const financialSummary = useMemo(() => {
    let totalFacturado = 0;
    let totalCobrado = 0;
    let porCobrarVigente = 0;
    let carteraVencida = 0;

    filteredInvoices.forEach((inv) => {
      const monto = Number(inv.monto_total) || 0;
      const saldo = Number(inv.saldo_pendiente) || 0;
      const cobrado = monto - saldo > 0 ? monto - saldo : 0;

      totalFacturado += monto;
      totalCobrado += cobrado;

      if (saldo > 0) {
        if (!inv.fecha_vencimiento) {
          porCobrarVigente += saldo;
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fechaStr = inv.fecha_vencimiento.includes("T")
          ? inv.fecha_vencimiento.split("T")[0]
          : inv.fecha_vencimiento;
        const vencimiento = new Date(fechaStr.replace(/-/g, "/"));
        vencimiento.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - vencimiento.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysOverdue > 0) carteraVencida += saldo;
        else porCobrarVigente += saldo;
      }
    });

    return { totalFacturado, totalCobrado, porCobrarVigente, carteraVencida };
  }, [filteredInvoices]);

  const handlePaySelectedInvoices = () => {
    if (selectedRows.length === 0) return;
    const firstClientId = selectedRows[0].client_id;
    const allSameClient = selectedRows.every(
      (inv) => inv.client_id === firstClientId,
    );

    if (!allSameClient) {
      toast.error("Selección Inválida", {
        description:
          "Para generar un solo REP, todas las facturas seleccionadas deben pertenecer al MISMO CLIENTE.",
      });
      return;
    }
    setInvoicesToPay(selectedRows);
    setIsPaymentModalOpen(true);
  };

  const handleExportToExcel = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const headers = [
      "Folio",
      "Cliente",
      "Fecha Emisión",
      "Fecha Vencimiento",
      "Días Crédito",
      "Monto Total",
      "Saldo Pendiente",
      "Estatus",
      "Días Vencidos",
    ];
    const rows = filteredInvoices.map((inv) => {
      const diasVencidos = calculateDaysOverdue(inv.fecha_vencimiento);
      return [
        inv.folio_interno || inv.uuid,
        `"${inv.cliente}"`,
        inv.fecha_emision,
        inv.fecha_vencimiento,
        (inv as any).dias_credito || 0,
        inv.monto_total,
        inv.saldo_pendiente,
        inv.estatus?.toUpperCase() || "",
        diasVencidos > 0 ? diasVencidos : 0,
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Cartera_Cobranza_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo Excel generado exitosamente");
  };

  const handleCreateInvoice = async () => {
    setIsCreateModalOpen(false);
    setImportedServices(undefined);

    if (refreshReceivables) {
      await refreshReceivables();
    }
  };

  const handleRegisterPayment = async (payload: any) => {
    if (invoicesToPay.length === 0) return;
    const success = await registerMultiplePaymentRep(payload);
    if (success) {
      setIsPaymentModalOpen(false);
      setInvoicesToPay([]);
      setSelectedRows([]);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const success = await deleteReceivable(invoiceToDelete.id);
    if (success) {
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleCancelInvoice = async (cascade: boolean) => {
    if (!invoiceToCancel) return;
    try {
      const success = await deleteReceivable(invoiceToCancel.id, { cascade });
      if (success) {
        setIsCancelModalOpen(false);
        setInvoiceToCancel(null);
        toast.success(
          cascade
            ? "Factura y Operaciones eliminadas"
            : "Factura cancelada lógicamente",
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const columns: ColumnDef<ReceivableInvoice>[] = useMemo(
    () => [
      {
        key: "folio",
        header: "Folio / Documento",
        render: (value, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          const isProvisional =
            row.status_sat === "PROVISIONAL" ||
            row.status_sat === "provisional" ||
            !row.uuid;

          return (
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-sm font-bold uppercase ${statusInfo.status === "danger" ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {value}
                </span>

                {row.uuid_relacionado && (
                  <div
                    className="p-1 bg-indigo-50 dark:bg-indigo-900/30 rounded border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center cursor-help transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    title={`Relacionada al CFDI: ${row.uuid_relacionado}`}
                  >
                    <LinkIcon className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                  </div>
                )}
              </div>

              {isProvisional && (
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 text-[9px] uppercase tracking-widest border-none mt-0.5">
                  PROVISIONAL
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: "cliente",
        header: "Cliente",
        render: (value) => (
          <span className="text-sm font-black text-brand-navy dark:text-white max-w-[200px] truncate block uppercase tracking-tight">
            {value}
          </span>
        ),
      },
      {
        key: "monto_total",
        header: "Monto",
        type: "number",
        render: (value, row) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
              {formatMoney(value)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
              {row.moneda || "MXN"}
            </span>
          </div>
        ),
      },
      {
        key: "saldo_pendiente",
        header: "Saldo a Cobrar",
        type: "number",
        render: (value, row) => {
          const saldo = value || 0;
          const statusInfo = getInvoiceStatusInfo(row);
          return (
            <span
              className={`font-mono text-sm font-black ${saldo === 0 ? "text-emerald-600 dark:text-emerald-400" : statusInfo.status === "danger" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
            >
              {formatMoney(saldo)}
            </span>
          );
        },
      },
      {
        key: "fecha_emision",
        header: "Emisión",
        type: "date",
        render: (value) => {
          if (!value) return "—";
          const safeDate = new Date(
            value.includes("-")
              ? value.split("T")[0].replace(/-/g, "/")
              : value,
          );
          return (
            <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
              {safeDate.toLocaleDateString("es-MX")}
            </span>
          );
        },
      },
      {
        key: "fecha_vencimiento",
        header: "Vencimiento",
        type: "date",
        render: (value, row) => {
          if (!value) return "—";
          if (row.saldo_pendiente === 0) {
            return (
              <div className="flex flex-col">
                <span className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest">
                  Liquidado
                </span>
              </div>
            );
          }
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const safeDate = new Date(
            value.includes("-")
              ? value.split("T")[0].replace(/-/g, "/")
              : value,
          );
          safeDate.setHours(0, 0, 0, 0);

          const diffTime = today.getTime() - safeDate.getTime();
          const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const formattedDate = safeDate.toLocaleDateString("es-MX");

          if (daysOverdue > 0) {
            return (
              <div className="flex flex-col">
                <span className="font-mono text-sm font-bold uppercase text-red-600 dark:text-red-400">
                  {formattedDate}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 dark:text-red-400 mt-1 animate-pulse">
                  +{daysOverdue} DÍAS VENCIDO
                </span>
              </div>
            );
          } else {
            const diasFaltantes = Math.abs(daysOverdue);
            const colorCls =
              diasFaltantes <= 3
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400";
            return (
              <div className="flex flex-col">
                <span
                  className={`font-mono text-sm font-bold uppercase ${colorCls}`}
                >
                  {formattedDate}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${colorCls} mt-1`}
                >
                  VENCE EN {diasFaltantes} DÍA{diasFaltantes !== 1 ? "S" : ""}
                </span>
              </div>
            );
          }
        },
      },
      {
        key: "estatus",
        header: "Estatus",
        // 🔴 COMPLETAMENTE ELIMINADO EL FILTRO INTERNO DE ESTA COLUMNA
        render: (value, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          return (
            <StatusBadge
              status={statusInfo.status}
              className="uppercase font-bold text-[10px] tracking-wider px-2 py-1"
            >
              {value}{" "}
              {/* Mostramos la etiqueta oficial indexada (ej. PAGADA, POR COBRAR) */}
            </StatusBadge>
          );
        },
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => {
          const isSelectionActive = selectedRows.length > 0;
          const hasPayments =
            (row.monto_total || 0) > (row.saldo_pendiente || 0);

          const isProvisional =
            row.status_sat === "PROVISIONAL" ||
            row.status_sat === "provisional" ||
            !row.uuid;

          const isStamped = !!row.uuid;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isSelectionActive}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10",
                    isSelectionActive
                      ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
                      : "hover:bg-slate-100 dark:bg-slate-800 bg-white/50 dark:bg-slate-900/50",
                  )}
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
                  <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />{" "}
                  Ver Detalle
                </DropdownMenuItem>

                {isStamped && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          `/api/sat/invoice/${row.uuid}/pdf`,
                          "_blank",
                        )
                      }
                      className="gap-2 font-bold text-[11px] uppercase tracking-tight cursor-pointer text-indigo-600 dark:text-indigo-400 dark:focus:bg-indigo-950/30"
                    >
                      <FileText className="h-4 w-4 mr-2" /> Descargar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          `/api/sat/invoice/${row.uuid}/xml`,
                          "_blank",
                        )
                      }
                      className="gap-2 font-bold text-[11px] uppercase tracking-tight cursor-pointer text-amber-600 dark:text-amber-400 dark:focus:bg-amber-950/30"
                    >
                      <FileSignature className="h-4 w-4 mr-2" /> Descargar XML
                    </DropdownMenuItem>
                  </>
                )}

                {isProvisional && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={async () => {
                        if (
                          window.confirm("¿Timbrar esta factura ante el SAT?")
                        ) {
                          const viajeId =
                            (row as any).viaje_id || (row as any).trip_id;

                          if (viajeId) {
                            await stampInvoice(Number(viajeId));
                          } else {
                            if (!row.id) {
                              return toast.error("Error", {
                                description: "ID de factura no válido",
                              });
                            }
                            await stampFreeInvoice(Number(row.id));
                          }
                        }
                      }}
                      className="gap-2 font-black text-[11px] uppercase tracking-widest cursor-pointer text-indigo-600 dark:text-indigo-400 focus:bg-indigo-50"
                    >
                      <FileSignature className="h-4 w-4 mr-2" /> Timbrar Factura
                      SAT
                    </DropdownMenuItem>
                  </>
                )}

                {(row.saldo_pendiente || 0) > 0 && !isProvisional && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => {
                        setInvoicesToPay([row]);
                        setIsPaymentModalOpen(true);
                      }}
                      className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer text-emerald-600 dark:text-emerald-500 dark:focus:bg-emerald-900/30"
                    >
                      <CreditCard className="h-4 w-4 mr-2" /> Registrar Cobro y
                      REP
                    </DropdownMenuItem>
                  </>
                )}

                {hasPayments && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={async () => {
                        if (
                          window.confirm("¿Anular el pago de esta factura?")
                        ) {
                          await reopenReceivable(Number(row.id));
                        }
                      }}
                      className="gap-2 font-bold text-[11px] uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                    >
                      <Ban className="h-4 w-4 mr-2" /> Anular Pago y Desbloquear
                    </DropdownMenuItem>
                  </>
                )}

                {!hasPayments && row.estatus !== "cancelado" && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => {
                        setInvoiceToCancel(row);
                        setIsCancelModalOpen(true);
                      }}
                      className="gap-2 font-bold text-xs uppercase tracking-tight text-orange-600 dark:text-orange-500 cursor-pointer dark:focus:bg-orange-950/30"
                    >
                      <Ban className="h-4 w-4 mr-2" /> Cancelar Factura
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [selectedRows.length, reopenReceivable, stampInvoice, stampFreeInvoice],
  );

  if (isLoadingReceivables) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  const selectedClientName =
    selectedClientId === "all"
      ? "Todos los Clientes"
      : uniqueClients.find((c) => c.id === selectedClientId)?.name || "Cliente";

  return (
    <div className="space-y-6 pb-20 animate-page-enter relative">
      <PageHeader
        title="Cuentas por Cobrar"
        description="Gestión de cartera, métricas de ingresos y cobranza a clientes."
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* ======================================= */}
          {/* BARRA DE FILTROS SUPERIOR (TOTALMENTE INDEPENDIENTE) */}
          {/* ======================================= */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            {/* Filtro Cliente */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 h-10 shadow-sm min-w-[220px]">
              <Filter className="h-4 w-4 text-slate-400 mr-2" />
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger className="w-full border-none shadow-none h-8 bg-transparent p-0 pr-2 focus:ring-0 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold text-xs">
                    Todos los clientes
                  </SelectItem>
                  {uniqueClients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                      className="text-xs uppercase"
                    >
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 👇 NUEVO: FILTRO EXTERNO DE ESTATUS 👇 */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 h-10 shadow-sm min-w-[180px]">
              <AlertCircle className="h-4 w-4 text-slate-400 mr-2" />
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full border-none shadow-none h-8 bg-transparent p-0 pr-2 focus:ring-0 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <SelectValue placeholder="Todos los estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold text-xs">
                    Todos los estatus
                  </SelectItem>
                  <SelectItem
                    value="POR COBRAR"
                    className="text-xs font-bold text-amber-600"
                  >
                    Por Cobrar
                  </SelectItem>
                  <SelectItem
                    value="PAGO PARCIAL"
                    className="text-xs font-bold text-blue-500"
                  >
                    Pago Parcial
                  </SelectItem>
                  <SelectItem
                    value="VENCIDA 1-30D"
                    className="text-xs font-bold text-rose-500"
                  >
                    Vencida 1-30d
                  </SelectItem>
                  <SelectItem
                    value="VENCIDA 31-60D"
                    className="text-xs font-bold text-rose-600"
                  >
                    Vencida 31-60d
                  </SelectItem>
                  <SelectItem
                    value="ATRASADO +90D"
                    className="text-xs font-bold text-rose-700"
                  >
                    Atrasado +90d
                  </SelectItem>
                  <SelectItem
                    value="PAGADA"
                    className="text-xs font-bold text-emerald-600"
                  >
                    Pagada
                  </SelectItem>
                  <SelectItem
                    value="CANCELADO"
                    className="text-xs font-bold text-slate-500"
                  >
                    Cancelado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón Limpiar */}
            {(selectedClientId !== "all" ||
              selectedStatus !== "all" ||
              startDate ||
              endDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedClientId("all");
                  setSelectedStatus("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="h-10 text-slate-500 hover:text-brand-red flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
              >
                <FilterX className="h-4 w-4" /> Limpiar
              </Button>
            )}
          </div>
          {/* ======================================= */}

          <Button
            variant="outline"
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-brand-navy dark:text-slate-200 font-bold"
            disabled={
              selectedClientId === "all" || filteredInvoices.length === 0
            }
            onClick={() => setIsAccountStatementOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2 text-indigo-500" />
            Estado de Cuenta
          </Button>

          <Button
            onClick={() => setIsAgingModalOpen(true)}
            variant="outline"
            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-bold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar consolidado
          </Button>

          <ActionButton
            size="md"
            className="bg-brand-navy hover:bg-brand-navy/90"
            onClick={() => {
              setImportedServices(undefined);
              setIsCreateModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Factura
          </ActionButton>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
              <ReceiptText className="h-4 w-4 text-blue-500" /> Total Facturado
            </p>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-none tracking-tighter">
              $
              {financialSummary.totalFacturado.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow bg-emerald-50/30">
          <CardContent className="p-5">
            <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
              <BadgeDollarSign className="h-4 w-4 text-emerald-600" /> Total
              Cobrado (Ingresos)
            </p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-500 leading-none tracking-tighter">
              $
              {financialSummary.totalCobrado.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
              <Clock className="h-4 w-4 text-amber-500" /> Por Cobrar (Vigente)
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter">
              $
              {financialSummary.porCobrarVigente.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-4 w-4 text-rose-500" /> Cartera Vencida
            </p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none tracking-tighter">
              $
              {financialSummary.carteraVencida.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-transparent relative z-0">
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          <EnhancedDataTable
            data={filteredInvoices}
            columns={columns}
            exportFileName="cuentas_por_cobrar"
            enableRowSelection={true}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            rowKey="id"
            onCustomExport={handleExportToExcel}
            isRowSelectable={(row) =>
              (row.saldo_pendiente || 0) > 0 && row.status_sat !== "PROVISIONAL"
            }
            hideGlobalSearch={true} // <-- ELIMINA EL BUSCADOR
            hideInternalFilters={true} // <-- ELIMINA EL BOTÓN "FILTROS INT."
          />
        </CardContent>
      </Card>

      {selectedRows.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 ease-out">
          <div className="glass-panel bg-brand-navy/95 dark:bg-slate-900/95 text-white px-3 py-3 rounded-2xl shadow-2xl flex items-center gap-4 sm:gap-6 border border-white/20">
            <div className="flex items-center gap-3 pl-3">
              <Badge className="bg-emerald-500 text-white font-black text-sm h-7 px-3 border-none">
                {selectedRows.length}
              </Badge>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-xs uppercase tracking-widest leading-none">
                  Facturas
                </span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">
                  Seleccionadas
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/20 hidden sm:block"></div>
            <Button
              onClick={handlePaySelectedInvoices}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs h-11 px-6 rounded-xl border-none shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] haptic-press"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Generar REP
            </Button>
          </div>
        </div>
      )}

      <CreateInvoiceModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) setImportedServices(undefined);
        }}
        onSubmit={handleCreateInvoice}
        importedServices={importedServices}
      />
      <InvoiceDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        invoice={selectedInvoice}
      />
      <ClientRegisterPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        invoices={invoicesToPay}
        clientName={invoicesToPay[0]?.cliente}
        clientId={invoicesToPay[0]?.client_id || invoicesToPay[0]?.client?.id}
        onSubmit={handleRegisterPayment}
      />

      {(() => {
        const clientName =
          selectedClientId === "all"
            ? "all"
            : uniqueClients.find((c) => c.id === selectedClientId)?.name ||
              "all";
        return (
          <AccountStatementModal
            open={isAccountStatementOpen}
            onClose={() => setIsAccountStatementOpen(false)}
            invoices={formattedInvoices}
            initialClient={clientName}
            bankAccounts={bankAccounts}
          />
        );
      })()}

      {/* ================================================== */}
      {/* 🔴 MODAL DE CANCELACIÓN (OPCIONES MÚLTIPLES)         */}
      {/* ================================================== */}
      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 dark:from-orange-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shadow-inner shrink-0 border border-orange-200 dark:border-orange-500/20">
                <Ban className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-orange-600 dark:text-orange-500 heading-crisp leading-none">
                  Opciones de Cancelación
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Acción Delicada • Cuentas por Cobrar
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás a punto de intervenir la factura con folio{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight font-mono">
                  {invoiceToCancel?.folio_interno || invoiceToCancel?.id}
                </b>
                . ¿Qué deseas hacer exactamente?
              </p>

              <div className="grid gap-4 mt-6">
                <div className="p-5 bg-white dark:bg-slate-800 border-l-4 border-orange-500 rounded-r-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">
                      1. Solo Eliminar Factura (Liberar Viaje)
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-4">
                    La factura se eliminará de tu cartera. Las operaciones
                    (vales y conciliaciones) se mantienen intactas, pero el
                    viaje quedará libre.{" "}
                    <b>
                      Para generar de nuevo la factura, el usuario tendrá que
                      volver a liquidar el viaje.
                    </b>
                  </p>
                  <Button
                    onClick={() => handleCancelInvoice(false)}
                    className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 dark:text-orange-300 font-bold shadow-none"
                  >
                    Solo eliminar factura
                  </Button>
                </div>

                <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <h4 className="text-xs sm:text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                      2. Eliminar todo en Cascada (El viaje no se hizo)
                    </h4>
                  </div>
                  <div className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80 mb-4 font-medium">
                    Esta acción es{" "}
                    <b className="uppercase underline">crítica</b> e
                    irreversible. Destruirá por completo:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>La factura (CxC)</li>
                      <li>El viaje completo (Operaciones)</li>
                      <li>La liquidación del operador</li>
                      <li>
                        Cualquier ticket, monitoreo o conciliación relacionada
                      </li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción borrará el viaje y la liquidación de forma irreversible.",
                        )
                      ) {
                        handleCancelInvoice(true);
                      }
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-rose-600/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar todo el
                    registro
                  </Button>
                </div>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-4 sm:p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10 flex justify-center">
            <AlertDialogCancel
              onClick={() => setIsCancelModalOpen(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cerrar y no hacer nada
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CÓDIGO NUEVO (Línea ~820 en Receivables.tsx): */}
      <AgingExportModal
        open={isAgingModalOpen}
        onOpenChange={setIsAgingModalOpen}
        type="cxc"
        invoices={formattedInvoices}
      />
    </div>
  );
}
