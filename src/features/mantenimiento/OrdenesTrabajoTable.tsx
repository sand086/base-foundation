import { useState, useMemo } from "react";
import {
  Plus,
  Wrench,
  Clock,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

export const OrdenesTrabajoTable = () => {
  // 1. Usar Hook Real
  const { workOrders, createWorkOrder } = useMaintenance();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // States
  const [orderToView, setOrderToView] = useState<WorkOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<WorkOrder | null>(null);

  // Helpers visuales
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "abierta":
        return <StatusBadge status="warning">Abierta</StatusBadge>;
      case "en_progreso":
        return <StatusBadge status="info">En Progreso</StatusBadge>;
      case "cerrada":
        return <StatusBadge status="success">Cerrada</StatusBadge>;
      case "cancelada":
        return <StatusBadge status="danger">Cancelada</StatusBadge>;
      default:
        return <StatusBadge status="default">{status}</StatusBadge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "abierta":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "en_progreso":
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case "cerrada":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default:
        return null;
    }
  };

  // Definir columnas (Mapeo de snake_case a UI)
  const columns: ColumnDef<WorkOrder>[] = useMemo(
    () => [
      {
        key: "status_icon", // Usamos status para el icono
        header: "",
        sortable: false,
        width: "w-12",
        render: (val, order) => getStatusIcon(order.status),
      },
      {
        key: "folio",
        header: "Folio",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm font-medium text-foreground">
            {value}
          </span>
        ),
      },
      {
        key: "unit_numero", // Viene del backend flatten
        header: "Unidad",
        sortable: true,
        render: (value) => (
          <span className="font-semibold text-foreground">
            {value || "N/A"}
          </span>
        ),
      },
      {
        key: "mechanic_nombre", // Viene del backend flatten
        header: "Mecánico",
        sortable: true,
        render: (value) => (
          <span className="text-foreground">{value || "Sin Asignar"}</span>
        ),
      },
      {
        key: "descripcion_problema", // snake_case
        header: "Descripción",
        width: "min-w-[200px]",
        sortable: true,
        render: (value) => (
          <span className="text-muted-foreground text-sm truncate block max-w-[200px]">
            {value}
          </span>
        ),
      },
      {
        key: "fecha_apertura", // snake_case
        header: "Fecha Apertura",
        type: "date",
        sortable: true,
        render: (value) => (
          <span className="text-muted-foreground">
            {value
              ? format(new Date(value as string), "dd/MM/yyyy", { locale: es })
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
            <span className="text-sm text-foreground">
              {value.length} refacción{value.length !== 1 ? "es" : ""}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        key: "status",
        header: "Estatus",
        type: "status",
        statusOptions: ["abierta", "en_progreso", "cerrada"],
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
            className="flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => setOrderToView(order)}
                >
                  <Eye className="h-4 w-4" /> Ver detalles
                </DropdownMenuItem>
                {/* Edición futura */}
                {/* <DropdownMenuItem className="gap-2" onClick={() => handleEdit(order)}>
                <Edit className="h-4 w-4" /> Editar
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
    <div className="space-y-4">
      {/* Toolbar Button */}
      <div className="flex justify-end">
        <ActionButton
          onClick={() => {
            setOrderToEdit(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Abrir Orden de Trabajo
        </ActionButton>
      </div>

      {/* EnhancedDataTable */}
      <EnhancedDataTable
        data={workOrders}
        columns={columns}
        exportFileName="ordenes-trabajo"
      />

      {/* Work Order Modal (Create) */}
      <WorkOrderModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setOrderToEdit(null);
        }}
        // Pasamos la función del hook para crear
        onCreate={createWorkOrder}
      />

      {/* View Order Modal (Read Only Detail) */}
      <Dialog open={!!orderToView} onOpenChange={() => setOrderToView(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Detalle de Orden de Trabajo
            </DialogTitle>
            <DialogDescription>{orderToView?.folio}</DialogDescription>
          </DialogHeader>

          {orderToView && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(orderToView.status)}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(orderToView.fecha_apertura), "PPP", {
                    locale: es,
                  })}
                </span>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Unidad</p>
                  <p className="font-mono font-bold">
                    {orderToView.unit_numero}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Mecánico</p>
                  <p className="font-medium">{orderToView.mechanic_nombre}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Descripción del Problema
                </p>
                <p className="text-sm">{orderToView.descripcion_problema}</p>
              </div>

              {orderToView.parts && orderToView.parts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Refacciones Utilizadas</p>
                  <div className="space-y-1">
                    {orderToView.parts.map((parte, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-muted/30 rounded"
                      >
                        <Badge variant="outline" className="font-mono">
                          {parte.item_sku}
                        </Badge>
                        <span className="text-sm">x{parte.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
