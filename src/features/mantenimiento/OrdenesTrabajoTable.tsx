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
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

// --- IMPORTS REALES ---
import { useMaintenance } from "@/hooks/useMaintenance";
import { WorkOrder } from "@/services/maintenanceService";
import { WorkOrderModal } from "./WorkOrderModal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const OrdenesTrabajoTable = () => {
  // 1. Usar Hook Real
  const { workOrders, createWorkOrder } = useMaintenance();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // States
  const [orderToView, setOrderToView] = useState<WorkOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<WorkOrder | null>(null);

  // Helpers visuales
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

  // Definir columnas (Mapeo de snake_case a UI)
  const columns: ColumnDef<WorkOrder>[] = useMemo(
    () => [
      {
        key: "status_icon", // Usamos status para el icono
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
        key: "unit_numero", // Viene del backend flatten
        header: "Unidad",
        sortable: true,
        render: (value) => (
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {value ? `ECO-${value}` : "N/A"}
          </span>
        ),
      },
      {
        key: "mechanic_nombre", // Viene del backend flatten
        header: "Mecánico Asignado",
        sortable: true,
        render: (value) => (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {value || "Sin Asignar"}
          </span>
        ),
      },
      {
        key: "descripcion_problema", // snake_case
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
        key: "fecha_apertura", // snake_case
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
        key: "parts", // Array de partes
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
        key: "status",
        header: "Estatus",
        type: "status",
        statusOptions: ["abierta", "en_progreso", "cerrada", "cancelada"],
        sortable: true,
        render: (value) => getStatusBadge(value as string),
      },
      {
        key: "actions", // ID para acciones
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
                <DropdownMenuItem
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                  onClick={() => setOrderToView(order)}
                >
                  <Eye className="h-4 w-4 text-brand-navy dark:text-slate-400" />{" "}
                  Ver detalles
                </DropdownMenuItem>
                {/* Edición futura */}
                {/* <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800" onClick={() => handleEdit(order)}>
                  <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" /> Editar
                </DropdownMenuItem> */}
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
      {/* 🚀 TABLA PRINCIPAL (Liquid Glass Tahoe) */}
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
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </CardHeader>
        {/* Inyección CSS para la cabecera de la tabla */}
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          <EnhancedDataTable
            data={workOrders}
            columns={columns}
            exportFileName="ordenes-trabajo"
            className="border-none"
          />
        </CardContent>
      </Card>

      {/* Work Order Modal (Create/Edit) */}
      <WorkOrderModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setOrderToEdit(null);
        }}
        // Pasamos la función del hook para crear
        onCreate={createWorkOrder}
      />

      {/* 🚀 MODAL DE VISTA (Read Only Detail - Estructura Triple Tahoe) */}
      <Dialog
        open={!!orderToView}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOrderToView(null);
        }}
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
              {/* Badge de estado en el header */}
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
                {/* Metadatos Superiores */}
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
                        {
                          locale: es,
                        },
                      ).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Unidad y Mecánico */}
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

                {/* Descripción */}
                <div className="p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                    Descripción del Problema
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {orderToView.descripcion_problema}
                  </p>
                </div>

                {/* Refacciones */}
                {orderToView.parts && orderToView.parts.length > 0 && (
                  <div className="p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Refacciones Utilizadas ({orderToView.parts.length})
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

          {/* FOOTER */}
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
    </div>
  );
};
