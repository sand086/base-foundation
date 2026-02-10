import { useMemo, useState } from "react";
import {
  Truck,
  AlertTriangle,
  Package,
  CircleDot,
  History,
  ArrowRightLeft,
  Wrench,
  Plus,
  MoreHorizontal,
  Loader2,
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
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

// Imports actualizados
import {
  GlobalTire,
  getTireLifePercentage,
  getTireSemaphoreStatus,
  getEstadoBadge,
  getEstadoFisicoBadge,
} from "@/features/llantas/types";
import { useTires } from "@/hooks/useTires"; // Hook Real
import { tireBrands } from "@/features/llantas/data"; // Solo marcas estáticas

// Components
import { TireHistorySheet } from "@/features/llantas/TireHistorySheet";
import { AssignTireModal } from "@/features/llantas/AssignTireModal";
import { MaintenanceTireModal } from "@/features/llantas/MaintenanceTireModal";

export default function FlotaLlantas() {
  // 1. Usar Hook Real
  const { tires, isLoading, assignTire, registerMaintenance } = useTires();

  const [selectedTire, setSelectedTire] = useState<GlobalTire | null>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);

  // 2. Calcular KPIs con datos reales (Snake Case)
  const kpis = useMemo(() => {
    const activeTires = tires.filter((t) => t.estado !== "desecho");
    const critical = activeTires.filter((t) => t.profundidad_actual < 5);
    const warning = activeTires.filter(
      (t) => t.profundidad_actual >= 5 && t.profundidad_actual <= 10,
    );
    const good = activeTires.filter((t) => t.profundidad_actual > 10);
    const inStock = activeTires.filter((t) => !t.unidad_actual_id);

    return { critical, warning, good, inStock, total: activeTires.length };
  }, [tires]);

  // Filtros únicos
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    tires.forEach((t) => {
      if (t.unidad_actual_economico) units.add(t.unidad_actual_economico);
    });
    return ["En Almacén", ...Array.from(units)];
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

  // 3. Conectar Handlers al Backend
  const handleAssign = async (
    tireId: string,
    unidad: string | null,
    posicion: string | null,
    notas: string,
  ) => {
    // El ID viene como string del componente, lo pasamos a number
    const idNum = parseInt(tireId);

    // Si unidad es null, es a almacén (unidad_id = null)
    // Si unidad tiene valor, es el ID de la unidad.
    // NOTA: AssignTireModal debe devolver el ID de la unidad, no el nombre.
    // Asumiremos que el modal ya fue corregido o lo corregiremos luego.
    // Por ahora, asumamos que 'unidad' es el ID stringificado si viene del select.

    const unidadIdNum = unidad ? parseInt(unidad) : null;

    await assignTire(idNum, {
      unidad_id: unidadIdNum,
      posicion: posicion,
      notas: notas,
    });
    setAssignModalOpen(false);
  };

  const handleMaintenance = async (
    tireId: string,
    tipo: any,
    costo: number,
    descripcion: string,
  ) => {
    const idNum = parseInt(tireId);
    await registerMaintenance(idNum, {
      tipo,
      costo,
      descripcion,
    });
    setMaintenanceModalOpen(false);
  };

  // 4. Columnas actualizadas (Snake Case)
  const columns: ColumnDef<GlobalTire>[] = useMemo(
    () => [
      {
        key: "codigo_interno", // Backend Key
        header: "ID Llanta",
        render: (value) => (
          <span className="font-mono font-medium">{value}</span>
        ),
      },
      {
        key: "marca",
        header: "Marca",
        type: "status",
        statusOptions: tireBrands,
      },
      {
        key: "modelo",
        header: "Modelo",
      },
      {
        key: "medida",
        header: "Medida",
        render: (value) => <span className="text-xs font-mono">{value}</span>,
      },
      {
        key: "unidad_actual_economico", // Backend Key
        header: "Unidad Actual",
        type: "status",
        statusOptions: uniqueUnits,
        render: (value) => (
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
        key: "posicion",
        header: "Posición",
        render: (value) =>
          value || <span className="text-muted-foreground text-xs">--</span>,
      },
      {
        key: "estado",
        header: "Estado",
        type: "status",
        statusOptions: ["nuevo", "usado", "renovado", "desecho"],
        render: (value) => {
          const badge = getEstadoBadge(value as string);
          return <Badge className={badge.className}>{badge.label}</Badge>;
        },
      },
      {
        key: "profundidad_actual", // Backend Key
        header: "Semáforo de Vida",
        type: "number",
        render: (value, row) => {
          const percentage = getTireLifePercentage(row);
          const semaphore = getTireSemaphoreStatus(row);
          return (
            <div className="w-28 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{value}mm</span>
                <Badge
                  className={`${semaphore.bgColor} ${semaphore.color} text-[10px] px-1.5`}
                >
                  {semaphore.label}
                </Badge>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        },
      },
      {
        key: "km_recorridos", // Backend Key
        header: "Km Recorridos",
        type: "number",
        render: (value) => (
          <span className="font-mono">{value?.toLocaleString() || 0}</span>
        ),
      },
      {
        key: "id",
        header: "Acciones",
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
                disabled={row.estado === "desecho"}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Asignar / Rotar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenMaintenance(row)}
                disabled={row.estado === "desecho"}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Mantenimiento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [uniqueUnits],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Cargando inventario de llantas...
          </p>
        </div>
      </div>
    );
  }

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
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Críticas (&lt;5mm)
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {kpis.critical.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Atención (6-10mm)</p>
            <p className="text-3xl font-bold text-amber-600">
              {kpis.warning.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Buen Estado (+11mm)</p>
            <p className="text-3xl font-bold text-emerald-600">
              {kpis.good.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  En Stock/Almacén
                </p>
                <p className="text-3xl font-bold">{kpis.inStock.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={tires.filter((t) => t.estado !== "desecho")}
            columns={columns}
            exportFileName="inventario_llantas"
          />
        </CardContent>
      </Card>

      {/* Modals */}
      {/* Nota: Necesitarás actualizar TireHistorySheet para usar snake_case también si no se ve bien */}
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
