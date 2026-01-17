import { useState, useMemo } from "react";
import { 
  Truck, 
  AlertTriangle, 
  Package, 
  CircleDot, 
  History,
  ArrowRightLeft,
  Wrench,
  Plus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedDataTable, ColumnDef } from "@/components/ui/enhanced-data-table";
import { 
  GlobalTire, 
  getTireLifePercentage, 
  getTireSemaphoreStatus,
  getEstadoBadge,
  getEstadoFisicoBadge 
} from "@/features/llantas/types";
import { mockGlobalTires, fleetUnits, tireBrands } from "@/features/llantas/data";
import { TireHistorySheet } from "@/features/llantas/TireHistorySheet";
import { AssignTireModal } from "@/features/llantas/AssignTireModal";
import { MaintenanceTireModal } from "@/features/llantas/MaintenanceTireModal";
import { MoreHorizontal } from "lucide-react";

export default function FlotaLlantas() {
  const [tires, setTires] = useState<GlobalTire[]>(mockGlobalTires);
  const [selectedTire, setSelectedTire] = useState<GlobalTire | null>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activeTires = tires.filter(t => t.estado !== 'desecho');
    const critical = activeTires.filter(t => t.profundidadActual < 5);
    const warning = activeTires.filter(t => t.profundidadActual >= 5 && t.profundidadActual <= 10);
    const good = activeTires.filter(t => t.profundidadActual > 10);
    const inStock = activeTires.filter(t => t.unidadActual === null);
    
    return { critical, warning, good, inStock, total: activeTires.length };
  }, [tires]);

  // Unique values for filters
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    tires.forEach(t => {
      if (t.unidadActual) units.add(t.unidadActual);
    });
    return ['En Almacén', ...Array.from(units)];
  }, [tires]);

  // Handlers
  const handleViewHistory = (tire: GlobalTire) => {
    setSelectedTire(tire);
    setHistorySheetOpen(true);
  };

  const handleOpenAssign = (tire: GlobalTire) => {
    setSelectedTire(tire);
    setAssignModalOpen(true);
  };

  const handleOpenMaintenance = (tire: GlobalTire) => {
    setSelectedTire(tire);
    setMaintenanceModalOpen(true);
  };

  const handleAssign = (tireId: string, unidad: string | null, posicion: string | null, notas: string) => {
    setTires(prev => prev.map(t => {
      if (t.id === tireId) {
        const newEvent = {
          id: `h${Date.now()}`,
          fecha: new Date(),
          tipo: unidad ? 'montaje' as const : 'desmontaje' as const,
          descripcion: unidad 
            ? `Asignado a ${unidad} - ${posicion}${notas ? `. ${notas}` : ''}`
            : `Enviado a almacén${notas ? `. ${notas}` : ''}`,
          unidad: unidad || undefined,
          posicion: posicion || undefined,
          km: t.kmRecorridos,
          responsable: 'Usuario Actual'
        };
        
        return {
          ...t,
          unidadActual: unidad,
          posicion: posicion,
          historial: [...t.historial, newEvent]
        };
      }
      return t;
    }));
  };

  const handleMaintenance = (tireId: string, tipo: 'reparacion' | 'renovado' | 'desecho', costo: number, descripcion: string) => {
    setTires(prev => prev.map(t => {
      if (t.id === tireId) {
        const newEvent = {
          id: `h${Date.now()}`,
          fecha: new Date(),
          tipo: tipo,
          descripcion: descripcion || `Enviado a ${tipo}`,
          costo: costo || undefined,
          km: t.kmRecorridos,
          responsable: 'Usuario Actual'
        };

        const updates: Partial<GlobalTire> = {
          historial: [...t.historial, newEvent],
          costoAcumulado: t.costoAcumulado + costo
        };

        // If desecho, mark as such
        if (tipo === 'desecho') {
          updates.estado = 'desecho';
          updates.estadoFisico = 'mala';
          updates.unidadActual = null;
          updates.posicion = null;
        }

        // If renovado and currently mounted, unmount
        if (tipo === 'renovado' && t.unidadActual) {
          updates.unidadActual = null;
          updates.posicion = null;
        }

        return { ...t, ...updates };
      }
      return t;
    }));
  };

  // Column definitions for EnhancedDataTable
  const columns: ColumnDef<GlobalTire>[] = useMemo(() => [
    {
      key: 'codigoInterno',
      header: 'ID Llanta',
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    {
      key: 'marca',
      header: 'Marca',
      type: 'status',
      statusOptions: tireBrands,
    },
    {
      key: 'modelo',
      header: 'Modelo',
    },
    {
      key: 'medida',
      header: 'Medida',
      render: (value) => <span className="text-xs font-mono">{value}</span>,
    },
    {
      key: 'unidadActual',
      header: 'Unidad Actual',
      type: 'status',
      statusOptions: uniqueUnits,
      render: (value, row) => (
        <div className="flex items-center gap-1.5">
          {value ? (
            <>
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{value}</span>
            </>
          ) : (
            <>
              <Package className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-amber-700">En Almacén</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'posicion',
      header: 'Posición',
      render: (value) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      type: 'status',
      statusOptions: ['nuevo', 'usado', 'renovado', 'desecho'],
      render: (value) => {
        const badge = getEstadoBadge(value);
        return <Badge className={badge.className}>{badge.label}</Badge>;
      },
    },
    {
      key: 'estadoFisico',
      header: 'Condición',
      type: 'status',
      statusOptions: ['buena', 'regular', 'mala'],
      render: (value) => {
        const badge = getEstadoFisicoBadge(value);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'profundidadActual',
      header: 'Semáforo de Vida',
      type: 'number',
      render: (value, row) => {
        const percentage = getTireLifePercentage(row);
        const semaphore = getTireSemaphoreStatus(row);
        return (
          <div className="w-28 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{value}mm</span>
              <Badge className={`${semaphore.bgColor} ${semaphore.color} text-[10px] px-1.5`}>
                {semaphore.label}
              </Badge>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        );
      },
    },
    {
      key: 'kmRecorridos',
      header: 'Km Recorridos',
      type: 'number',
      render: (value) => <span className="font-mono">{value.toLocaleString()}</span>,
    },
    {
      key: 'id',
      header: 'Acciones',
      sortable: false,
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewHistory(row)}>
              <History className="h-4 w-4 mr-2" />
              Ver Historial
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleOpenAssign(row)}
              disabled={row.estado === 'desecho'}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Asignar / Rotar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleOpenMaintenance(row)}
              disabled={row.estado === 'desecho'}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Mantenimiento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [uniqueUnits]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CircleDot className="h-6 w-6" /> 
            Inventario Global de Neumáticos
          </h1>
          <p className="text-muted-foreground">
            Gestión centralizada de {kpis.total} llantas activas en la flota
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Llanta
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticas (&lt;5mm)</p>
                <p className="text-3xl font-bold text-status-danger">{kpis.critical.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Atención (6-10mm)</p>
            <p className="text-3xl font-bold text-status-warning">{kpis.warning.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Buen Estado (+11mm)</p>
            <p className="text-3xl font-bold text-status-success">{kpis.good.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Stock/Almacén</p>
                <p className="text-3xl font-bold">{kpis.inStock.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={tires.filter(t => t.estado !== 'desecho')}
            columns={columns}
            exportFileName="inventario_llantas"
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <TireHistorySheet
        tire={selectedTire}
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
      />
      
      <AssignTireModal
        tire={selectedTire}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onAssign={handleAssign}
      />

      <MaintenanceTireModal
        tire={selectedTire}
        open={maintenanceModalOpen}
        onOpenChange={setMaintenanceModalOpen}
        onSubmit={handleMaintenance}
      />
    </div>
  );
}
