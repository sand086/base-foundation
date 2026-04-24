import { useState, useMemo } from "react";
import {
  Plus,
  Wrench,
  Clock,
  CheckCircle,
  Eye,
  MoreHorizontal,
  XCircle,
  FileText,
  Calendar as CalendarIcon,
  User,
  Truck,
  Package,
  Trash2,
  Edit,
  Receipt,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

// --- IMPORTS REALES ---
import { useMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { WorkOrder } from "@/features/maintenance/types";
import { WorkOrderModal } from "./WorkOrderModal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

export const WorkOrdersTable = () => {
  // 1. Usar Hook Real (Asegúrate de exponer deleteWorkOrder y updateWorkOrder en tu hook)
  const {
    workOrders,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    updateOrderStatus,
  } = useMaintenance();

  // Estados de los Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<WorkOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<WorkOrder | null>(null);

  // Estados para Acciones Críticas
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [orderToClose, setOrderToClose] = useState<WorkOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- HELPERS VISUALES ---
  const getStatusBadge = (status: string) => {
    const baseClass =
      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm";
    switch (status?.toLowerCase()) {
      case "abierta":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
            )}
          >
            Abierta
          </Badge>
        );
      case "en_progreso":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
            )}
          >
            En Progreso
          </Badge>
        );
      case "cerrada":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
            )}
          >
            Cerrada
          </Badge>
        );
      case "cancelada":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
            )}
          >
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10",
            )}
          >
            {status}
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "abierta":
        return <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      case "en_progreso":
        return <Wrench className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case "cerrada":
        return (
          <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
        );
      case "cancelada":
        return <XCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  // --- HANDLERS ---
  const handleSave = async (data: any) => {
    let success = false;
    if (orderToEdit) {
      success = await updateWorkOrder(orderToEdit.id, data);
    } else {
      success = await createWorkOrder(data);
    }
    if (success) {
      setIsModalOpen(false);
      setOrderToEdit(null);
    }
    return success;
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    setIsProcessing(true);
    await deleteWorkOrder(orderToDelete);
    setIsProcessing(false);
    setOrderToDelete(null);
  };

  const handleCloseOrder = async () => {
    if (!orderToClose) return;
    setIsProcessing(true);

    try {
      // 1. Cerramos la orden de trabajo para que ya no se pueda editar
      await updateOrderStatus(orderToClose.id, "cerrada");

      // 2. Calculamos el costo total a mandar a finanzas
      const costoTotal =
        orderToClose.parts?.reduce(
          (acc, p) => acc + p.cantidad * p.costo_unitario_snapshot,
          0,
        ) || 0;

      // 3.   CREAMOS LA CUENTA POR PAGAR (CxP)
      // OJO: Los nombres de estas propiedades deben coincidir exactamente
      // con tu esquema PayableInvoiceCreate en FastAPI.
      const payloadCxP = {
        supplier_id: orderToClose.mechanic_id, // El ID del mecánico/taller (Debe existir en la tabla suppliers)
        folio_interno: `OT-${orderToClose.folio}`, // Usamos el folio de la orden
        monto_total: costoTotal,
        saldo_pendiente: costoTotal,
        fecha_emision: new Date().toISOString().split("T")[0], // "YYYY-MM-DD"
        concepto: `Liquidación de Orden de Trabajo: ${orderToClose.descripcion_problema || "Mantenimiento"}`,
        estatus: "pendiente", // O el default que use tu backend
        moneda: "MXN",
      };

      // Hacemos el POST al endpoint que descubrimos en tu código de FastAPI
      await axiosClient.post("/api/suppliers/invoices", payloadCxP);

      toast.success("¡Orden Finalizada!", {
        description:
          "La orden se cerró y la factura de proveedor se envió a Tesorería.",
      });
    } catch (error: any) {
      console.error("Error al generar la CxP:", error);
      // Si el backend rechaza el payload, mostramos el error exacto
      const errMsg =
        error.response?.data?.detail || "Fallo la integración con CxP.";
      toast.error("Orden cerrada con advertencia", {
        description: `La orden se cerró, pero la CxP falló: ${errMsg}`,
      });
    } finally {
      setIsProcessing(false);
      setOrderToClose(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (
      confirm(
        "¿Estás seguro de CANCELAR esta orden? Las refacciones regresarán automáticamente al almacén.",
      )
    ) {
      await updateOrderStatus(orderId, "cancelada");
    }
  };

  // --- DEFINICIÓN DE COLUMNAS ---
  const columns: ColumnDef<WorkOrder>[] = useMemo(
    () => [
      {
        key: "status_icon",
        header: "",
        sortable: false,
        width: "w-10",
        render: (_, order) => (
          <div className="flex justify-center">
            {getStatusIcon(order.status)}
          </div>
        ),
      },
      {
        key: "folio",
        header: "Folio",
        sortable: true,
        render: (value) => (
          <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
            {value}
          </span>
        ),
      },
      {
        key: "unit_numero",
        header: "Unidad",
        sortable: true,
        render: (value) => (
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {value ? `ECO-${value}` : "N/A"}
          </span>
        ),
      },
      {
        key: "mechanic_nombre",
        header: "Mecánico Asignado",
        sortable: true,
        render: (value) => (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {value || "Sin Asignar"}
          </span>
        ),
      },
      {
        key: "descripcion_problema",
        header: "Descripción",
        width: "min-w-[200px]",
        sortable: true,
        render: (value) => (
          <span
            className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate block max-w-[200px]"
            title={value as string}
          >
            {value}
          </span>
        ),
      },
      {
        key: "fecha_apertura",
        header: "Apertura",
        type: "date",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            {value
              ? format(new Date(value as string), "dd MMM yyyy", {
                  locale: es,
                }).toUpperCase()
              : "-"}
          </span>
        ),
      },
      {
        key: "parts",
        header: "Refacciones",
        sortable: false,
        render: (value: any[]) =>
          value && value.length > 0 ? (
            <Badge
              variant="secondary"
              className="font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {value.length} items
            </Badge>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 italic">
              —
            </span>
          ),
      },
      {
        key: "total_cost",
        header: "Costo Total",
        sortable: true,
        render: (_, order) => {
          // Calculamos el costo sumando cantidad * snapshot de cada parte
          const total =
            order.parts?.reduce(
              (acc, p) => acc + p.cantidad * p.costo_unitario_snapshot,
              0,
            ) || 0;
          return (
            <span className="font-mono font-black text-xs text-slate-700 dark:text-slate-300">
              {formatCurrency(total, "MXN")}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Estatus",
        type: "status",
        statusOptions: ["abierta", "en_progreso", "cerrada", "cancelada"],
        sortable: true,
        render: (value) => getStatusBadge(value as string),
      },
      {
        key: "actions",
        header: "Acciones",
        sortable: false,
        width: "w-[80px]",
        render: (_, order) => (
          <div
            className="flex justify-end pr-2"
            onClick={(e) => e.stopPropagation()}
          >
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
                {/* VER DETALLES */}
                <DropdownMenuItem
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                  onClick={() => setOrderToView(order)}
                >
                  <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                  Ver detalles
                </DropdownMenuItem>

                {/* EDITAR */}
                {order.status !== "cerrada" && order.status !== "cancelada" && (
                  <DropdownMenuItem
                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                    onClick={() => {
                      setOrderToEdit(order);
                      setIsModalOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 text-brand-green dark:text-[#009740]" />{" "}
                    Editar Orden
                  </DropdownMenuItem>
                )}

                {/* FINALIZAR / ENVIAR A CXP */}
                {order.status !== "cerrada" && order.status !== "cancelada" && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-900/30"
                      onClick={() => setOrderToClose(order)}
                    >
                      <Receipt className="h-4 w-4" /> Cerrar y Facturar (CxP)
                    </DropdownMenuItem>
                  </>
                )}

                {/* CANCELAR */}
                {order.status !== "cerrada" && order.status !== "cancelada" && (
                  <DropdownMenuItem
                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-900/30"
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    <XCircle className="h-4 w-4" /> Cancelar
                  </DropdownMenuItem>
                )}

                {/* ELIMINAR (Solo si está cancelada o es administrador) */}
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-900/30"
                  onClick={() => setOrderToDelete(order.id)}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar Permanente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* TABLA PRINCIPAL (Liquid Glass Tahoe) */}
      <Card
        variant="default"
        className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden"
      >
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-5 px-6 gap-4">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
            <Wrench className="h-6 w-6 text-brand-red" /> Control de Órdenes
          </CardTitle>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setOrderToEdit(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto haptic-press shadow-md shadow-brand-red/20"
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Orden
          </Button>
        </CardHeader>
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          <EnhancedDataTable
            data={workOrders}
            columns={columns}
            exportFileName="ordenes-trabajo"
            className="border-none"
          />
        </CardContent>
      </Card>

      {/* MODAL CREAR/EDITAR (Reutilizado) */}
      <WorkOrderModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setOrderToEdit(null);
        }}
        orderToEdit={orderToEdit as any}
        onCreate={handleSave}
      />

      {/* MODAL DE VISTA (Read Only Detail) */}
      <Dialog
        open={!!orderToView}
        onOpenChange={(isOpen) => !isOpen && setOrderToView(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
          <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
                  <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                    {orderToView?.folio}
                  </DialogTitle>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                    Detalle de Orden de Trabajo
                  </p>
                </div>
              </div>
              {orderToView && (
                <div className="hidden sm:block">
                  {getStatusBadge(orderToView.status)}
                </div>
              )}
            </div>
          </DialogHeader>

          {orderToView && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="sm:hidden">
                    {getStatusBadge(orderToView.status)}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="font-mono text-sm font-bold">
                      {format(
                        new Date(orderToView.fecha_apertura),
                        "dd MMM yyyy",
                        { locale: es },
                      ).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                      <Truck className="h-3.5 w-3.5" /> Unidad
                    </div>
                    <p className="font-black text-brand-navy dark:text-white uppercase tracking-tight text-lg">
                      {orderToView.unit_numero
                        ? `ECO-${orderToView.unit_numero}`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                      <User className="h-3.5 w-3.5" /> Mecánico
                    </div>
                    <p
                      className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 truncate"
                      title={orderToView.mechanic_nombre}
                    >
                      {orderToView.mechanic_nombre || "Sin Asignar"}
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                    Descripción del Problema
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {orderToView.descripcion_problema}
                  </p>
                </div>

                {orderToView.parts && orderToView.parts.length > 0 && (
                  <div className="p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                      <Package className="h-4 w-4 text-blue-500" /> Refacciones
                      Utilizadas ({orderToView.parts.length})
                    </p>
                    <div className="space-y-2">
                      {orderToView.parts.map((parte, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-white/5"
                        >
                          <Badge
                            variant="outline"
                            className="font-mono font-bold bg-white dark:bg-slate-900 shadow-sm text-xs border-slate-200 dark:border-white/10"
                          >
                            {parte.item_sku}
                          </Badge>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            x{parte.cantidad}{" "}
                            {parte.cantidad === 1 ? "PZA" : "PZAS"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex w-full justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setOrderToView(null)}
                className="w-full sm:w-auto haptic-press"
              >
                Cerrar Detalles
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ALERT DIALOG PARA FINALIZAR Y ENVIAR A CXP --- */}
      <AlertDialog
        open={!!orderToClose}
        onOpenChange={(open) => !open && setOrderToClose(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 dark:from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-emerald-200 dark:border-emerald-500/20">
                <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-emerald-700 dark:text-emerald-400 heading-crisp leading-none">
                  Cerrar Orden
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Integración con Cuentas por Pagar
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                Al finalizar esta orden de trabajo, los costos asociados a
                refacciones externas y mano de obra de terceros{" "}
                <b className="font-black">
                  se enviarán automáticamente al módulo de Cuentas por Pagar
                  (Proveedores)
                </b>{" "}
                para su liquidación.
              </p>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                    Acción Permanente
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                  Esta acción cerrará la orden y{" "}
                  <b className="font-black underline">no se podrá editar</b>.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="default"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  handleCloseOrder();
                }}
                disabled={isProcessing}
                className="w-full sm:w-auto haptic-press flex-shrink-0 border-none bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] shadow-md"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirmar y Enviar a CxP
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- ALERT DIALOG PARA ELIMINAR --- */}
      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 dark:from-rose-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Eliminar Orden
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Acción Irreversible • Mantenimiento
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                ¿Estás seguro de querer eliminar esta orden de trabajo?
              </p>

              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Datos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Se borrará todo su historial y registro de sistema de forma
                  permanente.{" "}
                  <b className="font-black">Esta acción no se puede deshacer</b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isProcessing}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar Permanentemente
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
