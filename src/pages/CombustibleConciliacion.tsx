import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  Search,
  BarChart3,
  Activity,
  CheckCircle,
  CheckCircle2,
  Calculator,
  Truck,
  User,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Printer,
  RefreshCw,
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
import { useTrips } from "@/hooks/useTrips";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import axiosClient from "@/api/axiosClient";

// ============================================================================
// INTERFACES
// ============================================================================
interface FuelLoadDisplay extends FuelLoad {
  unidad_numero: string;
  operador_nombre: string;
  excede_tanque: boolean;
}

interface AuditFormData {
  litrosVales: string;
  lecturaInicialECM: string;
  lecturaFinalECM: string;
  litrosConsumidosECM: string;
}

// ============================================================================
// COMPONENTE TAB 1: REGISTRO MAESTRO DE VALES (CÓDIGO ORIGINAL)
// ============================================================================
const RegistroValesTab = () => {
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

          const isTracto =
            unit?.tipo_1?.toLowerCase().includes("tracto") ||
            unit?.tipo_1?.toLowerCase().includes("camion");
          const ecoRaw =
            item.unit?.numero_economico || unit?.numero_economico || "N/A";

          return {
            ...item,
            unidad_numero:
              isTracto && ecoRaw !== "N/A" ? `ECO-${ecoRaw}` : ecoRaw,
            operador_nombre:
              item.operator?.name || item.operator?.nombre || "N/A",
            excede_tanque: Number(item.litros) > Number(capacity),
          };
        },
      );

      setCargas(normalizedFuel);
    } catch (error) {
      console.error("Error sync:", error);
      toast.error(
        "Error de Sincronización de datos. Intente recargar la página.",
      );
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
        render: (v) => {
          return (
            <span className="font-mono font-black text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-xs tracking-tight">
              {v}
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
                className="h-8 w-8 haptic-press rounded-full"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl border-slate-200 dark:border-white/10 bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl shadow-2xl p-1"
            >
              <DropdownMenuItem
                onClick={() => setCargaToView(row)}
                className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" /> Consultar
                Asset
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCargaToEdit(row)}
                className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl text-brand-green hover:bg-brand-green/5 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 mr-2" /> Refactorizar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1" />
              <DropdownMenuItem
                className="text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10 font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl cursor-pointer"
                onClick={() => setIdParaEliminar(row.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Purgar Registro
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
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <PageHeader
          title="Consola de Combustible"
          description="Monitoreo de rendimientos técnicos y flujo energético de flota"
          className="heading-crisp mb-0"
        />

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
            metric: "Flota Promedio",
          },
          {
            label: "Certificación Auditoría",
            val: "Nivel A1",
            icon: ShieldCheck,
            color: "text-slate-200",
            bg: "bg-white/10",
            dark: true,
            metric: "Status Operativo",
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

      <div className="space-y-4 pt-4">
        <Card className="border-none shadow-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/20 dark:border-white/5 ring-1 ring-slate-200/50 dark:ring-white/5">
          <CardContent className="p-0">
            <div className="[&_thead_tr]:bg-slate-100/90 [&_thead_tr]:dark:bg-slate-900/95">
              <EnhancedDataTable
                data={filteredCargas}
                columns={columns as any}
                onRowClick={(row) => setCargaToView(row)}
                className="liquid-glass-standard"
                searchPlaceholder="BUSCAR UNIDAD O ESTACIÓN..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
        <AlertDialogContent className="rounded-[2.5rem] bg-white/95 dark:bg-brand-navy/98 backdrop-blur-2xl border-none shadow-3xl p-8">
          <AlertDialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-inner mb-2 animate-bounce">
              <Trash2 size={32} />
            </div>
            <AlertDialogTitle className="text-slate-900 dark:text-white font-black uppercase tracking-tighter text-3xl">
              Purgar Registro
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
              Esta acción es irreversible y afectará el historial de rendimiento
              de la unidad ECO-
              <span className="text-slate-900 dark:text-white font-black ml-1">
                {cargas.find((c) => c.id === idParaEliminar)?.unidad_numero}
              </span>
              . ¿Desea proceder con la eliminación del activo digital?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest border-slate-200 haptic-press">
              Abortar Operación
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl h-12 px-10 font-black uppercase text-[10px] tracking-widest haptic-press shadow-lg shadow-rose-500/20"
            >
              Confirmar Purga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ============================================================================
// COMPONENTE TAB 2: AUDITORÍA OPERATIVA (REDISEÑADA PARA DEPENDER DE LOS VALES)
// ============================================================================
const ConciliacionOperativaTab = () => {
  const { trips, fetchTrips } = useTrips();

  const { valueAsNumber: tolerancePct, isLoading: loadingTol } =
    useSystemConfig("tolerancia_diesel_pct");
  const { valueAsNumber: rendimientoConfig, isLoading: loadingRend } =
    useSystemConfig("rendimiento_diesel_esperado");
  const { value: empresaRfc } = useSystemConfig("empresa_rfc");

  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [formData, setFormData] = useState<AuditFormData>({
    litrosVales: "0", // 🚀 Ahora esto manda, eliminamos 'litrosBomba'
    lecturaInicialECM: "",
    lecturaFinalECM: "",
    litrosConsumidosECM: "",
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditCompleted, setAuditCompleted] = useState(false);
  const [isFetchingVales, setIsFetchingVales] = useState(false);

  const activeTrip = useMemo(() => {
    return trips.find((t) => String(t.id) === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const tripData = useMemo(() => {
    if (!activeTrip) return null;
    const leg = activeTrip.legs?.[0];
    return {
      cartaPorteId: activeTrip.public_id || `TRP-${activeTrip.id}`,
      unidadId: leg?.unit?.numero_economico || "Sin Unidad",
      ruta: `${activeTrip.origin} → ${activeTrip.destination}`,
      operador: leg?.operator?.name || "Sin Operador",
      fechaViaje: activeTrip.start_date
        ? new Date(activeTrip.start_date).toLocaleDateString()
        : "N/A",
    };
  }, [activeTrip]);

  // 🚀 FUNCIÓN PARA JALAR LOS VALES (TICKETS) DE LA BASE DE DATOS
  const fetchValesCombustible = async (tripIdToFetch: string) => {
    setIsFetchingVales(true);
    try {
      const response = await axiosClient.get("/fuel/fuel-logs");

      // Encontrar el viaje para saber cuáles son sus tramos
      const targetTrip = trips.find((t) => String(t.id) === tripIdToFetch);
      const legIds = targetTrip?.legs?.map((l: any) => String(l.id)) || [];

      const valesDiesel = response.data.filter((log: any) => {
        const isDiesel = log.tipo_combustible === "diesel";
        // Si el vale se asignó al viaje maestro o a alguno de sus tramos
        const isMatch =
          String(log.trip_id) === tripIdToFetch ||
          String(log.trip_leg_id) === tripIdToFetch ||
          legIds.includes(String(log.trip_leg_id));
        return isDiesel && isMatch;
      });

      const totalVales = valesDiesel.reduce(
        (sum: number, log: any) => sum + Number(log.litros),
        0,
      );

      setFormData((prev) => ({
        ...prev,
        litrosVales: totalVales.toString(),
      }));

      if (totalVales > 0) {
        toast.success("Vales Sincronizados", {
          description: `Se detectaron ${totalVales.toFixed(2)} L registrados en este viaje.`,
        });
      } else {
        toast.warning("Sin vales", {
          description: `No se encontraron vales de diésel asociados a este viaje.`,
        });
      }
    } catch (error) {
      console.error("Error sincronizando vales:", error);
      toast.error("Error de Sincronización", {
        description: "No se pudieron obtener los vales de la base de datos.",
      });
    } finally {
      setIsFetchingVales(false);
    }
  };

  const handleTripSelect = async (id: string) => {
    setSelectedTripId(id);
    setAuditCompleted(false);

    // Limpiamos todo al cambiar de viaje
    setFormData({
      litrosVales: "...",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });

    // Llamamos a la API
    await fetchValesCombustible(id);
  };

  const auditResult = useMemo(() => {
    // 🚀 AHORA EL TOTAL FÍSICO DEPENDE 100% DE LOS VALES (SISTEMA)
    const litrosVales = Number(formData.litrosVales) || 0;
    const totalFisicoLitros = litrosVales;

    const litrosConsumidosECM = Number(formData.litrosConsumidosECM) || 0;
    const lecturaInicial = Number(formData.lecturaInicialECM) || 0;
    const lecturaFinal = Number(formData.lecturaFinalECM) || 0;

    if (litrosConsumidosECM <= 0) return null;

    const totalDigitalLitros = litrosConsumidosECM;
    const diferenciaLitros = totalFisicoLitros - totalDigitalLitros;
    const kmsRecorridos =
      lecturaFinal > lecturaInicial ? lecturaFinal - lecturaInicial : 0;
    const rendimientoKmL =
      totalFisicoLitros > 0 ? kmsRecorridos / totalFisicoLitros : 0;
    const toleranciaPermitida = totalDigitalLitros * tolerancePct;

    let estatus: "CONCILIADO" | "COBRO_OPERADOR" | "PENDIENTE" = "PENDIENTE";
    let esRoboSospechado = false;

    if (totalFisicoLitros > 0) {
      if (diferenciaLitros > toleranciaPermitida) {
        estatus = "COBRO_OPERADOR";
        esRoboSospechado = true;
      } else {
        estatus = "CONCILIADO";
      }
    }

    return {
      totalFisicoLitros,
      totalDigitalLitros,
      diferenciaLitros,
      rendimientoKmL,
      toleranciaPermitida,
      estatus,
      esRoboSospechado,
    };
  }, [formData, tolerancePct]);

  const handleInputChange = (field: keyof AuditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setAuditCompleted(false);
  };

  const handleReset = () => {
    setSelectedTripId("");
    setFormData({
      litrosVales: "0",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });
    setAuditCompleted(false);
  };

  const handleAuthorizeAndClose = async () => {
    if (!auditResult || !activeTrip) return;
    setIsProcessing(true);

    try {
      // 🚀 ENVIAMOS LA INFO A LA BITÁCORA (Y AL BACKEND PARA QUE ACTUALICE LA UNIDAD)
      await axiosClient.post(`/trips/${selectedTripId}/timeline`, {
        status: auditResult.esRoboSospechado ? "incidencia" : "info",
        location: "Conciliación de Combustible",
        comments: `Auditoría con ${(tolerancePct * 100).toFixed(1)}% tol. Dif: ${auditResult.diferenciaLitros.toFixed(2)}L. Rend: ${auditResult.rendimientoKmL.toFixed(2)} km/L (Esp: ${rendimientoConfig}). Veredicto: ${auditResult.estatus}.`,
        odometro: formData.lecturaFinalECM
          ? Number(formData.lecturaFinalECM)
          : null,
        combustible_litros: auditResult.totalFisicoLitros, // 🚀 SE GUARDA EN BD (Unidad)
      });

      setAuditCompleted(true);
      setShowReceiptModal(true);

      toast.success("Auditoría Registrada", {
        description: auditResult.esRoboSospechado
          ? "Se ha generado una incidencia por exceso de consumo."
          : "Viaje conciliado exitosamente.",
      });

      await fetchTrips();
    } catch (error) {
      console.error("Error al conciliar:", error);
      toast.error("Error de Servidor", {
        description: "No se pudo guardar el veredicto de la auditoría.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-brand-navy">
            <Calculator className="h-6 w-6" /> Auditoría Físico vs ECM
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Auditoría de Rendimiento — Tolerancia:{" "}
            <span className="font-bold text-slate-900">
              {loadingTol ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `${(tolerancePct * 100).toFixed(1)}%`
              )}
            </span>
            | Rend. Base:{" "}
            <span className="font-bold text-slate-900">
              {loadingRend ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `${rendimientoConfig} km/L`
              )}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2 font-bold border-2"
        >
          <RotateCcw className="h-4 w-4" /> Resetear
        </Button>
      </div>

      {/* Selector de Viaje */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex items-center gap-4 bg-slate-50 rounded-xl">
          <Label className="font-bold text-slate-700 whitespace-nowrap flex items-center gap-2">
            <Search className="h-4 w-4" /> Buscar Viaje Finalizado:
          </Label>
          <Select value={selectedTripId} onValueChange={handleTripSelect}>
            <SelectTrigger className="bg-white border-slate-300 font-medium text-brand-navy max-w-xl h-11">
              <SelectValue placeholder="Seleccione un viaje para auditar..." />
            </SelectTrigger>
            <SelectContent>
              {trips
                .filter((t) => String(t.status).toLowerCase() !== "liquidado")
                .map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.public_id || t.id} | {t.origin} ➔ {t.destination} (
                    {t.status.toUpperCase()})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!tripData ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
          <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-500">
            Selecciona un viaje para iniciar la auditoría
          </p>
        </div>
      ) : (
        <>
          {/* Información del Viaje */}
          <Card className="border-l-4 border-l-brand-navy shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" /> Datos del Viaje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Folio Sistema
                  </Label>
                  <div className="font-mono font-bold bg-slate-100 p-2 rounded-md truncate">
                    {tripData.cartaPorteId}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Unidad
                  </Label>
                  <div className="font-bold bg-slate-100 p-2 rounded-md">
                    ECO-{tripData.unidadId}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Operador
                  </Label>
                  <div className="font-bold bg-slate-100 p-2 rounded-md truncate">
                    {tripData.operador}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    RFC Empresa
                  </Label>
                  <div className="font-mono font-bold bg-slate-100 p-2 rounded-md truncate">
                    {empresaRfc}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de Auditoría */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-amber-500 shadow-sm">
              <CardHeader className="bg-amber-50/50 pb-4 border-b border-amber-100">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <Fuel className="h-5 w-5" /> 1. Suministro Físico (Diésel)
                </CardTitle>
                <CardDescription>
                  Extraído automáticamente de los vales registrados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* 🚀 CAJA DE VALES (Fuente de Verdad) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-black uppercase tracking-widest text-slate-700 text-[10px]">
                      Suma de Vales (Sincronizado)
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest bg-white"
                      onClick={() => fetchValesCombustible(selectedTripId)}
                      disabled={isFetchingVales}
                    >
                      <RefreshCw
                        className={cn(
                          "h-3 w-3 mr-1.5",
                          isFetchingVales && "animate-spin",
                        )}
                      />
                      Refrescar
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      disabled
                      value={formData.litrosVales}
                      className="pr-12 pl-4 font-mono h-14 bg-amber-100/50 border-amber-200 text-2xl font-black text-amber-900"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-700/50 font-black text-xl">
                      L
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Dato calculado automáticamente buscando todos los vales de
                    diésel asignados a este viaje.
                  </p>
                </div>

                <Separator />
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-inner flex justify-between items-center">
                  <span className="text-[11px] font-black text-amber-800 uppercase tracking-widest">
                    Total Suministrado
                  </span>
                  <span className="text-3xl font-black font-mono text-amber-700">
                    {auditResult
                      ? auditResult.totalFisicoLitros.toFixed(2)
                      : "0.00"}{" "}
                    L
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500 shadow-sm">
              <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <Gauge className="h-5 w-5" /> 2. Lectura ECM (Computadora)
                </CardTitle>
                <CardDescription>Datos reportados por el motor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lecturaInicialECM" className="font-bold">
                      ODO Inicial
                    </Label>
                    <Input
                      id="lecturaInicialECM"
                      type="number"
                      value={formData.lecturaInicialECM}
                      onChange={(e) =>
                        handleInputChange("lecturaInicialECM", e.target.value)
                      }
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="lecturaFinalECM"
                      className="font-bold text-blue-600"
                    >
                      ODO Final *
                    </Label>
                    <Input
                      id="lecturaFinalECM"
                      type="number"
                      value={formData.lecturaFinalECM}
                      onChange={(e) =>
                        handleInputChange("lecturaFinalECM", e.target.value)
                      }
                      className="h-11 font-mono border-blue-200 bg-blue-50/50"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Label
                    htmlFor="litrosConsumidosECM"
                    className="font-bold text-blue-800 uppercase tracking-widest text-[10px]"
                  >
                    Litros Quemados (Lectura ECM) *
                  </Label>
                  <Input
                    id="litrosConsumidosECM"
                    type="number"
                    step="0.01"
                    value={formData.litrosConsumidosECM}
                    onChange={(e) =>
                      handleInputChange("litrosConsumidosECM", e.target.value)
                    }
                    className="h-12 border-blue-300 font-bold font-mono text-xl text-blue-900 bg-blue-50/30"
                  />
                </div>
                <Separator />
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-inner flex justify-between items-center">
                  <span className="text-[11px] font-black text-blue-800 uppercase tracking-widest">
                    Total Quemado
                  </span>
                  <span className="text-3xl font-black font-mono text-blue-700">
                    {auditResult
                      ? auditResult.totalDigitalLitros.toFixed(2)
                      : "0.00"}{" "}
                    L
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Veredicto del Algoritmo */}
          {auditResult && (
            <Card
              className={`transition-all duration-500 shadow-md ${auditResult.esRoboSospechado ? "border-2 border-red-500 bg-red-50/30" : "border-2 border-emerald-500 bg-emerald-50/30"}`}
            >
              <CardHeader className="text-center border-b pb-4 bg-white/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">
                  Resultado de Auditoría Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                      Desviación Neta
                    </p>
                    <p
                      className={`text-4xl font-black font-mono ${auditResult.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {auditResult.diferenciaLitros > 0 ? "+" : ""}
                      {auditResult.diferenciaLitros.toFixed(2)} L
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">
                      Margen ({(tolerancePct * 100).toFixed(1)}%): ±
                      {auditResult.toleranciaPermitida.toFixed(2)} L
                    </p>
                  </div>
                  <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                      Rendimiento Operativo
                    </p>
                    <p className="text-4xl font-black font-mono text-brand-navy">
                      {auditResult.rendimientoKmL.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">
                      Km/L (Vs Suministro Real)
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    {auditResult.esRoboSospechado ? (
                      <div className="animate-in zoom-in duration-300">
                        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-1 animate-pulse" />
                        <h3 className="text-sm font-black text-red-700 uppercase tracking-widest">
                          Faltante Excesivo
                        </h3>
                      </div>
                    ) : (
                      <div className="animate-in zoom-in duration-300">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-1" />
                        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest">
                          Consumo Validado
                        </h3>
                      </div>
                    )}
                    <Button
                      size="lg"
                      onClick={handleAuthorizeAndClose}
                      disabled={isProcessing}
                      className={`w-full font-black text-white shadow-xl ${auditResult.esRoboSospechado ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      {auditResult.esRoboSospechado
                        ? "REGISTRAR INCIDENCIA"
                        : "CERRAR AUDITORÍA"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ticket de Recibo */}
          <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
            <DialogContent className="max-w-md bg-white rounded-2xl">
              <DialogHeader className="text-center border-b pb-4">
                <DialogTitle
                  className={`text-xl font-black flex justify-center items-center gap-2 ${auditResult?.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                >
                  {auditResult?.esRoboSospechado ? (
                    <ShieldAlert />
                  ) : (
                    <CheckCircle />
                  )}{" "}
                  TICKET DE CONCILIACIÓN
                </DialogTitle>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  {new Date().toLocaleString("es-MX")}
                </p>
              </DialogHeader>
              {auditResult && (
                <div className="space-y-3 py-4 text-sm font-medium text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Folio Viaje:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {tripData.cartaPorteId}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Operador:</span>
                    <span className="font-bold text-slate-900 text-right">
                      {tripData.operador}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Rendimiento:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {auditResult.rendimientoKmL.toFixed(2)} Km/L
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Total Físico (Vales):</span>
                    <span className="font-mono">
                      {auditResult.totalFisicoLitros.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Total ECM:</span>
                    <span className="font-mono">
                      {auditResult.totalDigitalLitros.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between bg-slate-100 p-3 rounded-lg mt-4 font-black">
                    <span className="text-slate-800">DIFERENCIA:</span>
                    <span
                      className={
                        auditResult.esRoboSospechado
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    >
                      {auditResult.diferenciaLitros > 0 ? "+" : ""}
                      {auditResult.diferenciaLitros.toFixed(2)} L
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  className="w-full font-bold bg-slate-800 hover:bg-slate-900 text-white h-12"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" /> IMPRIMIR AUDITORÍA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE MAESTRO: CONTENEDOR DE PESTAÑAS
// ============================================================================
export default function CombustibleConciliacion() {
  const [activeTab, setActiveTab] = useState("vales");

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] dark:bg-brand-navy/30 min-h-screen animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <PageHeader
          title="Consola de Combustible y Auditoría"
          description="Gestión de vales, rendimientos y conciliación física vs ECM"
          className="heading-crisp"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl mb-6 shadow-sm">
          <TabsTrigger
            value="vales"
            className="rounded-xl text-xs font-black uppercase tracking-widest px-6 data-[state=active]:bg-brand-navy data-[state=active]:text-white transition-all"
          >
            Registro de Vales
          </TabsTrigger>
          <TabsTrigger
            value="conciliacion"
            className="rounded-xl text-xs font-black uppercase tracking-widest px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
          >
            Conciliación Operativa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vales" className="space-y-6 outline-none">
          <RegistroValesTab />
        </TabsContent>

        <TabsContent value="conciliacion" className="space-y-6 outline-none">
          <ConciliacionOperativaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
