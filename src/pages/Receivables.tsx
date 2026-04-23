import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  AlertCircle,
  Eye,
  MoreHorizontal,
  Plus,
  FileInput,
  CreditCard,
  Trash2,
  Clock,
  Ban,
  CheckCircle2,
  Sheet as SheetIcon,
  Loader2,
  BadgeDollarSign,
  ReceiptText,
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

import { CreateInvoiceModal } from "@/features/receivables/components/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/receivables/components/InvoiceDetailSheet";
import { ClientRegisterPaymentModal } from "@/features/treasury/components/ClientRegisterPaymentModal";
import { AccountStatementModal } from "@/features/receivables/components/AccountStatementModal";

import {
  ReceivableInvoice,
  FinalizableService,
  getInvoiceStatusInfo,
  calculateDaysOverdue,
} from "@/features/receivables/types";
import axiosClient from "@/api/axiosClient";

// HOOKS
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { useReceivables } from "@/features/receivables/hooks/useReceivables";

export default function Receivables() {
  const {
    receivables,
    isLoadingReceivables,
    refreshReceivables,
    deleteReceivable,
    registerMultiplePaymentRep,
    registerPayment,
    reopenReceivable,
  } = useReceivables();

  const { bankAccounts = [] } = useBankAccounts();

  // Estados UI
  const [services, setServices] = useState<FinalizableService[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] =
    useState<ReceivableInvoice | null>(null);
  const [invoicesToPay, setInvoicesToPay] = useState<ReceivableInvoice[]>([]);
  const [importedServices, setImportedServices] = useState<
    FinalizableService[] | undefined
  >();
  const [invoiceToDelete, setInvoiceToDelete] =
    useState<ReceivableInvoice | null>(null);
  const [selectedRows, setSelectedRows] = useState<ReceivableInvoice[]>([]);

  // FORMATEO DE DATOS DE LA API (CON CÁLCULO DE DÍAS DE CRÉDITO BLINDADO)
  // FORMATEO DE DATOS DE LA API (CÁLCULO EXACTO EN DÍAS HÁBILES)
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
        const montoValido = Number(inv.monto_total) !== 1.12;
        const folioValido =
          inv.folio_interno === null ||
          inv.folio_interno !== "folio interno bueno";

        return montoValido && folioValido;
      })
      .map((inv: any) => {
        const clienteNombre =
          inv.client?.razon_social ||
          inv.clientName ||
          inv.client_razon_social ||
          "Cliente Desconocido";

        // 🚀 1. INTENTAMOS SACAR LOS DÍAS DEL BACKEND
        let diasCredito = Number(
          inv.client?.dias_credito ||
            inv.cliente?.dias_credito ||
            inv.dias_credito,
        );

        // 🚀 2. SALVAVIDAS: Asignación forzada si el backend no los trae
        if (!diasCredito) {
          if (clienteNombre.toUpperCase().includes("HANSA")) {
            diasCredito = 15;
          } else if (clienteNombre.toUpperCase().includes("KARCHER")) {
            diasCredito = 8;
          } else {
            diasCredito = 15; // Valor por defecto
          }
        }

        const fechaEmision = inv.fecha_emision || inv.created_at;
        let fechaVencimientoCalculada = inv.fecha_vencimiento;

        // 🚀 3. CÁLCULO ESTRICTO EN DÍAS HÁBILES (Sin Sábados ni Domingos)
        if (fechaEmision) {
          const cleanDateStr = fechaEmision.includes("T")
            ? fechaEmision.split("T")[0]
            : fechaEmision;
          const fechaObj = new Date(cleanDateStr.replace(/-/g, "/"));

          let addedDays = 0;
          // Sumamos días 1 por 1. Si es fin de semana, no cuenta para el crédito.
          while (addedDays < diasCredito) {
            fechaObj.setDate(fechaObj.getDate() + 1);
            // getDay() devuelve 0 para Domingo y 6 para Sábado
            if (fechaObj.getDay() !== 0 && fechaObj.getDay() !== 6) {
              addedDays++;
            }
          }

          const yyyy = fechaObj.getFullYear();
          const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
          const dd = String(fechaObj.getDate()).padStart(2, "0");

          fechaVencimientoCalculada = `${yyyy}-${mm}-${dd}`;
        }

        return {
          ...inv,
          id: inv.id,
          client_id: inv.client_id || inv.cliente_id || inv.client?.id,
          folio:
            inv.folio_interno ||
            (inv.uuid ? inv.uuid.substring(0, 8) : `CXC-${inv.id}`),
          cliente: clienteNombre,
          monto_total: Number(inv.monto_total) || 0,
          saldo_pendiente:
            inv.saldo_pendiente !== undefined
              ? Number(inv.saldo_pendiente)
              : Number(inv.monto_total) || 0,
          requiereREP: (Number(inv.saldo_pendiente) || 0) > 0,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimientoCalculada, // USAMOS LA FECHA EN DÍAS HÁBILES
          dias_credito: diasCredito,
          estatus: inv.estatus || inv.status || "corriente",
          referencia: inv.referencia || "S/R",
          cobros: inv.payments || [],
        };
      }) as ReceivableInvoice[];
  }, [receivables]);

  // CÁLCULO DEL RESUMEN FINANCIERO
  const financialSummary = useMemo(() => {
    let totalFacturado = 0;
    let totalCobrado = 0;
    let porCobrarVigente = 0;
    let carteraVencida = 0;

    formattedInvoices.forEach((inv) => {
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

        if (daysOverdue > 0) {
          carteraVencida += saldo;
        } else {
          porCobrarVigente += saldo;
        }
      }
    });

    return { totalFacturado, totalCobrado, porCobrarVigente, carteraVencida };
  }, [formattedInvoices]);

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
    if (formattedInvoices.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Folio",
      "Cliente",
      "Fecha Emisión",
      "Fecha Vencimiento",
      "Días Crédito", // Nuevo campo en el excel
      "Monto Total",
      "Saldo Pendiente",
      "Estatus",
      "Días Vencidos",
    ];

    const rows = formattedInvoices.map((inv) => {
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

  const handleImportServices = (selectedServices: FinalizableService[]) => {
    setImportedServices(selectedServices);
    setIsImportModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateInvoice = async (invoiceData: any) => {
    try {
      await axiosClient.post("/api/finance/receivables", invoiceData);

      setIsCreateModalOpen(false);
      setImportedServices(undefined);
      toast.success("Factura generada y guardada exitosamente");

      await refreshReceivables?.();
    } catch (error: any) {
      console.error("Error al crear factura:", error);
      toast.error("Error al generar la factura", {
        description:
          error.response?.data?.detail ||
          "Verifica la conexión con el servidor",
      });
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
        header: "Folio",
        render: (value, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          return (
            <div className="flex flex-col">
              <span
                className={`font-mono text-sm font-bold uppercase ${statusInfo.status === "danger" ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}
              >
                {value}
              </span>
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

          // 🚀 MATEMÁTICA EN VIVO A PRUEBA DE BALAS PARA LA DEMO
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
            // 🚀 SIEMPRE MOSTRAR LOS DÍAS FALTANTES
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
        type: "status",
        statusOptions: ["corriente", "vencida", "pagada", "pago_parcial"],
        render: (_, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          return (
            <StatusBadge
              status={statusInfo.status}
              className="uppercase font-bold text-[10px] tracking-wider px-2 py-1"
            >
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
                  setIsDetailSheetOpen(true);
                }}
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />{" "}
                Ver Detalle
              </DropdownMenuItem>

              {(row.saldo_pendiente || 0) > 0 && (
                <>
                  <DropdownMenuSeparator className="dark:bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      setInvoicesToPay([row]);
                      setIsPaymentModalOpen(true);
                    }}
                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer text-amber-600 dark:text-amber-400 dark:focus:bg-amber-900/30"
                  >
                    <CreditCard className="h-4 w-4 mr-2" /> Registrar Cobro y
                    REP
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem
                onClick={async () => {
                  if (
                    window.confirm(
                      "¿Estás seguro de restaurar esta factura? El saldo volverá a estar pendiente para que puedas intentar el REP de nuevo.",
                    )
                  ) {
                    await reopenReceivable(Number(row.id));
                  }
                }}
                className="gap-2 font-bold text-xs uppercase tracking-tight text-blue-600 dark:text-blue-500 cursor-pointer dark:focus:bg-blue-950/30"
              >
                <Clock className="h-4 w-4 mr-2" /> Restaurar / Reintentar Pago
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  if (isLoadingReceivables) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter relative">
      <PageHeader
        title="Cuentas por Cobrar (Tesorería)"
        description="Gestión de cartera, métricas de ingresos y cobranza a clientes."
      >
        <div className="flex flex-wrap items-center gap-3">
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

      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* TOTAL FACTURADO */}
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

        {/* TOTAL COBRADO */}
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

        {/* POR COBRAR (VIGENTE) */}
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

        {/* CARTERA VENCIDA */}
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
            data={formattedInvoices}
            columns={columns}
            exportFileName="cuentas_por_cobrar"
            enableRowSelection={true}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            rowKey="id"
            onCustomExport={handleExportToExcel}
          />
        </CardContent>
      </Card>

      {/* PANEL FLOTANTE DE COBRO MULTIPLE */}
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

      {/* MODALES */}

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
      <AccountStatementModal
        open={isAccountStatementOpen}
        onClose={() => setIsAccountStatementOpen(false)}
        invoices={formattedInvoices}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
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
              {invoiceToDelete &&
              (invoiceToDelete.saldo_pendiente || 0) <
                (invoiceToDelete.monto_total || 0) ? (
                <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 p-3 rounded-lg block mt-2 border border-red-200 dark:border-red-900/50">
                  Error: Esta factura ya tiene abonos/pagos registrados. Por
                  auditoría fiscal, no es posible eliminarla. Cancele los pagos
                  primero.
                </span>
              ) : (
                <span className="block mt-2">
                  Esta acción no se puede deshacer. Se eliminará la factura{" "}
                  <strong>
                    {invoiceToDelete?.uuid || invoiceToDelete?.folio_interno}
                  </strong>{" "}
                  del sistema.
                </span>
              )}
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex w-full gap-3 justify-end">
              <AlertDialogCancel className="haptic-press font-black uppercase tracking-widest text-[10px]">
                Cancelar
              </AlertDialogCancel>
              {invoiceToDelete &&
                (invoiceToDelete.saldo_pendiente || 0) ===
                  (invoiceToDelete.monto_total || 0) && (
                  <AlertDialogAction
                    onClick={handleDeleteInvoice}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] haptic-press shadow-rose-600/20"
                  >
                    Sí, Eliminar
                  </AlertDialogAction>
                )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
