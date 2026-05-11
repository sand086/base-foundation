import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Fuel,
  Plus,
  AlertTriangle,
  TrendingUp,
  Droplets,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  Activity,
  FilterX,
  Check,
  ChevronsUpDown,
  Lock,
  Zap,
  Truck,
} from "lucide-react";

// Tipos y Servicios
import { Unit } from "@/features/units/types";
import { Operator } from "@/features/operators/types";
import { FuelLoad } from "@/features/settlements/types";
import { AddTicketModal } from "@/features/settlements/components/AddTicketModal";
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

// IMPORTAMOS LOS VIAJES PARA REVISAR EL ESTATUS
import { useTrips } from "@/features/trips/hooks/useTrips";

interface FuelLoadDisplay extends FuelLoad {
  unidad_numero: string;
  operador_nombre: string;
  excede_tanque: boolean;
  is_conciliated?: boolean;
}

const FuelLoads = () => {
  // INYECTAMOS USTRIPS PARA EL BLINDAJE
  const { trips } = useTrips();

  const [units, setUnits] = useState<Unit[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [cargas, setCargas] = useState<FuelLoadDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idParaEliminar, setIdParaEliminar] = useState<number | null>(null);

  // ❄️ NUEVO: Estado para separar la vista de Tractos vs Motogeneradores
  const [equipmentFilter, setEquipmentFilter] = useState<"tracto" | "mg">(
    "tracto",
  );

  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [openUnitSearch, setOpenUnitSearch] = useState(false);

  const [dateFilter, setDateFilter] = useState<"hoy" | "historico">("hoy");

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedStation, setSelectedStation] = useState<string>("all");

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

      const safeUnits = uData || [];
      const safeOperators = oData || [];
      const safeFuel = fData || [];

      setUnits(safeUnits);
      setOperators(safeOperators);

      const normalizedFuel: FuelLoadDisplay[] = safeFuel.map((item: any) => {
        const unit = safeUnits.find(
          (u: Unit) => String(u.id) === String(item.unit_id),
        );
        const capacity =
          item.tipo_combustible === "diesel"
            ? unit?.capacidad_tanque_diesel || 800
            : unit?.capacidad_tanque_urea || 60;

        const isMoto =
          item.is_motogenerator === true ||
          String(item.is_motogenerator).toLowerCase() === "true" ||
          item.is_motogenerator === 1;

        return {
          ...item,
          unidad_numero:
            unit?.numero_economico ||
            item.unit?.numero_economico ||
            item.unit_id ||
            "N/A",
          operador_nombre:
            item.operator?.name || item.operator?.nombre || "Sin Operador",
          excede_tanque: Number(item.litros) > Number(capacity),
          is_conciliated: Boolean(item.is_conciliated),
          is_motogenerator: isMoto,
        };
      });
      setCargas(normalizedFuel);
    } catch (error) {
      console.error("Error real en loadData:", error);
      toast.error("Fallo de sincronización. Intente de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTicket = async (data: any) => {
    const ticketsArray = data.tickets || [];
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
    const toastId = toast.loading(`Guardando ${totalPeticiones} vale(s)...`);

    try {
      for (const ticket of ticketsArray) {
        const litrosDistribuidos =
          (Number(ticket.litros_diesel) || 0) / divisor;

        for (const legId of legIds) {
          const formData = new FormData();
          formData.append("unit_id", String(data.unit_id));
          formData.append("operator_id", String(data.operator_id));
          formData.append("fecha_hora", String(ticket.fecha_hora));
          formData.append("estacion", ticket.estacion || "No especificada");
          formData.append("litros_diesel", String(litrosDistribuidos));
          formData.append("precio_diesel", String(ticket.precio_diesel || 0));

          formData.append("is_motogenerator", String(data.is_motogenerator));

          if (data.is_motogenerator) {
            formData.append("odometro", "0");
            formData.append("horometro", String(data.horometro || 0));
          } else {
            formData.append("odometro", String(data.odometro || 0));
          }

          if (data.trip_id && data.trip_id !== "none")
            formData.append("trip_id", String(data.trip_id));
          if (legId && legId !== "undefined")
            formData.append("trip_leg_id", String(legId));
          if (ticket.evidencia) formData.append("file", ticket.evidencia);

          await fuelService.create(formData);
        }
      }

      setIsModalOpen(false);
      await loadData();
      toast.success(
        `Éxito: Vales guardados correctamente en ${divisor} fase(s).`,
        { id: toastId },
      );
    } catch (error) {
      console.error("Error al guardar tickets:", error);
      toast.error("Fallo al guardar", {
        id: toastId,
        description: "Revisa tu conexión y que todos los campos estén llenos.",
      });
    }
  };

  const estacionesUnicas = useMemo(() => {
    const ests = cargas.map((c) => c.estacion || "No especificada");
    return Array.from(new Set(ests)).sort();
  }, [cargas]);

  const filteredCargas = useMemo(() => {
    // ❄️ BLINDAJE: Filtramos PRIMERO por el TAB seleccionado (Tracto o MG)
    const baseFiltered = cargas.filter((c) =>
      equipmentFilter === "mg" ? c.is_motogenerator : !c.is_motogenerator,
    );

    let filtered = baseFiltered;

    if (selectedUnitId !== "all") {
      filtered = filtered.filter((c) => String(c.unit_id) === selectedUnitId);
    }

    const hoyStr = new Date().toLocaleDateString("es-MX");

    if (dateFilter === "hoy") {
      filtered = filtered.filter(
        (c) => new Date(c.fecha_hora).toLocaleDateString("es-MX") === hoyStr,
      );
    } else {
      filtered = filtered.filter(
        (c) => new Date(c.fecha_hora).toLocaleDateString("es-MX") !== hoyStr,
      );

      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter((c) => new Date(c.fecha_hora) >= fromDate);
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter((c) => new Date(c.fecha_hora) <= toDate);
      }
      if (selectedStation !== "all") {
        filtered = filtered.filter(
          (c) => (c.estacion || "No especificada") === selectedStation,
        );
      }
    }

    return filtered;
  }, [
    cargas,
    equipmentFilter,
    selectedUnitId,
    dateFilter,
    dateRange,
    selectedStation,
  ]);

  const statsAuditoria = useMemo(() => {
    const ahora = new Date();
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ❄️ BLINDAJE EN KPIs: Separamos matemáticamente los vales
    const cargasEquipo = cargas.filter((c) =>
      equipmentFilter === "mg" ? c.is_motogenerator : !c.is_motogenerator,
    );

    const todasLasCargasUnidad =
      selectedUnitId === "all"
        ? cargasEquipo
        : cargasEquipo.filter((c) => String(c.unit_id) === selectedUnitId);

    const cargasSemana = todasLasCargasUnidad.filter(
      (c) => new Date(c.fecha_hora) >= hace7Dias,
    );

    const litros = cargasSemana.reduce(
      (sum, c) => sum + (Number(c.litros) || 0),
      0,
    );
    const inversion = cargasSemana.reduce(
      (sum, c) => sum + (Number(c.total) || 0),
      0,
    );

    const sorted = [...cargasSemana].sort(
      (a, b) =>
        new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime(),
    );

    // ❄️ DETECCIÓN INTELIGENTE: Horómetro si es MG, Odómetro si es tracto
    const getOdo = (c: any) =>
      equipmentFilter === "mg"
        ? Number(c.horometro) || Number(c.odometro) || 0
        : Number(c.odometro) || 0;

    const odoActual = sorted.length > 0 ? getOdo(sorted[0]) : 0;
    const odoAnterior =
      sorted.length > 1 ? getOdo(sorted[sorted.length - 1]) : odoActual;
    const kmRecorridos = Math.abs(odoActual - odoAnterior); // Absoluto para evitar negativos

    const rendimiento =
      kmRecorridos > 0 && litros > 0
        ? (kmRecorridos / litros).toFixed(2)
        : "0.00";

    return { litros, inversion, odoActual, kmRecorridos, rendimiento };
  }, [cargas, selectedUnitId, equipmentFilter]);

  const selectedUnitObj = useMemo(
    () => units.find((u) => String(u.id) === selectedUnitId),
    [units, selectedUnitId],
  );

  const handleDelete = async () => {
    if (!idParaEliminar) return;
    const toastId = toast.loading("Eliminando vale...");
    try {
      await fuelService.delete(idParaEliminar);
      setCargas((prev) => prev.filter((c) => c.id !== idParaEliminar));
      toast.success("Vale eliminado correctamente", { id: toastId });
    } catch (error) {
      toast.error("Error al eliminar", { id: toastId });
    } finally {
      setIdParaEliminar(null);
    }
  };

  const ticketToDelete = useMemo(
    () => cargas.find((c) => c.id === idParaEliminar),
    [cargas, idParaEliminar],
  );

  const getTicketTripStatus = useCallback(
    (tripId: number | string | null | undefined) => {
      if (!tripId) return { isLiquidado: false };
      const trip = trips.find((t) => String(t.id) === String(tripId));
      if (!trip) return { isLiquidado: false };

      const isLiquidado =
        trip.status === "liquidado" ||
        trip.legs?.some((l) => l.status === "liquidado");

      return { isLiquidado: !!isLiquidado };
    },
    [trips],
  );

  const columns: ColumnDef<FuelLoadDisplay>[] = useMemo(
    () => [
      {
        key: "fecha_hora",
        header: "Fecha",
        type: "date",
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
        header: "Tipo",
        type: "status",
        statusOptions: ["diesel", "urea"],
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
        header: "ECO",
        render: (v, row) => (
          <span className="font-mono font-black text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-xs tracking-tight inline-flex items-center gap-1.5">
            {row.is_motogenerator ? (
              <>
                <Zap className="h-3 w-3 text-amber-500" />
                {v}
              </>
            ) : (
              <>
                <Truck className="h-3 w-3 text-slate-400" />
                ECO-{v}
              </>
            )}
          </span>
        ),
      },
      {
        key: "estacion",
        header: "Estación",
        render: (v) => (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px] block">
            {v || "No Especificada"}
          </span>
        ),
      },
      {
        key: "trip_id",
        header: "Viaje / Conciliación",
        render: (v, row) =>
          v ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 shadow-none text-[10px] font-mono">
                TRP-{v}
              </Badge>
              {row.is_conciliated && (
                <Lock className="h-3 w-3 text-emerald-500" />
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Patio / Sin Viaje
            </span>
          ),
      },
      {
        key: "litros",
        header: "Litros",
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
        header: "Costo Total",
        render: (v) => (
          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm tracking-tighter">
            ${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "odometro",
        // ❄️ CAMBIAMOS EL HEADER DINÁMICAMENTE
        header: equipmentFilter === "mg" ? "Horómetro (Hrs)" : "Odómetro (KM)",
        render: (v, row) => (
          <span className="font-mono text-[11px] font-bold text-slate-500 flex flex-col">
            {row.is_motogenerator ? (
              <>
                <span className="text-amber-600 dark:text-amber-500">
                  {Number(row.horometro || row.odometro || 0).toLocaleString()}{" "}
                  HRS
                </span>
                <span className="text-[8px] uppercase tracking-widest text-amber-500 opacity-80">
                  Horómetro
                </span>
              </>
            ) : (
              <>
                <span>{Number(v || 0).toLocaleString()} KM</span>
                <span className="text-[8px] uppercase tracking-widest text-slate-400">
                  Odómetro
                </span>
              </>
            )}
          </span>
        ),
      },
      {
        key: "operador_nombre",
        header: "Operador",
        render: (v) => (
          <span
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[180px] block"
            title={String(v)}
          >
            {v !== "N/A" ? v : "Sin Operador"}
          </span>
        ),
      },
      {
        key: "acciones",
        header: "",
        sortable: false,
        render: (_, row) => {
          const isLiquidado = getTicketTripStatus(row.trip_id).isLiquidado;

          return (
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
                  <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                  Detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (isLiquidado) {
                      toast.error("Bloqueo de Seguridad", {
                        description:
                          "No se puede editar un vale de un viaje liquidado. Primero cancela la liquidación y revierte la conciliación.",
                        duration: 6000,
                      });
                      return;
                    }
                    if (row.is_conciliated) {
                      toast.warning("⚠️ Vale Previamente Conciliado", {
                        description:
                          "Al editar este vale, los cálculos de dinero y odómetro quedarán desfasados. Deberás ir a la pestaña de Auditoría y hacer el recalculo.",
                        duration: 8000,
                      });
                    }
                    setCargaToEdit(row);
                  }}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Pencil className="h-4 w-4 text-brand-green dark:text-[#009740]" />{" "}
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                  onClick={() => {
                    if (isLiquidado) {
                      toast.error("Bloqueo de Seguridad", {
                        description:
                          "No se puede eliminar un vale de un viaje liquidado. Primero cancela la liquidación y revierte la conciliación para poder eliminarlo.",
                        duration: 6000,
                      });
                      return;
                    }
                    setIdParaEliminar(row.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [getTicketTripStatus, equipmentFilter], // Added equipmentFilter to dependencies
  );

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-brand-navy">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-brand-red" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Cargando vales...
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-6 md:p-8 space-y-8 bg-white/80 dark:bg-brand-navy/95 backdrop-blur-2xl min-h-screen animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <PageHeader
          title="Vales de Combustible"
          description="Monitoreo de rendimientos técnicos y flujo energético de flota"
          className="heading-crisp mb-0"
        />

        {/* ❄️ NUEVO: SELECTOR DE TRACTO VS MOTOGENERADOR */}
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={equipmentFilter}
            onValueChange={(v) => setEquipmentFilter(v as "tracto" | "mg")}
          >
            <TabsList className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner border border-slate-200/50 dark:border-white/5">
              <TabsTrigger
                value="tracto"
                className="font-bold text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" /> Tractocamiones
              </TabsTrigger>
              <TabsTrigger
                value="mg"
                className="font-bold text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-500 data-[state=active]:shadow-sm transition-all"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Motogeneradores
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Popover open={openUnitSearch} onOpenChange={setOpenUnitSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openUnitSearch}
                className="w-[280px] h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-black uppercase text-[10px] tracking-widest text-slate-700 dark:text-white shadow-inner rounded-xl justify-between haptic-press"
              >
                {selectedUnitId === "all"
                  ? "FLOTA COMPLETA"
                  : units.find((u) => String(u.id) === selectedUnitId)
                    ? `${equipmentFilter === "mg" ? "MG" : "ECO"}-${units.find((u) => String(u.id) === selectedUnitId)?.numero_economico}`
                    : "SELECCIONAR UNIDAD..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl">
              <Command>
                <CommandInput
                  placeholder="Buscar por ECO u Operador..."
                  className="h-11 text-xs font-bold"
                />
                <CommandList className="custom-scrollbar max-h-[300px]">
                  <CommandEmpty className="py-6 text-center text-xs font-bold text-slate-500">
                    No se encontraron coincidencias.
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="flota completa todos"
                      onSelect={() => {
                        setSelectedUnitId("all");
                        setOpenUnitSearch(false);
                      }}
                      className="font-black text-[10px] uppercase cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-brand-red",
                          selectedUnitId === "all"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      FLOTA COMPLETA
                    </CommandItem>

                    {units.map((u) => {
                      const cargaAsociada = cargas.find(
                        (c) => String(c.unit_id) === String(u.id),
                      );
                      const operador = cargaAsociada
                        ? cargaAsociada.operador_nombre
                        : "Sin Operador";

                      return (
                        <CommandItem
                          key={u.id}
                          value={`eco-${u.numero_economico} ${operador}`}
                          onSelect={() => {
                            setSelectedUnitId(String(u.id));
                            setOpenUnitSearch(false);
                          }}
                          className="font-mono text-[10px] font-bold cursor-pointer flex items-center"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-brand-red",
                              selectedUnitId === String(u.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span>ECO-{u.numero_economico}</span>
                            <span className="text-[8px] text-slate-500 tracking-widest uppercase font-sans mt-0.5">
                              {operador}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-red hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-[0.15em] h-11 px-6 rounded-xl shadow-[0_5px_15px_-5px_rgba(239,68,68,0.5)] haptic-press transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
          >
            <Plus size={16} className="mr-2 stroke-[3]" /> Registrar Ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Volumen Semanal",
            val: `${statsAuditoria.litros.toLocaleString()} L`,
            icon: Fuel,
            color:
              equipmentFilter === "mg" ? "text-amber-500" : "text-blue-500",
            bg: equipmentFilter === "mg" ? "bg-amber-500/10" : "bg-blue-500/10",
            metric: "Consumo 7d",
          },
          {
            label: "Gasto Total",
            val: `$${statsAuditoria.inversion.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            metric: "Capital 7d",
          },
          {
            label: `Rendimiento Real (${equipmentFilter === "mg" ? "Horas" : "KMs"})`,
            val: `${statsAuditoria.rendimiento} ${equipmentFilter === "mg" ? "hr/L" : "KM/L"}`,
            icon: BarChart3,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            dark: false,
            metric:
              equipmentFilter === "mg" ? "Promedio por Hora" : "Flota Promedio",
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

      {/* SECCIÓN DE DATOS Y PESTAÑAS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center">
          <Tabs
            value={dateFilter}
            onValueChange={(v) => setDateFilter(v as "hoy" | "historico")}
            className="w-[300px]"
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
              <TabsTrigger value="hoy" className="rounded-lg font-bold text-xs">
                Hoy
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-lg font-bold text-xs"
              >
                Histórico
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="border-none shadow-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/20 dark:border-white/5 ring-1 ring-slate-200/50 dark:ring-white/5">
          <CardContent className="p-0">
            <div className="[&_thead_tr]:bg-slate-100/90 [&_thead_tr]:dark:bg-slate-900/95">
              <EnhancedDataTable
                data={filteredCargas}
                columns={columns as any}
                onRowClick={(row) => setCargaToView(row)}
                className="liquid-glass-standard"
                searchPlaceholder="Búsqueda rápida..."
                customFilters={
                  dateFilter === "historico" && (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                      <Select
                        value={selectedStation}
                        onValueChange={setSelectedStation}
                      >
                        <SelectTrigger className="w-[180px] h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm rounded-xl">
                          <SelectValue placeholder="Estación..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl bg-white dark:bg-slate-900">
                          <SelectItem value="all" className="font-bold text-xs">
                            Todas las estaciones
                          </SelectItem>
                          {estacionesUnicas.map((est) => (
                            <SelectItem
                              key={est}
                              value={est}
                              className="text-xs uppercase"
                            >
                              {est}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DateRangePicker
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        placeholder="Rango de fechas"
                        className="w-[280px]"
                      />

                      {(dateRange?.from ||
                        dateRange?.to ||
                        selectedStation !== "all") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDateRange(undefined);
                            setSelectedStation("all");
                          }}
                          className="h-11 w-11 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
                          title="Limpiar filtros"
                        >
                          <FilterX size={18} />
                        </Button>
                      )}
                    </div>
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
                  Eliminar Vale
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Permanente
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              {/* ALERTA DE REVERSIÓN DE CONCILIACIÓN */}
              {ticketToDelete?.is_conciliated ? (
                <div className="p-5 sm:p-6 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                      Atención: Vale Auditado
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                    Conciliación Operativa Este vale ya fue procesado en la mesa
                    de control <b>(Conciliación)</b>. Al eliminarlo, los
                    cálculos financieros y de odómetro del viaje quedarán
                    desfasados.
                    <br />
                    <br />
                    Deberás ir a la pestaña de Auditoría, <b>Revertir</b> la
                    fase del viaje afectado y hacer el recálculo completo de
                    nuevo.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Esta acción es irreversible y afectará el historial de
                  rendimiento de la unidad ECO-
                  <span className="text-slate-900 dark:text-white font-black ml-1">
                    {ticketToDelete?.unidad_numero}
                  </span>
                  .
                </p>
              )}

              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Confirmación de Eliminación
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  El vale será borrado permanentemente del sistema.{" "}
                  <b className="font-black">¿Deseas continuar?</b>
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
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar Vale
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FuelLoads;
