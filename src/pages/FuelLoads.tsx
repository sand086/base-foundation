import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Fuel,
  Plus,
  AlertTriangle,
  TrendingUp,
  Gauge,
  Droplets,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";

// Tipos y Servicios
import { Unit } from "@/features/units/types";
import { Operator } from "@/features/operators/types";
import { FuelLoad } from "@/features/settlements/types";
import {
  AddTicketModal,
  type TicketFormData,
} from "@/features/settlements/components/AddTicketModal";
import { ViewFuelModal } from "@/features/settlements/components/ViewFuelModal";
import { EditFuelModal } from "@/features/settlements/components/EditFuelModal";
import {
  EnhancedDataTable,
  type ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fuelService } from "@/features/settlements/services/fuelService";
import { FleetUnitsService, FleetOperatorsService } from "@/api/generated";
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

interface FuelLoadDisplay extends FuelLoad {
  unidad_numero: string;
  operador_nombre: string;
  excede_tanque: boolean;
}

const FuelLoads = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [cargas, setCargas] = useState<FuelLoadDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idParaEliminar, setIdParaEliminar] = useState<number | null>(null);

  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<FuelLoadDisplay | null>(null);
  const [cargaToEdit, setCargaToEdit] = useState<FuelLoadDisplay | null>(null);

  const loadData = async () => {
    try {
      const [uData, oData, fData] = await Promise.all([
        FleetUnitsService.readUnitsApiFleetUnitsGet() as Promise<any>,
        FleetOperatorsService.readOperatorsApiFleetOperatorsGet() as Promise<any>,
        fuelService.getAll(),
      ]);

      // 1. Aseguramos que siempre sean arrays antes de usarlos
      const safeUnits = uData || [];
      const safeOperators = oData || [];
      const safeFuel = fData || [];

      setUnits(safeUnits);
      setOperators(safeOperators);

      // 2. Usamos los arrays seguros para el mapeo
      const normalizedFuel: FuelLoadDisplay[] = safeFuel.map((item: any) => {
        const unit = safeUnits.find((u: Unit) => u.id === item.unit_id);

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
      });
      setCargas(normalizedFuel);
    } catch (error) {
      // 3. Imprimimos el error real en consola para saber qué falló en la API
      console.error("  Error real en loadData:", error);
      toast.error("Fallo de Sincronización de informacion. Intente de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  //  NUEVA FUNCIÓN PARA GUARDAR EL TICKET
  const handleCreateTicket = async (data: any) => {
    const ticketsArray = data.tickets || [];

    // Obtenemos los tramos seleccionados. Si no hay, dejamos un array con un null para que el loop corra 1 vez (Carga de patio general).
    const legIds =
      data.trip_leg_ids && data.trip_leg_ids.length > 0
        ? data.trip_leg_ids
        : [null];
    const divisor = legIds.length;

    if (ticketsArray.length === 0) {
      toast.error("No hay tickets para guardar");
      return;
    }

    const totalPeticiones = ticketsArray.length * divisor;
    const toastId = toast.loading(
      `Distribuyendo y guardando ${totalPeticiones} registro(s) en el Ledger...`,
    );

    try {
      // 1. Recorremos el arreglo de tickets que mandó el Modal
      for (const ticket of ticketsArray) {
        // 2. LÓGICA CORE: Dividimos los litros equitativamente entre los viajes/tramos seleccionados
        const litrosDistribuidos =
          (Number(ticket.litros_diesel) || 0) / divisor;

        // 3. Iteramos por cada tramo (leg) seleccionado para crear un registro en BD por cada uno
        for (const legId of legIds) {
          const formData = new FormData();

          formData.append("unit_id", String(data.unit_id));
          formData.append("operator_id", String(data.operator_id));
          formData.append("odometro", String(data.odometro || 0));
          formData.append("fecha_hora", String(ticket.fecha_hora));
          formData.append("estacion", ticket.estacion || "No especificada");

          // Enviamos los litros fraccionados
          formData.append("litros_diesel", String(litrosDistribuidos));
          formData.append("precio_diesel", String(ticket.precio_diesel || 0));

          // Campos opcionales de vinculación
          if (data.trip_id && data.trip_id !== "none") {
            formData.append("trip_id", String(data.trip_id));
          }

          if (legId && legId !== "undefined") {
            formData.append("trip_leg_id", String(legId));
          }

          if (ticket.evidencia) {
            formData.append("file", ticket.evidencia);
          }

          // 4. Se lo mandamos a tu servicio
          await fuelService.create(formData);
        }
      }

      // Si todo sale bien, cerramos el modal y recargamos la tabla
      setIsModalOpen(false);
      await loadData();
      toast.success(
        `Éxito: Vales distribuidos correctamente en ${divisor} fase(s).`,
        {
          id: toastId,
        },
      );
    } catch (error) {
      console.error("Error al guardar tickets:", error);
      toast.error("Fallo al guardar", {
        id: toastId,
        description: "Revisa tu conexión y que todos los campos estén llenos.",
      });
    }
  };

  // Solo filtramos por Unidad. La búsqueda global de texto se delega al EnhancedDataTable
  const filteredCargas = useMemo(() => {
    if (selectedUnitId === "all") return cargas;
    return cargas.filter((c) => String(c.unit_id) === selectedUnitId);
  }, [cargas, selectedUnitId]);

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

  const columns: ColumnDef<FuelLoadDisplay>[] = useMemo(
    () => [
      {
        key: "fecha_hora",
        header: "Timestamp",
        render: (v) => (
          <div className="flex flex-col font-mono">
            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-[11px]">
              {new Date(String(v)).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-[9px] text-slate-400 tracking-widest uppercase">
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
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[9px] tracking-[0.1em] shadow-inner",
              v === "diesel"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            )}
          >
            {v === "diesel" ? (
              <Fuel size={12} strokeWidth={3} />
            ) : (
              <Droplets size={12} strokeWidth={3} />
            )}
            {String(v).toUpperCase()}
          </div>
        ),
      },
      {
        key: "unidad_numero",
        header: "ID",
        render: (v) => {
          // El string 'v' ya viene formateado correctamente desde nuestra función loadData
          return (
            <span className="font-mono font-black text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-xs tracking-tight">
              {v} {/*  Antes decía ECO-{v}, ahora lo dejamos limpio */}
            </span>
          );
        },
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
          <span className="font-mono text-[11px] font-bold text-slate-500">
            {Number(v).toLocaleString()} KM
          </span>
        ),
      },
      {
        key: "evidencia_url",
        header: "Status Ticket",
        render: (v) =>
          v ? (
            <Badge className="bg-emerald-500 dark:bg-emerald-600 text-white border-none text-[8px] font-black tracking-widest px-2 shadow-sm">
              VALIDATED
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-rose-400 border-rose-400/30 text-[8px] font-black tracking-widest px-2 uppercase bg-rose-50 dark:bg-rose-500/10 shadow-sm"
            >
              Missing Evidence
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
                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press"
              >
                <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
            >
              <DropdownMenuItem
                onClick={() => setCargaToView(row)}
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" /> Consultar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCargaToEdit(row)}
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Pencil className="h-4 w-4 text-brand-green dark:text-[#009740]" /> Refactorizar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                onClick={() => setIdParaEliminar(row.id)}
              >
                <Trash2 className="h-4 w-4" /> Purgar Registro
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
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-brand-navy">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-brand-red" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Iniciando Consola Industrial...
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-6 md:p-8 space-y-8 bg-white/80 dark:bg-brand-navy/95 backdrop-blur-2xl min-h-screen animate-in fade-in duration-700">
      {/* CAPA 2: HEADER TAHOE CON CONTROLES MAESTROS */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <PageHeader
          title="Consola de Combustible"
          description="Monitoreo de rendimientos técnicos y flujo energético de flota"
          className="heading-crisp mb-0"
        />

        {/* BARRA DE ACCIÓN MAESTRA (Filtro + Botón) */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className="w-[200px] h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-black uppercase text-[10px] tracking-widest text-slate-700 dark:text-white shadow-inner rounded-xl haptic-press">
              <SelectValue placeholder="FILTRO DE FLOTA" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-3xl bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl">
              <SelectItem
                value="all"
                className="font-black text-[10px] uppercase"
              >
                Flota Completa
              </SelectItem>
              {units.map((u) => (
                <SelectItem
                  key={u.id}
                  value={String(u.id)}
                  className="font-mono text-[10px] font-bold"
                >
                  ECO-{u.numero_economico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-red hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-[0.15em] h-11 px-6 rounded-xl shadow-[0_5px_15px_-5px_rgba(239,68,68,0.5)] haptic-press transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
          >
            <Plus size={16} className="mr-2 stroke-[3]" /> Registrar Ticket
          </Button>
        </div>
      </div>

      {/* CAPA 3: CUERPO (KPI GRID - VERDADEROS INDICADORES TAHOE) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Volumen Semanal",
            val: `${statsAuditoria.litros.toLocaleString()} L`,
            icon: Fuel,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            metric: "Consumo 7d",
          },
          {
            label: "Inversión Ledger",
            val: `$${statsAuditoria.inversion.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            metric: "Capital 7d",
          },
          {
            label: "Performance Real",
            val: `${statsAuditoria.rendimiento} KM/L`,
            icon: BarChart3,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            dark: false,
            metric: "Flota Promedio",
          },
        ].map((kpi, i) => (
          <Card
            key={i}
            className={cn(
              "border-none shadow-xl backdrop-blur-xl rounded-[2rem] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
              kpi.dark
                ? "bg-brand-navy text-white"
                : "bg-white/90 dark:bg-slate-900/95",
            )}
          >
            {/* Glow reflectante decorativo */}
            <div
              className={cn(
                "absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none",
                kpi.bg.replace("/10", ""),
              )}
            />

            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p
                    className={cn(
                      "text-[9px] font-black uppercase tracking-[0.25em] opacity-70",
                      kpi.dark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-mono font-black tracking-tighter">
                    {kpi.val}
                  </p>
                </div>
                {/* ICON PLATE TAHOE */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                    kpi.bg,
                  )}
                >
                  <kpi.icon className={kpi.color} size={24} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between w-full">
                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mr-3">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      kpi.color.replace("text", "bg"),
                    )}
                    style={{ width: "75%" }}
                  />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">
                  {kpi.metric}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ALERTAS OPERATIVAS (Capa 3 Continúa) */}
      {selectedUnitId !== "all" &&
        selectedUnitObj?.tipo_1?.toLowerCase().includes("patio") && (
          <Alert className="bg-indigo-500/10 border-indigo-500/20 rounded-2xl shadow-sm animate-in zoom-in-95">
            <Activity className="h-4 w-4 text-indigo-500" />
            <AlertDescription className="text-indigo-900 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wide flex justify-between items-center w-full px-2">
              <span>
                Protocolo de Patio: Carga semanal proyectada ~
                {(statsAuditoria.litros / 7).toFixed(1)} L/día
              </span>
              <Badge className="bg-indigo-600 text-white border-none px-3 text-[9px] shadow-sm">
                Registro de detalles Activa
              </Badge>
            </AlertDescription>
          </Alert>
        )}

      {/* SECCIÓN DE DATOS: Liquid Glass Table */}
      <div className="space-y-4 pt-4">
        {/* LA TABLA: Liquid Glass con Garantía de Header Gris */}
        <Card className="border-none shadow-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/20 dark:border-white/5 ring-1 ring-slate-200/50 dark:ring-white/5">
          <CardContent className="p-0">
            {/* Inyectamos la clase que fuerza el thead gris para la tabla */}
            <div className="[&_thead_tr]:bg-slate-100/90 [&_thead_tr]:dark:bg-slate-900/95">
              <EnhancedDataTable
                data={filteredCargas}
                columns={columns as any}
                onRowClick={(row) => setCargaToView(row)}
                className="liquid-glass-standard"
                searchPlaceholder="BUSCAR UNIDAD O TERMINAL..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COMPONENTES DE DIÁLOGO */}
      <AddTicketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreateTicket}
      />
      {cargaToView && (
        <ViewFuelModal
          open={!!cargaToView}
          onOpenChange={() => setCargaToView(null)}
          carga={cargaToView as any}
        />
      )}
      {cargaToEdit && (
        <EditFuelModal
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
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Purgar Registro
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Irreversible • Bitácora Combustible
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Esta acción es irreversible y afectará el historial de rendimiento
                de la unidad ECO-
                <span className="text-slate-900 dark:text-white font-black ml-1">
                  {cargas.find((c) => c.id === idParaEliminar)?.unidad_numero}
                </span>.
              </p>
              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Datos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  El registro será eliminado permanentemente del activo digital. <b className="font-black">¿Desea proceder?</b>
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Abortar Operación
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Confirmar Purga
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FuelLoads;
