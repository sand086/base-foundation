// src/features/flota/FleetUnits.tsx
import { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Package,
  Loader2,
  MoreHorizontal,
  AlertCircle,
  Check,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Features y Hooks
import { AddUnidadModal } from "@/features/units/components/AddUnitModal";
import { PatrimonialView } from "@/features/units/components/PatrimonialView";
import { useUnits } from "@/features/units/hooks/useUnits";
import { useUnitTypes } from "@/features/settings/hooks/useUnitTypes";
import { Unit } from "@/features/units/types";

// --- Helpers Visuales (Industrial Premium) ---
const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  const baseClass =
    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm";

  switch (s) {
    case "disponible":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
          )}
        >
          Disponible
        </Badge>
      );
    case "en_ruta":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
          )}
        >
          En Ruta
        </Badge>
      );
    case "mantenimiento":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
          )}
        >
          Maintenance
        </Badge>
      );
    case "bloqueado":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
          )}
        >
          Bloqueado
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10",
          )}
        >
          {status}
        </Badge>
      );
  }
};

const getTipoBadge = (tipo: string) => {
  return (
    <Badge
      variant="outline"
      className="text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 shadow-sm"
    >
      {tipo}
    </Badge>
  );
};

export default function FleetUnits() {
  const navigate = useNavigate();

  // Hook de gestión de datos
  const {
    unidades,
    isLoading,
    createUnit,
    updateUnit,
    deleteUnit,
    updateLoadStatus,
  } = useUnits();

  // Estados locales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [unidadToEdit, setUnidadToEdit] = useState<Unit | null>(null);
  const [unidadToDelete, setUnidadToDelete] = useState<number | null>(null);

  // Contadores para KPIs rápidos
  const disponibles = unidades.filter((u) => u.status === "disponible").length;
  const enRuta = unidades.filter((u) => u.status === "en_ruta").length;
  const bloqueadas = unidades.filter((u) => u.status === "bloqueado").length;
  const mantenimiento = unidades.filter(
    (u) => u.status === "mantenimiento",
  ).length;

  // --- Handlers ---
  const handleSave = async (unitData: Partial<Unit>) => {
    setIsSaving(true);
    let success = false;

    if (unitData.id) {
      success = await updateUnit(unitData.id, unitData);
    } else {
      success = await createUnit(unitData as any);
    }

    setIsSaving(false);
    if (success) {
      handleCloseModal(false);
    }
  };

  const handleDelete = async () => {
    if (unidadToDelete) {
      await deleteUnit(unidadToDelete);
      setUnidadToDelete(null);
    }
  };

  const handleEdit = (unidad: Unit) => {
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
      setTimeout(() => setUnidadToEdit(null), 300);
    }
  };

  // Definición de columnas
  const columns: ColumnDef<Unit>[] = useMemo(
    () => [
      {
        key: "numero_economico",
        header: "No. Económico",
        render: (value, row) => {
          // Lógica: Si el tipo incluye "tracto" o "camion", le ponemos ECO. Si no, lo dejamos intacto (Ej. C-70)
          const isTracto =
            row.tipo_1?.toLowerCase().includes("tracto") ||
            row.tipo_1?.toLowerCase().includes("camion") ||
            row.tipo?.toLowerCase().includes("tracto");

          return (
            <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
              {isTracto ? `ECO-${value}` : value}
            </span>
          );
        },
      },
      {
        key: "placas",
        header: "Placas",
        render: (value) => (
          <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">
            {value || "S/P"}
          </span>
        ),
      },
      {
        key: "marca",
        header: "Marca / Modelo",
        render: (_, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {row.marca}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {row.modelo} {row.year}
            </span>
          </div>
        ),
      },
      {
        key: "tipo",
        header: "Tipo",
        render: (value) => getTipoBadge(value),
      },
      {
        key: "is_loaded",
        header: "Estado Carga",
        render: (_, row) => {
          const esRemolque = [
            "remolque",
            "caja",
            "plataforma",
            "chasis",
            "utilitario",
          ].some(
            (t) =>
              row.tipo_1?.toLowerCase().includes(t) ||
              row.tipo?.toLowerCase().includes(t),
          );

          if (!esRemolque) {
            return (
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                N/A (Tracto)
              </span>
            );
          }

          const isLoaded = (row as any).is_loaded || false;

          return (
            <div className="flex items-center gap-3">
              <Switch
                checked={isLoaded}
                onCheckedChange={async (checked) => {
                  const success = await updateUnit(row.id, {
                    is_loaded: checked,
                  } as any);
                  if (success) {
                    toast.success(
                      `Chasis ${row.numero_economico} actualizado`,
                      {
                        description: checked
                          ? "El chasis tiene un contenedor montado."
                          : "El chasis está vacío y libre.",
                      },
                    );
                  }
                }}
                className="data-[state=checked]:bg-brand-navy"
              />
              <Badge
                variant="outline"
                className={cn(
                  "transition-colors px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm",
                  isLoaded
                    ? "bg-brand-navy/10 text-brand-navy border-brand-navy/20 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
                )}
              >
                {isLoaded ? "📦 CARGADO" : "➖ VACÍO"}
              </Badge>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Estatus Operativo",
        render: (_, row) => (
          <div className="flex items-center gap-2">
            {getStatusBadge(row.status)}

            {row.status === "bloqueado" && row.razon_bloqueo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-4 w-4 text-rose-500 cursor-help transition-transform hover:scale-110" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 shadow-lg">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">
                      Motivo de Bloqueo:
                    </p>
                    <p className="font-bold text-xs">{row.razon_bloqueo}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },

      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900/50"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-white/20 min-w-[180px] z-50 dark:bg-slate-900/90"
            >
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/flota/unidad/${row.numero_economico}`)
                }
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Eye className="h-4 w-4 text-brand-navy dark:text-slate-400" />{" "}
                Ver Expediente
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(row)}
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                Editar Unidad
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                onClick={() => setUnidadToDelete(row.id)}
              >
                <Trash2 className="h-4 w-4" /> Eliminar Unidad
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [updateLoadStatus, navigate],
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-brand-red" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
            Cargando flota operativa...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/*  HEADER TAHOE */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl shadow-sm border border-white/20 dark:border-white/10 backdrop-blur-md gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy dark:text-white flex items-center gap-2 uppercase tracking-tighter heading-crisp">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            Gestión de Flota
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-2">
            Catálogo de unidades, disponibilidad en patio y estatus físico.
          </p>
        </div>
        <Button
          variant="default"
          size="lg"
          className="w-full md:w-auto haptic-press shadow-lg shadow-brand-red/20"
          onClick={handleOpenNewModal}
        >
          <Plus className="h-4 w-4 mr-2" /> Nueva Unidad
        </Button>
      </div>

      <Tabs defaultValue="unidades" className="space-y-6">
        {/*  TABS LIST */}
        <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md p-1 h-14 rounded-xl border border-slate-200/50 dark:border-white/10 w-full sm:w-auto inline-flex">
          <TabsTrigger
            value="unidades"
            className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
          >
            <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />{" "}
            Unidades Operativas
          </TabsTrigger>
          <TabsTrigger
            value="patrimonial"
            className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
          >
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />{" "}
            Control Patrimonial
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="unidades"
          className="space-y-6 m-0 focus-visible:outline-none"
        >
          {/*  DASHBOARD DE FLOTA */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              variant="default"
              className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
            >
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Disponibles
                </p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none tracking-tighter">
                  {disponibles}
                </p>
              </div>
            </Card>

            <Card
              variant="default"
              className="p-6 flex items-center gap-5 group hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-default"
            >
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  En Ruta
                </p>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 leading-none tracking-tighter">
                  {enRuta}
                </p>
              </div>
            </Card>

            <Card
              variant="default"
              className="p-6 flex items-center gap-5 group hover:border-amber-300 dark:hover:border-amber-500/50 transition-all cursor-default"
            >
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Maintenance
                </p>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter">
                  {mantenimiento}
                </p>
              </div>
            </Card>

            <Card
              variant="default"
              className="p-6 flex items-center gap-5 group hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-default relative overflow-hidden"
            >
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out relative z-10">
                <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col justify-center relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
                  Bloqueadas
                </p>
                <p className="text-3xl font-black text-rose-600 dark:text-rose-400 leading-none tracking-tighter">
                  {bloqueadas}
                </p>
              </div>
              {bloqueadas > 0 && (
                <AlertTriangle className="h-24 w-24 text-rose-500/10 dark:text-rose-500/5 absolute -right-4 -bottom-4 z-0" />
              )}
            </Card>
          </div>

          {/*  TABLA DE DIRECTORIO (CON HEADER HOMOLOGADO A TARIFAS) */}
          <Card
            variant="default"
            className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
                  <Truck className="h-6 w-6 text-brand-red" /> Directorio
                  Operativo
                </CardTitle>
              </div>
            </CardHeader>
            {/* Truco: Aplicamos estilos de tabla en el contenedor para forzar las cabeceras generadas por EnhancedDataTable */}
            <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
              {" "}
              <EnhancedDataTable
                data={unidades}
                columns={columns}
                exportFileName="flota_unidades"
                className="border-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="patrimonial"
          className="m-0 focus-visible:outline-none"
        >
          <PatrimonialView />
        </TabsContent>
      </Tabs>

      {/* MODAL DE CREACIÓN/EDICIÓN */}
      <AddUnidadModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        unidadToEdit={unidadToEdit}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/*  DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AlertDialog
        open={!!unidadToDelete}
        onOpenChange={(open) => !open && setUnidadToDelete(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                  Eliminar Unidad
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                  Acción Irreversible • Catálogo Flota
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea eliminar la unidad{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight">
                  ECO-
                  {
                    unidades.find((u) => u.id === unidadToDelete)
                      ?.numero_economico
                  }
                </b>
                ?
              </p>

              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Datos Técnicos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción eliminará el historial técnico asociado a esta
                  unidad y{" "}
                  <b className="font-black underline">no se puede deshacer</b>.
                  Los viajes históricos despachados mantendrán la referencia en
                  modo texto.
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
                onClick={handleDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Sí, Eliminar Unidad
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
