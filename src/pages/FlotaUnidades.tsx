import { useState, useMemo } from 'react';
import { Truck, Plus, AlertTriangle, Eye, Edit, Trash2, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { AddUnidadModal, Unidad } from '@/features/flota/AddUnidadModal';
import { PatrimonialView } from '@/features/flota/PatrimonialView';
import { EnhancedDataTable, ColumnDef } from '@/components/ui/enhanced-data-table';
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
  
  const [unidades, setUnidades] = useState<Unidad[]>(initialMockFleet);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidadToEdit, setUnidadToEdit] = useState<Unidad | null>(null);
  const [unidadToDelete, setUnidadToDelete] = useState<string | null>(null);
  
  // Calculate stats
  const disponibles = unidades.filter(u => u.status === 'disponible').length;
  const enRuta = unidades.filter(u => u.status === 'en_ruta').length;
  const bloqueadas = unidades.filter(u => u.status === 'bloqueado').length;
  const mantenimiento = unidades.filter(u => u.status === 'mantenimiento').length;

  // CRUD Handlers
  const handleSave = (unidadData: Omit<Unidad, 'id'> & { id?: string }) => {
    if (unidadToEdit) {
      setUnidades((prev) =>
        prev.map((u) =>
          u.id === unidadToEdit.id ? { ...u, ...unidadData } as Unidad : u
        )
      );
    } else {
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
    if (!open) setUnidadToEdit(null);
  };

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<Unidad>[] = useMemo(() => [
    {
      key: 'numeroEconomico',
      header: 'No. Económico',
      render: (value) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'placas',
      header: 'Placas',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'marca',
      header: 'Marca / Modelo',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.marca}</span>
          <span className="text-xs text-muted-foreground">{row.modelo}</span>
        </div>
      ),
    },
    {
      key: 'year',
      header: 'Año',
      type: 'number',
    },
    {
      key: 'tipo',
      header: 'Tipo',
      type: 'status',
      statusOptions: ['full', 'sencillo', 'rabon'],
      render: (value) => getTipoBadge(value),
    },
    {
      key: 'operador',
      header: 'Operador Asignado',
      render: (value) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'documentosVencidos',
      header: 'Docs. Vencidos',
      type: 'number',
      render: (value) => (
        value > 0 
          ? <Badge className="bg-status-danger text-white">{value}</Badge>
          : <Badge className="bg-status-success text-white">0</Badge>
      ),
    },
    {
      key: 'llantasCriticas',
      header: 'Llantas Críticas',
      type: 'number',
      render: (value) => (
        value > 0 
          ? <Badge className="bg-status-danger text-white">{value}</Badge>
          : <Badge className="bg-status-success text-white">0</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estatus',
      type: 'status',
      statusOptions: ['disponible', 'en_ruta', 'mantenimiento', 'bloqueado'],
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'id',
      header: 'Acciones',
      sortable: false,
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem 
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/flota/unidad/${row.numeroEconomico}`);
              }}
            >
              <Eye className="h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
            >
              <Edit className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setUnidadToDelete(row.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [navigate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Gestión de Flota
          </h1>
          <p className="text-muted-foreground">Catálogo de unidades e inventario patrimonial</p>
        </div>
      </div>

      <Tabs defaultValue="unidades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unidades" className="gap-2">
            <Truck className="h-4 w-4" />
            Unidades Operativas
          </TabsTrigger>
          <TabsTrigger value="patrimonial" className="gap-2">
            <Package className="h-4 w-4" />
            Patrimonial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unidades" className="space-y-6">
          {/* Add Button */}
          <div className="flex justify-end">
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

          {/* Enhanced Data Table */}
          <Card>
            <CardContent className="pt-6">
              <EnhancedDataTable
                data={unidades}
                columns={columns}
                exportFileName="flota_unidades"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patrimonial">
          <PatrimonialView />
        </TabsContent>
      </Tabs>

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
