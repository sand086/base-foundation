import { useState } from "react";
import { Search, Plus, Wrench, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
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

export const OrdenesTrabajoTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [workOrders] = useState<WorkOrder[]>(mockWorkOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <ActionButton onClick={() => setIsModalOpen(true)}>
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
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filteredOrders.map((order) => (
            <DataTableRow key={order.id}>
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
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Work Order Modal */}
      <WorkOrderModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};
