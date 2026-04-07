// src/features/flota/FleetTires.tsx
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
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

// Servicios y Hooks
import {
  getTireLifePercentage,
  getTireSemaphoreStatus,
  getEstadoBadge,
} from "@/features/tires/utils/tireUtils";
import { useTires } from "@/features/tires/hooks/useTires";
import { Tire } from "@/features/tires/types";

// Componentes Modales
import { TireHistorySheet } from "@/features/tires/components/TireHistorySheet";
import { AssignTireModal } from "@/features/tires/components/AssignTireModal";
import { MaintenanceTireModal } from "@/features/tires/components/MaintenanceTireModal";
import { CreateTireModal } from "@/features/tires/components/CreateTireModal";

export default function FleetTires() {
  // 1. Hook Principal (CRUD completo)
  const {
    tires,
    isLoading,
    assignTire,
    registerMaintenance,
    createTire,
    updateTire,
    deleteTire,
  } = useTires();

  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);

  // Estados de Visibilidad de Modales
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  // 2. Calcular KPIs
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

  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    tires.forEach((t) => {
      if (t.unidad_actual_economico) units.add(t.unidad_actual_economico);
    });
    return ["En Almacén", ...Array.from(units)];
  }, [tires]);

  const tireBrands = useMemo(() => {
    const brands = new Set<string>();
    tires.forEach((t) => brands.add(t.marca));
    return Array.from(brands);
  }, [tires]);

  // --- HANDLERS ---
  const handleViewHistory = (tire: Tire) => {
    setSelectedTire(tire);
    setHistorySheetOpen(true);
  };

  const handleOpenAssign = (tire: Tire) => {
    setSelectedTire(tire);
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (
    tireId: string,
    unidad: string | null,
    posicion: number | null,
    notas: string,
  ) => {
    const idNum = parseInt(tireId);
    const unidadIdNum = unidad ? parseInt(unidad) : null;
    await assignTire(idNum, {
      unit_id: unidadIdNum,
      posicion: posicion,
      notas: notas,
    });
    setAssignModalOpen(false);
  };

  const handleOpenMaintenance = (tire: Tire) => {
    setSelectedTire(tire);
    setMaintenanceModalOpen(true);
  };

  const handleMaintenanceSubmit = async (
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

  const handleOpenCreate = () => {
    setSelectedTire(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (tire: Tire) => {
    setSelectedTire(tire);
    setCreateModalOpen(true);
  };

  const handleCreateOrUpdateSubmit = async (data: any) => {
    if (selectedTire) {
      return await updateTire(selectedTire.id, data);
    } else {
      return await createTire(data);
    }
  };

  const handleOpenDelete = (tire: Tire) => {
    setSelectedTire(tire);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTire) {
      await deleteTire(selectedTire.id);
      setDeleteAlertOpen(false);
      setSelectedTire(null);
    }
  };

  // 3. Definición de Columnas
  const columns: ColumnDef<Tire>[] = useMemo(
    () => [
      {
        key: "codigo_interno",
        header: "ID Llanta",
        sortable: true,
        render: (value) => (
          <span className="font-black font-mono text-brand-navy dark:text-white uppercase tracking-tight bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
            {value}
          </span>
        ),
      },
      {
        key: "marca",
        header: "Marca",
        type: "status",
        statusOptions: tireBrands,
        render: (value) => (
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {value}
          </span>
        ),
      },
      {
        key: "modelo",
        header: "Modelo",
        render: (value) => (
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            {value}
          </span>
        ),
      },
      {
        key: "medida",
        header: "Medida",
        render: (value) => (
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
            {value}
          </span>
        ),
      },
      {
        key: "unidad_actual_economico",
        header: "Ubicación Actual",
        type: "status",
        statusOptions: uniqueUnits,
        render: (value) => (
          <div className="flex items-center gap-1.5">
            {value ? (
              <Badge
                variant="outline"
                className="font-mono font-black text-[10px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm gap-1.5 px-2 py-1 text-brand-navy dark:text-blue-400"
              >
                <Truck className="h-3 w-3" />
                ECO-{value}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="font-black uppercase tracking-widest text-[9px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-900/50 shadow-sm gap-1.5 px-2 py-1"
              >
                <Package className="h-3 w-3" />
                En Almacén
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: "posicion",
        header: "Pos.",
        render: (value) =>
          value ? (
            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-inner">
              <span className="font-mono font-black text-[10px] text-slate-600 dark:text-slate-300">
                {value}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
              —
            </span>
          ),
      },
      {
        key: "estado",
        header: "Estado Físico",
        type: "status",
        statusOptions: ["nuevo", "usado", "renovado", "desecho"],
        render: (value) => {
          const badge = getEstadoBadge(value as string);
          return (
            <Badge
              className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm border-none",
                badge.className,
              )}
            >
              {badge.label}
            </Badge>
          );
        },
      },
      {
        key: "profundidad_actual",
        header: "Semáforo de Vida",
        type: "number",
        render: (value, row) => {
          const percentage = getTireLifePercentage(row);
          const semaphore = getTireSemaphoreStatus(row);
          return (
            <div className="w-32 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-[10px] text-slate-700 dark:text-slate-300">
                  {value} mm
                </span>
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    semaphore.label === "Crítico"
                      ? "text-rose-500"
                      : semaphore.label === "Atención"
                        ? "text-amber-500"
                        : "text-emerald-500",
                  )}
                >
                  {semaphore.label}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner border border-slate-200 dark:border-white/5">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
                    semaphore.label === "Crítico"
                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                      : semaphore.label === "Atención"
                        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: "km_recorridos",
        header: "Uso (KM)",
        type: "number",
        render: (value) => (
          <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-400">
            {value?.toLocaleString() || 0}
          </span>
        ),
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        width: "w-[60px]",
        render: (_, row) => (
          <div
            className="flex justify-end pr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                >
                  <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-panel border-white/20 min-w-[180px] z-50 dark:bg-slate-900/90"
              >
                <DropdownMenuItem
                  onClick={() => handleViewHistory(row)}
                  className="gap-2 font-bold text-xs uppercase cursor-pointer dark:text-slate-300"
                >
                  <History className="h-4 w-4 text-slate-400" /> Historial
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => handleOpenAssign(row)}
                  disabled={row.estado === "desecho"}
                  className="gap-2 font-bold text-xs uppercase cursor-pointer dark:text-slate-300"
                >
                  <ArrowRightLeft className="h-4 w-4 text-blue-500" /> Asignar /
                  Rotar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleOpenMaintenance(row)}
                  disabled={row.estado === "desecho"}
                  className="gap-2 font-bold text-xs uppercase cursor-pointer dark:text-slate-300"
                >
                  <Wrench className="h-4 w-4 text-amber-500" /> Maintenance
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => handleOpenEdit(row)}
                  className="gap-2 font-bold text-xs uppercase cursor-pointer dark:text-slate-300"
                >
                  <Pencil className="h-4 w-4 text-brand-green" /> Editar Datos
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleOpenDelete(row)}
                  className="gap-2 font-bold text-xs uppercase text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" /> Dar de Baja
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [uniqueUnits, tireBrands],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-red" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
          Sincronizando inventario de neumáticos...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      {/*  HEADER TAHOE */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/40 dark:bg-slate-900/40 p-5 rounded-2xl border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy dark:text-white flex items-center gap-3 uppercase tracking-tighter heading-crisp">
            <div className="p-2.5 bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-700 shadow-inner">
              <CircleDot className="h-6 w-6 text-white" />
            </div>
            Gestión de Neumáticos
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-2">
            Administración técnica de {kpis.total} unidades en catálogo activo.
          </p>
        </div>
        <Button
          variant="default"
          size="lg"
          className="w-full md:w-auto haptic-press shadow-lg shadow-brand-red/20 bg-brand-red hover:bg-red-700"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4 mr-2" /> Nueva Llanta
        </Button>
      </div>

      {/*  KPI CARDS (Tahoe UI) */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* CRÍTICO */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-default relative overflow-hidden"
        >
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out relative z-10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col justify-center relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Desgaste Crítico
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">
                {kpis.critical.length}
              </p>
              <span className="text-[9px] font-black text-rose-600/60 uppercase tracking-widest">
                {"< 5mm"}
              </span>
            </div>
          </div>
          {kpis.critical.length > 0 && (
            <AlertTriangle className="h-24 w-24 text-rose-500/10 absolute -right-4 -bottom-4 z-0 animate-pulse" />
          )}
        </Card>

        {/* ATENCIÓN */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-amber-300 dark:hover:border-amber-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              En Atención
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tighter">
                {kpis.warning.length}
              </p>
              <span className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">
                6-10mm
              </span>
            </div>
          </div>
        </Card>

        {/* ÓPTIMO */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Estado Óptimo
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                {kpis.good.length}
              </p>
              <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">
                +11mm
              </span>
            </div>
          </div>
        </Card>

        {/* STOCK */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-default"
        >
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out text-slate-600 dark:text-slate-400">
            <Package className="h-6 w-6" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              En Almacén
            </p>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
              {kpis.inStock.length}
            </p>
          </div>
        </Card>
      </div>

      {/*  TABLA PRINCIPAL (Liquid Glass Tahoe) */}
      <Card
        variant="default"
        className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
            <CircleDot className="h-6 w-6 text-brand-red" /> Inventario
            Operativo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          <EnhancedDataTable
            data={tires.filter((t) => t.estado !== "desecho")}
            columns={columns}
            exportFileName="inventario_llantas_3T"
            className="border-none"
          />
        </CardContent>
      </Card>

      {/* --- MODALES --- */}
      <CreateTireModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateOrUpdateSubmit}
        tireToEdit={selectedTire}
      />
      <TireHistorySheet
        tire={selectedTire}
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
      />
      <AssignTireModal
        tire={selectedTire}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onAssign={handleAssignSubmit}
      />
      <MaintenanceTireModal
        tire={selectedTire}
        open={maintenanceModalOpen}
        onOpenChange={setMaintenanceModalOpen}
        onSubmit={handleMaintenanceSubmit}
      />

      {/*  ALERTA DE ELIMINACIÓN (Estructura Tahoe 4 Capas) */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
          {/* HEADER */}
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Eliminar Neumático
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Catálogo de Infraestructura • Acción Irreversible
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea eliminar permanentemente la llanta{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase bg-white dark:bg-slate-800 px-2 rounded">
                  {selectedTire?.codigo_interno}
                </b>
                ?
              </p>

              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Aviso de Pérdida de Datos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta operación purgará el registro físico, sus métricas de
                  rendimiento, historial de movimientos y costos acumulados.{" "}
                  <b className="font-black underline">
                    No podrá ser recuperado
                  </b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          {/* FOOTER */}
          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setSelectedTire(null)}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Abortar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={confirmDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-brand-red hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar Definitivamente
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
