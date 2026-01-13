import { useState } from 'react';
import { Truck, FileText, Search, Plus, Eye, Settings, AlertTriangle, MoreHorizontal, Edit, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from "react-router-dom";
import { AddUnidadModal, Unidad } from '@/features/flota/AddUnidadModal';
import { useToast } from '@/hooks/use-toast';

// Mock fleet data with Unidad type
const initialMockFleet: Unidad[] = [
  {
    id: 'UNIT-001',
    numeroEconomico: 'TR-204',
    placas: 'AAA-000-A',
    marca: 'Freightliner',
    modelo: 'Cascadia',
    year: 2022,
    tipo: 'full',
    status: 'en_ruta',
    operador: 'Juan Pérez González',
    documentosVencidos: 1,
    llantasCriticas: 1,
  },
  {
    id: 'UNIT-002',
    numeroEconomico: 'TR-118',
    placas: 'BBB-111-B',
    marca: 'Kenworth',
    modelo: 'T680',
    year: 2021,
    tipo: 'full',
    status: 'disponible',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-003',
    numeroEconomico: 'TR-156',
    placas: 'CCC-222-C',
    marca: 'Volvo',
    modelo: 'VNL 760',
    year: 2023,
    tipo: 'sencillo',
    status: 'bloqueado',
    operador: null,
    documentosVencidos: 2,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-004',
    numeroEconomico: 'TR-089',
    placas: 'DDD-333-D',
    marca: 'International',
    modelo: 'LT625',
    year: 2020,
    tipo: 'rabon',
    status: 'mantenimiento',
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 2,
  },
  {
    id: 'UNIT-005',
    numeroEconomico: 'TR-201',
    placas: 'EEE-444-E',
    marca: 'Freightliner',
    modelo: 'Cascadia',
    year: 2022,
    tipo: 'full',
    status: 'en_ruta',
    operador: 'Fernando García Vega',
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'disponible':
      return <Badge className="bg-status-success text-white">Disponible</Badge>;
    case 'en_ruta':
      return <Badge className="bg-blue-600 text-white">En Ruta</Badge>;
    case 'mantenimiento':
      return <Badge className="bg-status-warning text-black">Mantenimiento</Badge>;
    case 'bloqueado':
      return <Badge className="bg-status-danger text-white">Bloqueado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getTipoBadge = (tipo: string) => {
  switch (tipo) {
    case 'full':
      return <Badge variant="outline" className="text-xs">Full</Badge>;
    case 'sencillo':
      return <Badge variant="outline" className="text-xs">Sencillo</Badge>;
    case 'rabon':
      return <Badge variant="outline" className="text-xs">Rabón</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{tipo}</Badge>;
  }
};

export default function FlotaUnidades() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [unidades, setUnidades] = useState<Unidad[]>(initialMockFleet);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidadToEdit, setUnidadToEdit] = useState<Unidad | null>(null);
  const [unidadToDelete, setUnidadToDelete] = useState<string | null>(null);
  
  // Calculate stats
  const disponibles = unidades.filter(u => u.status === 'disponible').length;
  const enRuta = unidades.filter(u => u.status === 'en_ruta').length;
  const bloqueadas = unidades.filter(u => u.status === 'bloqueado').length;
  const mantenimiento = unidades.filter(u => u.status === 'mantenimiento').length;

  // Filter units
  const filteredUnidades = unidades.filter(
    (u) =>
      u.numeroEconomico.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.placas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.marca.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // CRUD Handlers
  const handleSave = (unidadData: Omit<Unidad, 'id'> & { id?: string }) => {
    if (unidadToEdit) {
      // Update
      setUnidades((prev) =>
        prev.map((u) =>
          u.id === unidadToEdit.id ? { ...u, ...unidadData } as Unidad : u
        )
      );
    } else {
      // Create
      const newUnidad: Unidad = {
        ...unidadData,
        id: `UNIT-${String(unidades.length + 1).padStart(3, '0')}`,
      } as Unidad;
      setUnidades((prev) => [...prev, newUnidad]);
    }
    setUnidadToEdit(null);
  };

  const handleDelete = () => {
    if (!unidadToDelete) return;

    const unidad = unidades.find((u) => u.id === unidadToDelete);
    
    setUnidades((prev) => prev.filter((u) => u.id !== unidadToDelete));
    
    toast({
      title: 'Unidad eliminada',
      description: `${unidad?.numeroEconomico} ha sido eliminada del sistema.`,
    });
    
    setUnidadToDelete(null);
  };

  const handleEdit = (unidad: Unidad) => {
    setUnidadToEdit(unidad);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setUnidadToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setUnidadToEdit(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Catálogo de Unidades
          </h1>
          <p className="text-muted-foreground">Gestión de flota vehicular y documentación</p>
        </div>
        <Button 
          className="gap-2 bg-action hover:bg-action-hover text-action-foreground"
          onClick={handleOpenNewModal}
        >
          <Plus className="h-4 w-4" /> Nueva Unidad
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Disponibles</p>
            <p className="text-3xl font-bold text-status-success">{disponibles}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">En Ruta</p>
            <p className="text-3xl font-bold text-blue-600">{enRuta}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mantenimiento</p>
            <p className="text-3xl font-bold text-status-warning">{mantenimiento}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bloqueadas</p>
                <p className="text-3xl font-bold text-status-danger">{bloqueadas}</p>
              </div>
              {bloqueadas > 0 && <AlertTriangle className="h-6 w-6 text-status-danger" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número económico, placas, marca o modelo..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Listado de Unidades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-3">No. Económico</th>
                  <th className="py-3 px-3">Placas</th>
                  <th className="py-3 px-3">Marca / Modelo</th>
                  <th className="py-3 px-3">Año</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Operador Asignado</th>
                  <th className="py-3 px-3">Docs. Vencidos</th>
                  <th className="py-3 px-3">Llantas Críticas</th>
                  <th className="py-3 px-3">Estatus</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnidades.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      No se encontraron unidades con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUnidades.map((unit) => (
                    <tr key={unit.id} className="border-b hover:bg-muted/50 group transition-colors">
                      <td className="py-3 px-3 font-bold">{unit.numeroEconomico}</td>
                      <td className="py-3 px-3 font-mono text-sm">{unit.placas}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{unit.marca}</span>
                          <span className="text-xs text-muted-foreground">{unit.modelo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">{unit.year}</td>
                      <td className="py-3 px-3">{getTipoBadge(unit.tipo)}</td>
                      <td className="py-3 px-3">{unit.operador || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-3 px-3">
                        {unit.documentosVencidos > 0 ? (
                          <Badge className="bg-status-danger text-white">{unit.documentosVencidos}</Badge>
                        ) : (
                          <Badge className="bg-status-success text-white">0</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {unit.llantasCriticas > 0 ? (
                          <Badge className="bg-status-danger text-white">{unit.llantasCriticas}</Badge>
                        ) : (
                          <Badge className="bg-status-success text-white">0</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(unit.status)}</td>
                      <td className="py-3 px-3">
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
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => navigate(`/flota/unidad/${unit.numeroEconomico}`)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleEdit(unit)}
                              >
                                <Edit className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setUnidadToDelete(unit.id)}
                              >
                                <UserX className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Unit Modal */}
      <AddUnidadModal 
        open={isModalOpen} 
        onOpenChange={handleCloseModal}
        unidadToEdit={unidadToEdit}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!unidadToDelete} onOpenChange={() => setUnidadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-destructive" />
              Confirmar Eliminación de Unidad
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la unidad{' '}
              <span className="font-semibold">
                {unidades.find((u) => u.id === unidadToDelete)?.numeroEconomico}
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
}
