import { useState } from "react";
import { Users, Plus, Search, Building2, MapPin, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { mockClients, type Client } from "@/data/mockData";

const statusConfig = {
  activo: { label: "Activo", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  incompleto: { label: "Incompleto", className: "bg-rose-100 text-rose-700 hover:bg-rose-100" },
};

export default function ClientesCatalogo() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = mockClients.filter(
    (client) =>
      client.razónSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClients = mockClients.length;
  const activeClients = mockClients.filter((c) => c.estatus === "activo").length;
  const totalSubClients = mockClients.reduce((acc, c) => acc + c.subClientes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Gestión de Clientes
          </h1>
          <p className="text-muted-foreground">Administra clientes y sus sucursales de entrega</p>
        </div>
        <Button onClick={() => navigate("/clientes/nuevo")}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </Button>
      </div>

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
                <p className="text-sm text-muted-foreground">Total Subclientes</p>
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
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Razón Social</TableHead>
                <TableHead className="font-semibold">RFC</TableHead>
                <TableHead className="font-semibold text-center">Subclientes</TableHead>
                <TableHead className="font-semibold">Tarifas Activas</TableHead>
                <TableHead className="font-semibold">Estatus</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.razónSocial}</p>
                      <p className="text-sm text-muted-foreground">{client.contactoPrincipal}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{client.rfc}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-medium">
                      {client.subClientes}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.tarifasActivas.length > 0 ? (
                        client.tarifasActivas.slice(0, 2).map((tarifa, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tarifa}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Sin tarifas</span>
                      )}
                      {client.tarifasActivas.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{client.tarifasActivas.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[client.estatus].className}>
                      {statusConfig[client.estatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
