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
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { useClients } from "@/features/clients/hooks/useClients";
import type { ClientResponse } from "@/api/generated";

type Client = ClientResponse & { estatus?: string };
import { cn } from "@/lib/utils";

// --- CONFIGURACIÓN DE ESTADOS ---
const statusConfig: Record<string, { label: string; type: StatusType }> = {
  activo: { label: "Activo", type: "success" },
  pendiente: { label: "Pendiente", type: "warning" },
  incompleto: { label: "Incompleto", type: "danger" },
};

// --- BADGES ESTILO TAHOE ---
const getOperationBadge = (tipo: string) => {
  const baseClass =
    "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm";
  switch (tipo?.toLowerCase()) {
    case "nacional":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
          )}
        >
          Nacional
        </Badge>
      );
    case "importacion":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
          )}
        >
          Import
        </Badge>
      );
    case "exportacion":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
          )}
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
          "transition-colors duration-200 ease-out border-b border-slate-100 dark:border-white/5 interactive-row",
          subClientes.length > 0
            ? "cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5"
            : "hover:bg-transparent",
          isExpanded && "bg-slate-50 dark:bg-white/10",
        )}
      >
        <TableCell className="py-4 w-10 pl-6">
          {subClientes.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-brand-navy dark:text-slate-300" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-navy dark:group-hover:text-white" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="py-4">
          <div className="flex flex-col">
            <span className="font-black text-brand-navy dark:text-white text-sm uppercase tracking-tight leading-none">
              {client.razon_social}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              {client.contacto_principal || "Sin contacto"}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
            {client.rfc}
          </span>
        </TableCell>
        <TableCell className="text-center py-4">
          <Badge
            variant="secondary"
            className={cn(
              "font-black text-[10px] uppercase tracking-widest border border-transparent shadow-sm",
              subClientes.length > 0
                ? "bg-brand-navy text-white dark:bg-slate-700 dark:text-white"
                : "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600 dark:border-white/10",
            )}
          >
            {subClientes.length}
          </Badge>
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-black text-slate-600 dark:text-slate-300">
              {diasCredito} DÍAS
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <Badge
            variant="outline"
            className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10"
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
                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                Editar Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
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
        <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-white/10">
          <TableCell colSpan={8} className="p-0">
            <div className="px-6 py-6 border-l-4 border-l-brand-navy dark:border-l-blue-500 shadow-inner">
              <div className="flex items-center gap-2 mb-4 ml-8">
                <MapPin className="h-4 w-4 text-brand-red dark:text-brand-red/80" />
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy dark:text-slate-300">
                  Destinos de Entrega Registrados ({subClientes.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-8">
                {subClientes.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex-1 overflow-hidden pr-4">
                      <p className="font-black text-xs uppercase tracking-tight text-slate-700 dark:text-slate-200 truncate">
                        {sub.nombre}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                        {sub.direccion}, {sub.ciudad}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {getOperationBadge(sub.tipo_operacion)}
                    </div>
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
export default function ClientsCatalog() {
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
    <div className="p-4 md:p-8 space-y-8 animate-page-enter">
      {/*  1. PAGE HEADER TAHOE */}
      <PageHeader
        title="Gestión de Clientes"
        description="Directorio comercial, destinos de entrega y control de tarifas operativas."
        icon={<Building2 className="h-8 w-8 text-brand-navy dark:text-white" />}
      >
        <Button
          variant="default"
          size="lg"
          onClick={() => navigate("/clients/nuevo")}
          className="haptic-press shadow-lg shadow-brand-red/20 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </Button>
      </PageHeader>

      {/*  2. KPIs METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-default"
        >
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Building2 className="h-6 w-6 text-brand-navy dark:text-slate-300" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Total Clientes
            </p>
            <p className="text-3xl font-black text-brand-navy dark:text-white leading-none tracking-tighter">
              {clients.length}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Cuentas Activas
            </p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none tracking-tighter">
              {activeClients}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Total Destinos
            </p>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400 leading-none tracking-tighter">
              {totalSubClients}
            </p>
          </div>
        </Card>
      </div>

      {/*  3. TABLA LIQUID GLASS CON TOOLBAR */}
      <div className="space-y-4">
        {/* Toolbar de Búsqueda */}
        <div className="flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por Razón Social o RFC..."
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm focus:ring-brand-red/20 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Contenedor de Tabla Cristal (Homologado) */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm shadow-xl liquid-glass-table">
          <div className="overflow-auto max-h-[60vh] custom-scrollbar">
            <Table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-20 backdrop-blur-xl bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-10 pl-6"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                    Razón Social
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                    RFC
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12 text-center">
                    Destinos
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                    Crédito
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                    Tarifas
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                    Estatus
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12 text-right pr-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-staggered">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-red/50 dark:text-brand-red" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                          Cargando cartera de clientes...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
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
                      onEdit={() => navigate(`/clients/edit/${client.id}`)}
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

      {/*  4. ALERT DIALOG ELIMINAR (Estructura Triple Tahoe) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                  Confirmar Eliminación
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                  Acción Irreversible • Catálogo Clientes
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás a punto de eliminar permanentemente a{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase">
                  {clientToDelete?.razon_social}
                </b>
                .
              </p>

              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Configuración
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción borrará todo el historial, los{" "}
                  <b className="font-black underline">
                    {clientToDelete?.sub_clients?.length || 0} destinos
                    asociados
                  </b>{" "}
                  y su configuración de tarifas logísticas.{" "}
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
                className="w-full sm:w-auto haptic-press flex-shrink-0"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={confirmDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Sí, Eliminar Cliente
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
