import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { Client } from "@/types/api.types";
import { cn } from "@/lib/utils";

// --- CONFIGURACIÓN DE ESTADOS ---
const statusConfig: Record<string, { label: string; type: StatusType }> = {
  activo: { label: "Activo", type: "success" },
  pendiente: { label: "Pendiente", type: "warning" },
  incompleto: { label: "Incompleto", type: "danger" },
};

// --- BADGES ESTILO TAHOE ---
const getOperationBadge = (tipo: string) => {
  switch (tipo?.toLowerCase()) {
    case "nacional":
      return (
        <Badge
          variant="outline"
          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-emerald-200 shadow-sm"
        >
          Nacional
        </Badge>
      );
    case "importación":
      return (
        <Badge
          variant="outline"
          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border-blue-200 shadow-sm"
        >
          Import
        </Badge>
      );
    case "exportación":
      return (
        <Badge
          variant="outline"
          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border-amber-200 shadow-sm"
        >
          Export
        </Badge>
      );
    default:
      return null;
  }
};

// --- COMPONENTE DE FILA EXPANDIBLE ---
interface ExpandableClientRowProps {
  client: Client;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ExpandableClientRow({
  client,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: ExpandableClientRowProps) {
  const subClientes = client.sub_clients || [];
  const diasCredito = client.dias_credito || 0;
  const totalTarifas = subClientes.reduce(
    (acc, sub) => acc + (sub.tariffs?.length || 0),
    0,
  );

  return (
    <>
      <TableRow
        onClick={() => {
          if (subClientes.length > 0) onToggle();
        }}
        className={cn(
          "transition-colors duration-200 ease-out border-b border-white/10 dark:border-white/5 interactive-row",
          subClientes.length > 0
            ? "cursor-pointer hover:bg-white/50"
            : "hover:bg-transparent",
          isExpanded && "bg-white/60 dark:bg-white/10",
        )}
      >
        <TableCell className="py-4 w-10 pl-6">
          {subClientes.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-slate-200/50 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-brand-navy" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-navy" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="py-4">
          <div className="flex flex-col">
            <span className="font-black text-brand-navy text-sm uppercase tracking-tight leading-none">
              {client.razon_social}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {client.contacto_principal || "Sin contacto"}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
            {client.rfc}
          </span>
        </TableCell>
        <TableCell className="text-center py-4">
          <Badge
            variant="secondary"
            className={cn(
              "font-black text-[10px] uppercase tracking-widest border-none shadow-sm",
              subClientes.length > 0
                ? "bg-brand-navy text-white"
                : "bg-slate-100 text-slate-400",
            )}
          >
            {subClientes.length}
          </Badge>
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-black text-slate-600">
              {diasCredito} DÍAS
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <Badge
            variant="outline"
            className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-white/50"
          >
            {totalTarifas} Tarifas
          </Badge>
        </TableCell>
        <TableCell className="py-4">
          <StatusBadge
            status={
              statusConfig[
                client.estatus?.toLowerCase() as keyof typeof statusConfig
              ]?.type || "default"
            }
            className="text-[9px] font-black uppercase tracking-widest shadow-sm"
          >
            {statusConfig[client.estatus?.toLowerCase()]?.label ||
              client.estatus}
          </StatusBadge>
        </TableCell>
        <TableCell className="text-right py-4 pr-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/80 rounded-xl transition-all shadow-sm border border-slate-200/50 bg-white/50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-white/20 min-w-[160px] z-50"
            >
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4 text-blue-500" /> Editar Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" /> Eliminar Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* FILA EXPANDIDA (Destinos) */}
      {isExpanded && (
        <TableRow className="bg-slate-900/5 backdrop-blur-sm border-b border-white/10">
          <TableCell colSpan={8} className="p-0">
            <div className="px-14 py-6 border-l-4 border-l-brand-navy shadow-inner">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-brand-red" />
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
                  Destinos de Entrega Registrados ({subClientes.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subClientes.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 rounded-xl glass-card border border-white/40 bg-white/60 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-black text-xs uppercase tracking-tight text-slate-700">
                        {sub.nombre}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {sub.direccion}, {sub.ciudad}
                      </p>
                    </div>
                    {getOperationBadge(sub.tipo_operacion)}
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function ClientesCatalogo() {
  const navigate = useNavigate();
  const { clients, isLoading, deleteClient } = useClients();

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<number>>(
    new Set(),
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = clients.filter(
    (client) =>
      client.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.rfc.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeClients = clients.filter((c) => c.estatus === "activo").length;
  const totalSubClients = clients.reduce(
    (acc, c) => acc + (c.sub_clients?.length || 0),
    0,
  );

  const toggleClientExpanded = (clientId: number) => {
    setExpandedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) newSet.delete(clientId);
      else newSet.add(clientId);
      return newSet;
    });
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      const success = await deleteClient(clientToDelete.id);
      if (success) setClientToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="p-8 space-y-8 animate-page-enter">
      {/* 🚀 1. PAGE HEADER TAHOE */}
      <PageHeader
        title="Gestión de Clientes"
        description="Directorio comercial, destinos de entrega y control de tarifas operativas."
        icon={<Building2 className="h-8 w-8 text-brand-navy" />}
      >
        <Button
          onClick={() => navigate("/clients/nuevo")}
          className="btn-primary-gradient px-8 h-12 font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-brand-red/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </Button>
      </PageHeader>

      {/* 🚀 2. KPIs METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-navy/5 rounded-xl border border-brand-navy/10">
            <Building2 className="h-6 w-6 text-brand-navy" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Clientes
            </p>
            <p className="text-2xl font-black text-brand-navy leading-none mt-1">
              {clients.length}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cuentas Activas
            </p>
            <p className="text-2xl font-black text-emerald-600 leading-none mt-1">
              {activeClients}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Destinos
            </p>
            <p className="text-2xl font-black text-blue-600 leading-none mt-1">
              {totalSubClients}
            </p>
          </div>
        </Card>
      </div>

      {/* 🚀 3. TABLA LIQUID GLASS CON TOOLBAR */}
      <div className="space-y-4">
        {/* Toolbar de Búsqueda */}
        <div className="flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por Razón Social o RFC..."
              className="pl-10 h-11 glass-card border-slate-200 shadow-sm focus:ring-brand-red/20 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Contenedor de Tabla Cristal */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-sm shadow-xl liquid-glass-table">
          <div className="overflow-auto max-h-[60vh] custom-scrollbar">
            <Table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/5 border-b border-white/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-6"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                    Razón Social
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                    RFC
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 text-center">
                    Destinos
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                    Crédito
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                    Tarifas
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                    Estatus
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 text-right pr-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-staggered">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-red/50" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Cargando cartera de clientes...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="p-12 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400"
                    >
                      No se encontraron clientes que coincidan con la búsqueda
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <ExpandableClientRow
                      key={client.id}
                      client={client}
                      isExpanded={expandedClients.has(client.id)}
                      onToggle={() => toggleClientExpanded(client.id)}
                      onEdit={() => navigate(`/clients/${client.id}`)}
                      onDelete={() => {
                        setClientToDelete(client);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 🚀 4. ALERT DIALOG ELIMINAR (Hereda estilos del base UI) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar permanentemente a
              <strong className="text-brand-navy ml-1">
                {clientToDelete?.razon_social}
              </strong>
              .
              <br />
              <br />
              Esta acción borrará todo el historial, destinos asociados y
              configuración de tarifas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white border-none"
            >
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
