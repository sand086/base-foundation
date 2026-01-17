import { useState } from "react";
import { Search, Plus, Wrench, Clock, CheckCircle, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { mockWorkOrders, WorkOrder } from "@/data/mantenimientoData";
import { WorkOrderModal } from "./WorkOrderModal";
import { toast } from "sonner";

export const OrdenesTrabajoTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(mockWorkOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // CRUD modal states
  const [orderToView, setOrderToView] = useState<WorkOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<WorkOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const filteredOrders = workOrders.filter(
    (order) =>
      order.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.unidadNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.mecanicoNombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: WorkOrder["status"]) => {
    switch (status) {
      case "abierta":
        return <StatusBadge status="warning">Abierta</StatusBadge>;
      case "en_progreso":
        return <StatusBadge status="info">En Progreso</StatusBadge>;
      case "cerrada":
        return <StatusBadge status="success">Cerrada</StatusBadge>;
      default:
        return <StatusBadge status="info">{status}</StatusBadge>;
    }
  };

  const getStatusIcon = (status: WorkOrder["status"]) => {
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

  const handleDelete = () => {
    if (!orderToDelete) return;
    const order = workOrders.find(o => o.id === orderToDelete);
    setWorkOrders(prev => prev.filter(o => o.id !== orderToDelete));
    toast.success('Orden eliminada', {
      description: `${order?.folio} ha sido eliminada.`,
    });
    setOrderToDelete(null);
  };

  const handleEdit = (order: WorkOrder) => {
    setOrderToEdit(order);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar folio, unidad o mecánico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ActionButton onClick={() => {
          setOrderToEdit(null);
          setIsModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Abrir Orden de Trabajo
        </ActionButton>
      </div>

      {/* Table */}
      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-12"></DataTableHead>
            <DataTableHead>Folio</DataTableHead>
            <DataTableHead>Unidad</DataTableHead>
            <DataTableHead>Mecánico Asignado</DataTableHead>
            <DataTableHead className="min-w-[200px]">Descripción</DataTableHead>
            <DataTableHead>Fecha Apertura</DataTableHead>
            <DataTableHead>Fecha Cierre</DataTableHead>
            <DataTableHead>Partes</DataTableHead>
            <DataTableHead>Estatus</DataTableHead>
            <DataTableHead className="text-center">Acciones</DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filteredOrders.map((order) => (
            <DataTableRow key={order.id} className="group">
              <DataTableCell>{getStatusIcon(order.status)}</DataTableCell>
              <DataTableCell className="font-mono text-sm font-medium text-slate-800">
                {order.folio}
              </DataTableCell>
              <DataTableCell className="font-semibold text-slate-800">
                {order.unidadNumero}
              </DataTableCell>
              <DataTableCell className="text-slate-700">
                {order.mecanicoNombre}
              </DataTableCell>
              <DataTableCell className="text-slate-600 text-sm">
                {order.descripcionProblema}
              </DataTableCell>
              <DataTableCell className="text-slate-600">
                {order.fechaApertura}
              </DataTableCell>
              <DataTableCell className="text-slate-600">
                {order.fechaCierre || "—"}
              </DataTableCell>
              <DataTableCell className="text-slate-600">
                {order.partes.length > 0 ? (
                  <span className="text-sm">
                    {order.partes.length} refacción{order.partes.length !== 1 ? "es" : ""}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </DataTableCell>
              <DataTableCell>{getStatusBadge(order.status)}</DataTableCell>
              <DataTableCell>
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem className="gap-2" onClick={() => setOrderToView(order)}>
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => handleEdit(order)}>
                        <Edit className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        onClick={() => setOrderToDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Work Order Modal */}
      <WorkOrderModal 
        open={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setOrderToEdit(null);
        }} 
      />

      {/* View Order Modal */}
      <Dialog open={!!orderToView} onOpenChange={() => setOrderToView(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Detalle de Orden de Trabajo
            </DialogTitle>
            <DialogDescription>
              {orderToView?.folio}
            </DialogDescription>
          </DialogHeader>

          {orderToView && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(orderToView.status)}
                <span className="text-sm text-muted-foreground">
                  {orderToView.fechaApertura}
                  {orderToView.fechaCierre && ` → ${orderToView.fechaCierre}`}
                </span>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Unidad</p>
                  <p className="font-mono font-bold">{orderToView.unidadNumero}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Mecánico</p>
                  <p className="font-medium">{orderToView.mecanicoNombre}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Descripción del Problema</p>
                <p className="text-sm">{orderToView.descripcionProblema}</p>
              </div>

              {orderToView.partes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Refacciones Utilizadas</p>
                  <div className="space-y-1">
                    {orderToView.partes.map((parte, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <Badge variant="outline" className="font-mono">{parte.sku}</Badge>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la orden{' '}
              <span className="font-semibold">
                {workOrders.find(o => o.id === orderToDelete)?.folio}
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
