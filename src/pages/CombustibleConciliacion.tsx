import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Fuel,
  Plus,
  AlertTriangle,
  FileText,
  TrendingUp,
  Gauge,
  Droplets,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  FilterX,
  Search,
  ArrowUpRight,
  BarChart3,
  Activity,
} from "lucide-react";

import { FuelLoad, Unit, Operator } from "@/types/api.types";

import {
  AddTicketModal,
  type TicketFormData,
} from "@/features/combustible/AddTicketModal";
import { ViewCargaModal } from "@/features/combustible/ViewCargaModal";
import { EditCargaModal } from "@/features/combustible/EditCargaModal";

import {
  EnhancedDataTable,
  type ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { fuelService } from "@/services/fuelService";
import { unitService } from "@/services/unitService";
import { operatorService } from "@/services/operatorService";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Interface extendida para lógica de negocio visual
interface FuelLoadDisplay extends FuelLoad {
  unidad_numero: string;
  operador_nombre: string;
  excede_tanque: boolean;
}

const CombustibleCargas = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [cargas, setCargas] = useState<FuelLoadDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idParaEliminar, setIdParaEliminar] = useState<number | null>(null);

  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<FuelLoadDisplay | null>(null);
  const [cargaToEdit, setCargaToEdit] = useState<FuelLoadDisplay | null>(null);

  const loadData = async () => {
    try {
      const [uData, oData, fData] = await Promise.all([
        unitService.getAll(),
        operatorService.getAll(),
        fuelService.getAll(),
      ]);

      setUnits(uData || []);
      setOperators(oData || []);

      const normalizedFuel: FuelLoadDisplay[] = (fData || []).map(
        (item: any) => {
          const unit = uData.find((u: Unit) => u.id === item.unit_id);
          const capacity =
            item.tipo_combustible === "diesel"
              ? unit?.capacidad_tanque_diesel || 800
              : unit?.capacidad_tanque_urea || 60;

          return {
            ...item,
            unidad_numero:
              item.unit?.numero_economico || unit?.numero_economico || "N/A",
            operador_nombre:
              item.operator?.name || item.operator?.nombre || "N/A",
            excede_tanque: Number(item.litros) > Number(capacity),
          };
        },
      );

      setCargas(normalizedFuel);
    } catch (error) {
      console.error("Error sync:", error);
      toast.error("Error de Sincronización Industrial");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCargas = useMemo(() => {
    return cargas.filter((c) => {
      const matchesUnit =
        selectedUnitId === "all" || String(c.unit_id) === selectedUnitId;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.unidad_numero?.toLowerCase().includes(term) ||
        c.estacion?.toLowerCase().includes(term);
      return matchesUnit && matchesSearch;
    });
  }, [cargas, selectedUnitId, searchTerm]);

  const statsAuditoria = useMemo(() => {
    const ahora = new Date();
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cargasSemana = filteredCargas.filter(
      (c) => new Date(c.fecha_hora) >= hace7Dias,
    );
    const litros = cargasSemana.reduce((sum, c) => sum + (c.litros || 0), 0);
    const inversion = cargasSemana.reduce((sum, c) => sum + (c.total || 0), 0);
    const sorted = [...cargasSemana].sort(
      (a, b) =>
        new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime(),
    );
    const odoActual = sorted.length > 0 ? sorted[0].odometro : 0;
    const odoAnterior =
      sorted.length > 1 ? sorted[sorted.length - 1].odometro : odoActual;
    const kmRecorridos = odoActual - odoAnterior;
    const rendimiento =
      kmRecorridos > 0 && litros > 0
        ? (kmRecorridos / litros).toFixed(2)
        : "0.00";

    return { litros, inversion, odoActual, kmRecorridos, rendimiento };
  }, [filteredCargas]);

  const selectedUnitObj = useMemo(
    () => units.find((u) => String(u.id) === selectedUnitId),
    [units, selectedUnitId],
  );

  const handleAddTicket = async (data: TicketFormData) => {
    const toastId = toast.loading("Sincronizando Vale...");
    try {
      await fuelService.create({
        ...data,
        unit_id: Number(data.unit_id),
        operator_id: Number(data.operator_id),
        trip_id: data.trip_id ? Number(data.trip_id) : null,
      });
      await loadData();
      toast.success("Registro de Carga Exitoso", { id: toastId });
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Fallo en Registro de Ticket", { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!idParaEliminar) return;
    const toastId = toast.loading("Eliminando del Ledger...");
    try {
      await fuelService.delete(idParaEliminar);
      setCargas((prev) => prev.filter((c) => c.id !== idParaEliminar));
      toast.success("Activo Eliminado", { id: toastId });
    } catch (error) {
      toast.error("Error en Eliminación", { id: toastId });
    } finally {
      setIdParaEliminar(null);
    }
  };

  // Columnas con Semántica Operativa y Tipografía Mono
  const columns: ColumnDef<FuelLoadDisplay>[] = useMemo(
    () => [
      {
        key: "fecha_hora",
        header: "Timestamp",
        render: (v) => (
          <div className="flex flex-col animate-in fade-in duration-500">
            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-[11px]">
              {new Date(String(v)).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              {new Date(String(v)).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
        ),
      },
      {
        key: "tipo_combustible",
        header: "Vector",
        render: (v) => (
          <Badge
            variant="outline"
            className={cn(
              "gap-2 px-3 py-1 rounded-full border-none font-black text-[9px] tracking-[0.1em]",
              v === "diesel"
                ? "bg-amber-500/10 text-amber-600 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]"
                : "bg-blue-500/10 text-blue-600",
            )}
          >
            {v === "diesel" ? <Fuel size={12} /> : <Droplets size={12} />}
            {String(v).toUpperCase()}
          </Badge>
        ),
      },
      {
        key: "unidad_numero",
        header: "Asset ID",
        render: (v) => (
          <span className="font-mono font-black text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-xs tracking-tight">
            ECO-{v}
          </span>
        ),
      },
      {
        key: "litros",
        header: "Volumen",
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono font-black text-sm",
                row.excede_tanque
                  ? "text-rose-600 animate-pulse"
                  : "text-slate-700 dark:text-slate-300",
              )}
            >
              {Number(v).toFixed(1)}{" "}
              <span className="text-[10px] opacity-50">L</span>
            </span>
            {row.excede_tanque && (
              <AlertTriangle className="h-3 w-3 text-rose-500" />
            )}
          </div>
        ),
      },
      {
        key: "total",
        header: "Inversión",
        render: (v) => (
          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm tracking-tighter">
            ${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "odometro",
        header: "Métrica Km",
        render: (v) => (
          <div className="flex items-center gap-2 text-slate-500">
            <Activity size={12} />
            <span className="font-mono text-[11px] font-bold">
              {Number(v).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        key: "evidencia_url",
        header: "Asset Doc",
        render: (v) =>
          v ? (
            <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black tracking-widest px-2">
              VERIFIED
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-rose-400 border-rose-400/30 text-[8px] font-black tracking-widest px-2"
            >
              MISSING
            </Badge>
          ),
      },
      {
        key: "acciones",
        header: "",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 haptic-press"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl border-slate-200 dark:border-white/10 bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl"
            >
              <DropdownMenuItem
                onClick={() => setCargaToView(row)}
                className="cursor-pointer font-bold uppercase text-[10px] py-2.5"
              >
                <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" /> Consultar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCargaToEdit(row)}
                className="cursor-pointer font-bold uppercase text-[10px] py-2.5"
              >
                <Pencil className="h-3.5 w-3.5 mr-2 text-emerald-500" />{" "}
                Refactorizar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 focus:bg-rose-50 font-bold uppercase text-[10px] py-2.5"
                onClick={() => setIdParaEliminar(row.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin h-16 w-16 text-brand-red" />
      </div>
    );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] dark:bg-brand-navy/30 min-h-screen animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <PageHeader
          title="Consola de Combustible"
          description="Auditoría técnica de rendimientos y suministro de activos"
          className="heading-crisp"
        />

        {/* TOOLBAR TAHOE: Sunken Industrial */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-[1.2rem] border border-slate-200 dark:border-white/10 shadow-inner">
          <div className="flex items-center gap-3 px-4 border-r border-slate-100 dark:border-white/5">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar unidad o terminal..."
              className="border-none shadow-none focus-visible:ring-0 text-[11px] font-bold uppercase w-[220px] bg-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0 font-black uppercase text-[10px] tracking-widest text-brand-navy dark:text-white bg-transparent">
              <SelectValue placeholder="Flota Completa" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem
                value="all"
                className="font-bold text-[10px] uppercase"
              >
                Flota Completa
              </SelectItem>
              {units.map((u) => (
                <SelectItem
                  key={u.id}
                  value={String(u.id)}
                  className="font-mono text-[10px]"
                >
                  ECO-{u.numero_economico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI GRID: macOS Tahoe Glass Widgets */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "Volumen Semanal",
            val: `${statsAuditoria.litros.toLocaleString()} L`,
            icon: Fuel,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Inversión Ledger",
            val: `$${statsAuditoria.inversion.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Performance Real",
            val: `${statsAuditoria.rendimiento} km/L`,
            icon: BarChart3,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Último Odómetro",
            val: `${statsAuditoria.odoActual.toLocaleString()} km`,
            icon: Gauge,
            color: "text-slate-200",
            bg: "bg-white/10",
            dark: true,
          },
        ].map((kpi, i) => (
          <Card
            key={i}
            className={cn(
              "border-none shadow-2xl backdrop-blur-xl rounded-[2rem] transition-all hover:scale-[1.02] hover:ring-1 hover:ring-white/20",
              kpi.dark
                ? "bg-brand-navy text-white"
                : "bg-white/90 dark:bg-slate-900/90",
            )}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-[9px] font-black uppercase tracking-[0.25em] opacity-60",
                      kpi.dark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-mono font-black tracking-tighter">
                    {kpi.val}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                    kpi.bg,
                  )}
                >
                  <kpi.icon className={kpi.color} size={24} strokeWidth={2.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SECCIÓN DE DATOS: Liquid Glass Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="h-1 w-8 bg-brand-red rounded-full" /> Registro
            Maestro de Cargas
          </h3>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-red hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-[0.15em] h-12 px-8 rounded-2xl shadow-[0_10px_20px_-5px_rgba(239,68,68,0.3)] haptic-press transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} className="mr-2 stroke-[3]" /> Nuevo Vale Industrial
          </Button>
        </div>

        <Card className="border-none shadow-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20 dark:border-white/5">
          <CardContent className="p-0">
            <EnhancedDataTable
              data={filteredCargas}
              columns={columns as any}
              onRowClick={(row) => setCargaToView(row)}
              className="liquid-glass"
            />
          </CardContent>
        </Card>
      </div>

      {/* COMPONENTES DE DIÁLOGO REFACTORIZADOS */}
      <AddTicketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddTicket as any}
      />
      {cargaToView && (
        <ViewCargaModal
          open={!!cargaToView}
          onOpenChange={() => setCargaToView(null)}
          carga={cargaToView as any}
        />
      )}
      {cargaToEdit && (
        <EditCargaModal
          open={!!cargaToEdit}
          onOpenChange={() => setCargaToEdit(null)}
          carga={cargaToEdit as any}
          units={units as any}
          operators={operators as any}
          onSave={loadData}
        />
      )}

      <AlertDialog
        open={!!idParaEliminar}
        onOpenChange={(o) => !o && setIdParaEliminar(null)}
      >
        <AlertDialogContent className="rounded-[2rem] bg-white/95 dark:bg-brand-navy/95 backdrop-blur-2xl border-none shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-black uppercase tracking-tighter text-2xl flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <Trash2 size={24} />
              </div>{" "}
              ¿Eliminar Asset?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-bold text-sm">
              Esta operación es irreversible. Los datos de rendimiento km/L de
              la unidad ECO-
              {cargas.find((c) => c.id === idParaEliminar)?.unidad_numero} serán
              recalculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="rounded-xl h-11 font-black uppercase text-[10px] tracking-widest border-slate-200">
              Abortar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 font-black uppercase text-[10px] tracking-widest haptic-press"
            >
              Confirmar Purga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CombustibleCargas;
