import { useState, useMemo, useEffect } from "react";
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
  FileCode2,
  Upload,
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

import axiosClient from "@/api/axiosClient";

// Feature components
import { ImportServicesModal } from "@/features/receivables/components/ImportServicesModal";
import { CreateInvoiceModal } from "@/features/receivables/components/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/receivables/components/InvoiceDetailSheet";
//  1. CAMBIAMOS LA IMPORTACIÓN AL MODAL MÚLTIPLE
import { ClientRegisterPaymentModal } from "@/features/treasury/components/ClientRegisterPaymentModal";
import { AccountStatementModal } from "@/features/receivables/components/AccountStatementModal";
import { ImportXMLPaymentModal } from "@/features/receivables/components/ImportXMLPaymentModal";

import {
  ReceivableInvoice,
  InvoicePayment,
  FinalizableService,
  getInvoiceStatusInfo,
  getAgingCategory,
  calculateDaysOverdue,
} from "@/features/receivables/types";

import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { receivableService } from "@/features/receivables/services/receivableService";
import { cn } from "@/lib/utils";

export default function Receivables() {
  const [invoices, setInvoices] = useState<ReceivableInvoice[]>([]);
  const [services, setServices] = useState<FinalizableService[]>([]);
  const [loading, setLoading] = useState(true);
  const { bankAccounts = [] } = useBankAccounts();

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false);
  const [isImportXMLOpen, setIsImportXMLOpen] = useState(false);

  // Selected state
  const [selectedInvoice, setSelectedInvoice] =
    useState<ReceivableInvoice | null>(null);

  //  2. NUEVO ESTADO PARA SOPORTAR MÚLTIPLES FACTURAS
  const [invoicesToPay, setInvoicesToPay] = useState<ReceivableInvoice[]>([]);

  const [importedServices, setImportedServices] = useState<
    FinalizableService[] | undefined
  >();
  const [invoiceToDelete, setInvoiceToDelete] =
    useState<ReceivableInvoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await receivableService.getInvoices();

      const formattedData: ReceivableInvoice[] = data.map((inv: any) => ({
        ...inv,
        client_id: inv.client_id || inv.cliente_id || inv.client?.id,
        folio: inv.folio_interno || `CXC-${String(inv.id)}`,
        cliente: inv.client?.razon_social || "Cliente Desconocido",
        requiereREP: inv.saldo_pendiente > 0,
        fechaEmision: inv.fecha_emision,
        fechaVencimiento: inv.fecha_vencimiento,
        cobros: inv.payments || [],
      }));

      setInvoices(formattedData);
    } catch (error) {
      toast.error("Error al cargar las cuentas por cobrar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleExportToExcel = () => {
    if (invoices.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Folio",
      "Cliente",
      "Fecha Emisión",
      "Fecha Vencimiento",
      "Monto Total",
      "Saldo Pendiente",
      "Estatus",
      "Días Vencidos",
    ];

    const rows = invoices.map((inv) => {
      const diasVencidos = calculateDaysOverdue(inv.fecha_vencimiento);
      return [
        inv.folio_interno,
        `"${inv.cliente}"`,
        inv.fecha_emision,
        inv.fecha_vencimiento,
        inv.monto_total,
        inv.saldo_pendiente,
        inv.estatus.toUpperCase(),
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

  const agingReport = useMemo(() => {
    const corriente = invoices
      .filter(
        (inv) =>
          getAgingCategory(inv) === "corriente" && inv.saldo_pendiente > 0,
      )
      .reduce((sum, inv) => sum + inv.saldo_pendiente, 0);
    const vencido1_30 = invoices
      .filter((inv) => getAgingCategory(inv) === "vencido_1_30")
      .reduce((sum, inv) => sum + inv.saldo_pendiente, 0);
    const vencido31_60 = invoices
      .filter((inv) => getAgingCategory(inv) === "vencido_31_60")
      .reduce((sum, inv) => sum + inv.saldo_pendiente, 0);
    const incobrable = invoices
      .filter((inv) => getAgingCategory(inv) === "incobrable")
      .reduce((sum, inv) => sum + inv.saldo_pendiente, 0);
    return { corriente, vencido1_30, vencido31_60, incobrable };
  }, [invoices]);

  const handleImportServices = (selectedServices: FinalizableService[]) => {
    setImportedServices(selectedServices);
    setIsImportModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateInvoice = async (
    invoiceData: Omit<ReceivableInvoice, "id" | "folio" | "cobros" | "estatus">,
  ) => {
    toast.info("Función de creación manual en desarrollo");
  };

  //  3. ACTUALIZAMOS EL HANDLER PARA EL NUEVO ENDPOINT
  const handleRegisterPayment = async (payload: any) => {
    try {
      // Usamos el endpoint que creamos en el Sprint 3.2
      await axiosClient.post(`/api/sat/stamp/payment`, payload);
      toast.success("¡Cobro Registrado y Complemento Timbrado!");
      setIsPaymentModalOpen(false);
      setInvoicesToPay([]);
      fetchInvoices();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ||
          "Error al registrar el cobro y timbrar REP",
      );
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await axiosClient.delete(`api/receivables/${invoiceToDelete.id}`);
      setInvoices(invoices.filter((inv) => inv.id !== invoiceToDelete.id));
      toast.success("Factura eliminada correctamente");
    } catch (error) {
      toast.error("Error al eliminar la factura");
    } finally {
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
                className={`font-mono text-sm font-bold ${statusInfo.status === "danger" ? "text-red-700" : "text-brand-navy"}`}
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
          <span className="text-sm font-black text-slate-700 max-w-[200px] truncate block uppercase">
            {value}
          </span>
        ),
      },
      {
        key: "montoTotal",
        header: "Monto",
        type: "number",
        render: (value, row) => (
          <span className="text-sm font-bold text-slate-700">
            {formatMoney(value)}
            <span className="text-[10px] text-muted-foreground ml-1">
              {row.moneda}
            </span>
          </span>
        ),
      },
      {
        key: "saldoPendiente",
        header: "Saldo a Cobrar",
        type: "number",
        render: (value, row) => {
          const statusInfo = getInvoiceStatusInfo(row);
          return (
            <span
              className={`text-sm font-black ${value === 0 ? "text-emerald-600" : statusInfo.status === "danger" ? "text-red-600" : "text-amber-600"}`}
            >
              {formatMoney(value)}
            </span>
          );
        },
      },
      {
        key: "fechaEmision",
        header: "Emisión",
        type: "date",
        render: (value) => (
          <span className="text-xs font-medium text-slate-500">
            {new Date(value).toLocaleDateString("es-MX")}
          </span>
        ),
      },
      {
        key: "fechaVencimiento",
        header: "Vencimiento",
        type: "date",
        render: (value, row) => {
          const daysOverdue = calculateDaysOverdue(value);
          const isPastDue = daysOverdue > 0 && row.saldo_pendiente > 0;
          return (
            <div className="flex flex-col">
              <span
                className={`text-xs font-bold ${isPastDue ? "text-red-600" : "text-slate-700"}`}
              >
                {new Date(value).toLocaleDateString("es-MX")}
              </span>
              {isPastDue && (
                <span className="text-[10px] text-red-500 font-black animate-pulse">
                  +{daysOverdue} DÍAS VENCIDO
                </span>
              )}
            </div>
          );
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white rounded-xl shadow-xl p-1"
            >
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(row);
                  setIsDetailSheetOpen(true);
                }}
                className="rounded-lg cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2 text-slate-600" /> Ver Detalle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  //  4. AL HACER CLIC, PASAMOS LA FACTURA COMO UN ARREGLO AL MODAL
                  setInvoicesToPay([row]);
                  setIsPaymentModalOpen(true);
                }}
                disabled={row.saldo_pendiente === 0}
                className={cn(
                  "cursor-pointer",
                  row.saldo_pendiente > 0
                    ? "text-emerald-700 font-bold rounded-lg"
                    : "rounded-lg",
                )}
              >
                <CreditCard className="h-4 w-4 mr-2" /> Registrar Cobro y REP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setInvoiceToDelete(row);
                  setIsDeleteDialogOpen(true);
                }}
                className="text-red-600 font-bold rounded-lg cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar Factura
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Cuentas por Cobrar (Tesorería)"
        description="Gestión de cartera, antigüedad de saldos y cobranza a clientes."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="border-emerald-500 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-black tracking-wide shadow-sm haptic-press transition-all"
            onClick={() => setIsImportXMLOpen(true)}
          >
            <FileCode2 className="h-4 w-4 mr-2 text-emerald-600" /> Cobro
            Automático (XML)
          </Button>

          <Button
            variant="outline"
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold haptic-press shadow-sm"
            onClick={handleExportToExcel}
          >
            <SheetIcon className="h-4 w-4 mr-2 text-emerald-600" /> Exportar a
            Excel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ActionButton
                size="md"
                className="bg-brand-navy hover:bg-brand-navy/90"
              >
                <Plus className="h-4 w-4 mr-2" /> Nueva Factura
              </ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl p-1 shadow-xl bg-white"
            >
              <DropdownMenuItem
                onClick={() => setIsImportModalOpen(true)}
                className="rounded-lg cursor-pointer py-2"
              >
                <FileInput className="h-4 w-4 mr-3 text-brand-navy" />{" "}
                <span className="font-medium">Importar desde Operaciones</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setImportedServices(undefined);
                  setIsCreateModalOpen(true);
                }}
                className="rounded-lg cursor-pointer py-2"
              >
                <Plus className="h-4 w-4 mr-3 text-slate-600" />{" "}
                <span className="font-medium">Crear Factura Manual</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* DASHBOARD DE ANTIGÜEDAD DE SALDOS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Corriente
              (Al Día)
            </p>
            <p className="text-2xl font-black text-slate-800">
              $
              {agingReport.corriente.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <Clock className="h-4 w-4 text-amber-500" /> Vencido 1-30 Días
            </p>
            <p className="text-2xl font-black text-amber-600">
              $
              {agingReport.vencido1_30.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-500" /> Vencido 31-60
              Días
            </p>
            <p className="text-2xl font-black text-orange-600">
              $
              {agingReport.vencido31_60.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-600 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <Ban className="h-4 w-4 text-red-500" /> Cartera Vencida (+90)
            </p>
            <p className="text-2xl font-black text-red-700">
              $
              {agingReport.incobrable.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABLA PRINCIPAL */}
      <Card className="shadow-lg border-slate-200 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <EnhancedDataTable
            data={invoices}
            columns={columns}
            exportFileName="cuentas_por_cobrar"
          />
        </CardContent>
      </Card>

      {/* =======================================================
          MODALES DE CUENTAS POR COBRAR
      ======================================================= */}
      <ImportServicesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        services={services}
        onImport={handleImportServices}
      />
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

      {/*  5. INTEGRAMOS EL NUEVO MODAL DE PAGOS MÚLTIPLES */}
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
        invoices={invoices}
      />

      <ImportXMLPaymentModal
        open={isImportXMLOpen}
        onOpenChange={setIsImportXMLOpen}
        onSuccess={fetchInvoices}
      />

      {/* DIÁLOGO DE ELIMINACIÓN */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-brand-navy font-black">
              ¿Eliminar Factura?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {invoiceToDelete &&
              invoiceToDelete.saldo_pendiente < invoiceToDelete.monto_total ? (
                <span className="text-red-600 font-bold bg-red-50 p-3 rounded-lg block mt-2 border border-red-200">
                  Error: Esta factura ya tiene abonos/pagos registrados. Por
                  auditoría fiscal, no es posible eliminarla. Cancele los pagos
                  primero.
                </span>
              ) : (
                <span className="block mt-2">
                  Esta acción no se puede deshacer. Se eliminará la factura{" "}
                  <strong>{invoiceToDelete?.folio_interno}</strong> del sistema.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            {invoiceToDelete &&
              invoiceToDelete.saldo_pendiente ===
                invoiceToDelete.monto_total && (
                <AlertDialogAction
                  onClick={handleDeleteInvoice}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                >
                  Sí, Eliminar
                </AlertDialogAction>
              )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
