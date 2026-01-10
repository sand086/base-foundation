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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { mockClients, type Client, type SubClienteDetalle } from "@/data/mockData";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; type: StatusType }> = {
  activo: { label: "Activo", type: "success" },
  pendiente: { label: "Pendiente", type: "warning" },
  incompleto: { label: "Incompleto", type: "danger" },
};

const getOperationBadge = (tipo: string) => {
  switch (tipo) {
    case "nacional":
      return (
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
          Nacional
        </Badge>
      );
    case "importación":
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          Import
        </Badge>
      );
    case "exportación":
      return (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
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
}

function ExpandableClientRow({ client, isExpanded, onToggle }: ExpandableClientRowProps) {
  return (
    <>
      <TableRow
        onClick={() => {
          if (client.subClientesDetalle.length > 0) onToggle();
        }}
        className={cn("hover:bg-muted/30 transition-colors cursor-pointer group", isExpanded && "bg-muted/20")}
      >
        <TableCell className="py-2 w-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              if (client.subClientesDetalle.length > 0) onToggle();
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
            <p className="font-medium text-sm text-slate-700">{client.razónSocial}</p>
            <p className="text-xs text-muted-foreground">{client.contactoPrincipal}</p>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm text-slate-700 py-2">{client.rfc}</TableCell>
        <TableCell className="text-center py-2">
          <Badge
            variant="secondary"
            className={cn(
              "font-medium cursor-pointer",
              client.subClientesDetalle.length > 0 && "bg-blue-100 text-blue-700 hover:bg-blue-200",
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (client.subClientesDetalle.length > 0) onToggle();
            }}
          >
            {client.subClientesDetalle.length}
          </Badge>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex flex-wrap gap-1">
            {client.tarifasActivas.length > 0 ? (
              client.tarifasActivas.slice(0, 2).map((tarifa, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tarifa}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">Sin tarifas</span>
            )}
            {client.tarifasActivas.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{client.tarifasActivas.length - 2}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2">
          <StatusBadge status={statusConfig[client.estatus as keyof typeof statusConfig].type}>
            {statusConfig[client.estatus as keyof typeof statusConfig].label}
          </StatusBadge>
        </TableCell>
        <TableCell className="text-right py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4 mr-2" /> Ver Detalle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableCell colSpan={7} className="p-0">
            <div className="px-12 py-4 border-l-4 border-l-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-slate-700">
                  Destinos de Entrega ({client.subClientesDetalle.length})
                </span>
              </div>

              <div className="grid gap-2">
                {client.subClientesDetalle.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-white transition-all",
                      "hover:shadow-sm hover:border-primary/30",
                      sub.estatus === "inactivo" && "opacity-60",
                    )}
                    style={{
                      animationDelay: `${idx * 50}ms`,
                      animation: "fadeIn 0.2s ease-out forwards",
                    }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {idx + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{sub.nombre}</p>
                          {sub.alias && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {sub.alias}
                            </Badge>
                          )}
                          {sub.estatus === "inactivo" && (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactivo
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {sub.direccion}, {sub.ciudad}, {sub.estado} {sub.codigoPostal}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {sub.contacto && (
                        <div className="text-right text-xs">
                          <p className="text-muted-foreground">{sub.contacto}</p>
                          {sub.telefono && (
                            <p className="flex items-center justify-end gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {sub.telefono}
                            </p>
                          )}
                        </div>
                      )}

                      {sub.horarioRecepcion && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {sub.horarioRecepcion}
                        </div>
                      )}

                      {getOperationBadge(sub.tipoOperacion)}
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

export default function ClientesCatalogo() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const filteredClients = mockClients.filter(
    (client) =>
      client.razónSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.rfc.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalClients = mockClients.length;
  const activeClients = mockClients.filter((c) => c.estatus === "activo").length;
  const totalSubClients = mockClients.reduce((acc, c) => acc + c.subClientesDetalle.length, 0);

  const toggleClientExpanded = (clientId: string) => {
    setExpandedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Gestión de Clientes" description="Administra clientes y sus destinos de entrega">
        <ActionButton onClick={() => navigate("/clientes/nuevo")}>
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </ActionButton>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-md">
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                <p className="text-2xl font-bold text-emerald-700">{activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-md">
                <MapPin className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Destinos</p>
                <p className="text-2xl font-bold text-blue-700">{totalSubClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Catálogo de Clientes</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por razón social o RFC..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
                  Razón Social
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-600 tracking-wider">RFC</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-600 tracking-wider text-center">
                  Destinos
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
                  Tarifas Activas
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-600 tracking-wider">Estatus</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-600 tracking-wider text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <ExpandableClientRow
                  key={client.id}
                  client={client}
                  isExpanded={expandedClients.has(client.id)}
                  onToggle={() => toggleClientExpanded(client.id)}
                />
              ))}
            </TableBody>
          </Table>

          {/* Footer hint */}
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            💡 Haz clic en la flecha o en el número de destinos para ver los subclientes
          </div>
        </CardContent>
      </Card>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
