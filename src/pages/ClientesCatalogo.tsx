import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Phone,
  Clock,
  AlertTriangle,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
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
import { useClients } from "@/hooks/useClients"; // Hook Real
import { Client } from "@/types/api.types"; // Tipos Reales
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; type: StatusType }> = {
  activo: { label: "Activo", type: "success" },
  pendiente: { label: "Pendiente", type: "warning" },
  incompleto: { label: "Incompleto", type: "danger" },
};

// ... getOperationBadge se mantiene igual ...
const getOperationBadge = (tipo: string) => {
  switch (tipo?.toLowerCase()) {
    case "nacional":
      return (
        <Badge
          variant="outline"
          className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          Nacional
        </Badge>
      );
    case "importación":
      return (
        <Badge
          variant="outline"
          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
        >
          Import
        </Badge>
      );
    case "exportación":
      return (
        <Badge
          variant="outline"
          className="text-xs bg-amber-50 text-amber-700 border-amber-200"
        >
          Export
        </Badge>
      );
    default:
      return null;
  }
};

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
  // Adaptamos las propiedades que vienen del backend
  const subClientes = client.sub_clients || [];
  const diasCredito = client.dias_credito || 0;

  // Calculamos tarifas activas para mostrar en la tabla principal
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
          "hover:bg-muted/30 transition-colors cursor-pointer group",
          isExpanded && "bg-muted/20",
        )}
      >
        <TableCell className="py-2 w-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              if (subClientes.length > 0) onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            )}
          </Button>
        </TableCell>
        <TableCell className="py-2">
          <div>
            <p className="font-medium text-sm text-slate-700">
              {client.razon_social}
            </p>
            <p className="text-xs text-muted-foreground">
              {client.contacto_principal || "Sin contacto"}
            </p>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm text-slate-700 py-2">
          {client.rfc}
        </TableCell>
        <TableCell className="text-center py-2">
          <Badge
            variant="secondary"
            className={cn(
              "font-medium",
              subClientes.length > 0 && "bg-blue-100 text-blue-700",
            )}
          >
            {subClientes.length}
          </Badge>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">{diasCredito}</span>
            <span className="text-xs text-muted-foreground">días</span>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <Badge variant="outline" className="text-xs">
            {totalTarifas} Tarifas
          </Badge>
        </TableCell>
        <TableCell className="py-2">
          <StatusBadge
            status={
              statusConfig[
                client.estatus?.toLowerCase() as keyof typeof statusConfig
              ]?.type || "default"
            }
          >
            {statusConfig[client.estatus?.toLowerCase()]?.label ||
              client.estatus}
          </StatusBadge>
        </TableCell>
        <TableCell className="text-right py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableCell colSpan={9} className="p-0">
            <div className="px-12 py-4 border-l-4 border-l-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-slate-700">
                  Destinos de Entrega ({subClientes.length})
                </span>
              </div>
              <div className="grid gap-2">
                {subClientes.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sub.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.direccion}, {sub.ciudad}, {sub.estado}
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

export default function ClientesCatalogo() {
  const navigate = useNavigate();
  // HOOK REAL: Datos directos de la BD
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
  // Calculamos total subclientes con la nueva estructura
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
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Clientes"
        description="Administra clients, destinos de entrega y tarifas comerciales"
      >
        <ActionButton onClick={() => navigate("/clients/nuevo")}>
          <Plus className="h-4 w-4" /> Nuevo Client
        </ActionButton>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-md">
              <Users className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-emerald-700">
                {activeClients}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-md">
              <MapPin className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Destinos</p>
              <p className="text-2xl font-bold text-blue-700">
                {totalSubClients}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Catálogo</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead className="text-center">Destinos</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead>Tarifas</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No se encontraron clients
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
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <b>{clientToDelete?.razon_social}</b>{" "}
              y todos sus destinos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
