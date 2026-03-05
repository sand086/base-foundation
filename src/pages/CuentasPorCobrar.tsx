// src/pages/CuentasPorCobrar.tsx
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

// Feature components (Asegúrate de que las rutas a tus modales sean correctas)
import { ImportServicesModal } from "@/features/cxc/ImportServicesModal";
import { CreateInvoiceModal } from "@/features/cxc/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/cxc/InvoiceDetailSheet";
import { RegisterPaymentModal } from "@/features/cxc/RegisterPaymentModal";
import { AccountStatementModal } from "@/features/cxc/AccountStatementModal";
import {
  ReceivableInvoice,
  InvoicePayment,
  FinalizableService,
  getInvoiceStatusInfo,
  getAgingCategory,
  calculateDaysOverdue,
} from "@/features/cxc/types";

export default function CuentasPorCobrar() {
  const [invoices, setInvoices] = useState<ReceivableInvoice[]>([]);
  const [services, setServices] = useState<FinalizableService[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false);

  // Selected state
  const [selectedInvoice, setSelectedInvoice] =
    useState<ReceivableInvoice | null>(null);
  const [importedServices, setImportedServices] = useState<
    FinalizableService[] | undefined
  >();
  const [invoiceToDelete, setInvoiceToDelete] =
    useState<ReceivableInvoice | null>(null);

  // 🚀 CONEXIÓN AL BACKEND REAL
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Esta ruta la crearemos en el paso 2
      const response = await axiosClient.get("/receivables");

      // Mapear los datos del backend al formato que espera la tabla
      const formattedData = response.data.map((inv: any) => ({
        id: String(inv.id),
        folio: inv.folio_interno || `CXC-${inv.id}`,
        cliente: inv.client?.razon_social || "Cliente Desconocido",
        montoTotal: inv.monto_total,
        saldoPendiente: inv.saldo_pendiente,
        fechaEmision: inv.fecha_emision,
        fechaVencimiento: inv.fecha_vencimiento,
        estatus: inv.estatus,
        moneda: inv.moneda,
        requiereREP: inv.saldo_pendiente > 0, // Lógica básica para REP
        cobros: [], // Por ahora vacío hasta que implementes abonos
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

  // 🚀 GUSTAVO UX: EXPORTAR A EXCEL (CSV)
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
      const diasVencidos = calculateDaysOverdue(inv.fechaVencimiento);
      return [
        inv.folio,
        `"${inv.cliente}"`, // Comillas por si el cliente tiene comas
        inv.fechaEmision,
        inv.fechaVencimiento,
        inv.montoTotal,
        inv.saldoPendiente,
        inv.estatus.toUpperCase(),
        diasVencidos > 0 ? diasVencidos : 0,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    }); // \uFEFF es para que Excel lea los acentos (UTF-8)
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

  // Cálculo del Reporte de Antigüedad (Aging)
  const agingReport = useMemo(() => {
    const corriente = invoices
      .filter(
        (inv) =>
          getAgingCategory(inv) === "corriente" && inv.saldoPendiente > 0,
      )
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    const vencido1_30 = invoices
      .filter((inv) => getAgingCategory(inv) === "vencido_1_30")
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    const vencido31_60 = invoices
      .filter((inv) => getAgingCategory(inv) === "vencido_31_60")
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    const incobrable = invoices
      .filter((inv) => getAgingCategory(inv) === "incobrable")
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    return { corriente, vencido1_30, vencido31_60, incobrable };
  }, [invoices]);

  // Handlers para UI
  const handleImportServices = (selectedServices: FinalizableService[]) => {
    setImportedServices(selectedServices);
    setIsImportModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateInvoice = async (
    invoiceData: Omit<ReceivableInvoice, "id" | "folio" | "cobros" | "estatus">,
  ) => {
    // Aquí conectarías a axiosClient.post('/receivables', invoiceData)
    toast.info("Función de creación manual en desarrollo");
  };

  const handleRegisterPayment = async (invoiceId: string, payment: any) => {
    try {
      // 1. Enviamos el pago al backend
      await axiosClient.post(`/receivables/${invoiceId}/payments`, {
        monto: payment.monto,
        metodo_pago: payment.metodoPago || "TRANSFERENCIA",
        referencia: payment.referencia || "",
      });

      toast.success("¡Cobro Registrado!", {
        description: `Se abonaron $${payment.monto.toLocaleString("es-MX")} a la factura.`,
      });

      // 2. Cerramos el modal
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);

      // 3. Recargamos la tabla para que los números en Verde y los semáforos se actualicen solos
      fetchInvoices();
    } catch (error: any) {
      toast.error("Error al registrar el cobro", {
        description:
          error.response?.data?.detail ||
          "Verifica los datos y vuelve a intentar.",
      });
      console.error(error);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await axiosClient.delete(`/receivables/${invoiceToDelete.id}`);
      setInvoices(invoices.filter((inv) => inv.id !== invoiceToDelete.id));
      toast.success("Factura eliminada correctamente");
    } catch (error) {
      toast.error("Error al eliminar la factura");
    } finally {
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
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
            ${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
            <span className="text-[10px] text-muted-foreground">
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
              ${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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
          const isPastDue = daysOverdue > 0 && row.saldoPendiente > 0;
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
                className="rounded-lg"
              >
                <Eye className="h-4 w-4 mr-2 text-slate-400" /> Ver Detalle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(row);
                  setIsPaymentModalOpen(true);
                }}
                disabled={row.saldoPendiente === 0}
                className={
                  row.saldoPendiente > 0
                    ? "text-emerald-700 font-bold rounded-lg"
                    : "rounded-lg"
                }
              >
                <CreditCard className="h-4 w-4 mr-2" /> Registrar Cobro
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setInvoiceToDelete(row);
                  setIsDeleteDialogOpen(true);
                }}
                className="text-red-600 font-bold rounded-lg"
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
        <div className="flex items-center gap-3">
          {/* 🚀 BOTÓN GIGANTE PARA GUSTAVO: EXPORTAR A EXCEL */}
          <Button
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold"
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
                <Plus className="h-4 w-4 mr-3 text-slate-400" />{" "}
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
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
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
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
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
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
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
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
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

      {/* Modales Existentes (Mantenemos los que ya tenías) */}
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
      <RegisterPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        invoice={selectedInvoice}
        onSubmit={handleRegisterPayment}
      />
      <AccountStatementModal
        open={isAccountStatementOpen}
        onClose={() => setIsAccountStatementOpen(false)}
        invoices={invoices}
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
              invoiceToDelete.saldoPendiente < invoiceToDelete.montoTotal ? (
                <span className="text-red-600 font-bold bg-red-50 p-3 rounded-lg block mt-2 border border-red-200">
                  ⚠️ Error: Esta factura ya tiene abonos/pagos registrados. Por
                  auditoría fiscal, no es posible eliminarla. Cancele los pagos
                  primero.
                </span>
              ) : (
                <span className="block mt-2">
                  Esta acción no se puede deshacer. Se eliminará la factura{" "}
                  <strong>{invoiceToDelete?.folio}</strong> del sistema.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            {invoiceToDelete &&
              invoiceToDelete.saldoPendiente === invoiceToDelete.montoTotal && (
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
