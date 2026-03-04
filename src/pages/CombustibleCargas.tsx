// src/pages/CombustibleCargas.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";

import type { CargaCombustible, TipoCombustible } from "@/data/combustibleData";

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

/** =========================================================
 * Tipos y Helpers
 * ========================================================= */
type ID = string | number;

interface Unit {
  id: ID;
  numero_economico?: string | null;
  placas?: string | null;
  tipo_1?: string | null;
  capacidad_tanque_diesel?: number | null;
  capacidad_tanque_urea?: number | null;
}

function unitLabel(u: Unit) {
  const ne = (u.numero_economico ?? "").trim();
  const pl = (u.placas ?? "").trim();
  if (ne && pl) return `${ne} (${pl})`;
  if (ne) return ne;
  if (pl) return pl;
  return `Unidad ${String(u.id)}`;
}

const CombustibleCargas = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [cargas, setCargas] = useState<CargaCombustible[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idParaEliminar, setIdParaEliminar] = useState<string | null>(null);

  //  ESTADOS DE FILTRO Y AUDITORÍA (Proceso Gustavo)
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<CargaCombustible | null>(null);
  const [cargaToEdit, setCargaToEdit] = useState<CargaCombustible | null>(null);

  /** =========================================================
   * 1) Carga masiva de datos y normalización
   * ========================================================= */
  const loadData = async () => {
    try {
      const [uData, oData, fData] = await Promise.all([
        unitService.getAll(),
        operatorService.getAll(),
        fuelService.getAll(),
      ]);

      setUnits(uData || []);
      setOperators(oData || []);

      const normalizedFuel = (fData || []).map((item: any) => ({
        ...item,
        tipoCombustible: item.tipo_combustible || item.tipoCombustible,
        fechaHora: item.fecha_hora || item.fechaHora,
        precioPorLitro: item.precio_por_litro || item.precioPorLitro,
        excedeTanque: item.excede_tanque ?? item.excedeTanque,
        evidenciaUrl: item.evidencia_url || item.evidenciaUrl,
        unidadNumero: item.unit?.numero_economico || "N/A",
        operadorNombre: item.operator?.name || "N/A",
      }));

      setCargas(normalizedFuel);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al sincronizar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /** =========================================================
   *  LÓGICA DE AUDITORÍA: RENDIMIENTOS Y REMANENTES
   * ========================================================= */

  const filteredCargas = useMemo(() => {
    return cargas.filter((c) => {
      const matchesUnit =
        selectedUnitId === "all" || String(c.unidadId) === selectedUnitId;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.unidadNumero?.toLowerCase().includes(term) ||
        c.estacion?.toLowerCase().includes(term);
      return matchesUnit && matchesSearch;
    });
  }, [cargas, selectedUnitId, searchTerm]);

  const statsAuditoria = useMemo(() => {
    const ahora = new Date();
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Solo tomamos en cuenta los últimos 7 días para el dashboard de rendimiento
    const cargasSemana = filteredCargas.filter(
      (c) => new Date(c.fechaHora) >= hace7Dias,
    );

    const litros = cargasSemana.reduce((sum, c) => sum + (c.litros || 0), 0);
    const inversion = cargasSemana.reduce((sum, c) => sum + (c.total || 0), 0);

    // Cálculo de odómetro (Diferencia entre la carga más nueva y la más antigua de la semana)
    const sorted = [...cargasSemana].sort(
      (a, b) =>
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
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

  /** =========================================================
   * 2) Handlers
   * ========================================================= */
  const handleAddTicket = async (data: TicketFormData) => {
    const toastId = toast.loading("Registrando ticket...");
    try {
      await fuelService.create(data);
      await loadData();
      toast.success("Ticket registrado correctamente", { id: toastId });
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Error al guardar ticket", { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!idParaEliminar) return;
    const toastId = toast.loading("Eliminando registro...");
    try {
      await fuelService.delete(idParaEliminar);
      setCargas((prev) => prev.filter((c) => String(c.id) !== idParaEliminar));
      toast.success("Registro eliminado", { id: toastId });
    } catch (error) {
      toast.error("No se pudo eliminar", { id: toastId });
    } finally {
      setIdParaEliminar(null);
    }
  };

  /** =========================================================
   *  Columnas de la Tabla
   * ========================================================= */
  const columns: ColumnDef<CargaCombustible>[] = useMemo(
    () => [
      {
        key: "fechaHora",
        header: "Fecha y Hora",
        render: (v) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-700">
              {new Date(String(v)).toLocaleDateString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(String(v)).toLocaleTimeString()}
            </span>
          </div>
        ),
      },
      {
        key: "tipoCombustible",
        header: "Tipo",
        render: (v) => (
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              v === "diesel"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-sky-50 text-sky-700 border-sky-200",
            )}
          >
            {v === "diesel" ? (
              <Fuel className="h-3 w-3" />
            ) : (
              <Droplets className="h-3 w-3" />
            )}
            {String(v).toUpperCase()}
          </Badge>
        ),
      },
      {
        key: "unidadNumero",
        header: "Unidad",
        render: (v) => (
          <Badge variant="secondary" className="font-black">
            {v}
          </Badge>
        ),
      },
      {
        key: "litros",
        header: "Litros",
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono font-bold",
                row.excedeTanque && "text-rose-600",
              )}
            >
              {Number(v).toFixed(1)} L
            </span>
            {row.excedeTanque && (
              <AlertTriangle className="h-3 w-3 text-rose-500 animate-pulse" />
            )}
          </div>
        ),
      },
      {
        key: "total",
        header: "Monto",
        render: (v) => (
          <span className="font-bold text-emerald-700">
            ${Number(v).toLocaleString()}
          </span>
        ),
      },
      {
        key: "odometro",
        header: "Odómetro",
        render: (v) => (
          <div className="flex items-center gap-1 text-slate-500">
            <Gauge className="h-3 w-3" />
            <span className="font-mono text-xs">
              {Number(v).toLocaleString()} km
            </span>
          </div>
        ),
      },
      {
        key: "evidenciaUrl",
        header: "Ticket",
        render: (v) =>
          v ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
              OK
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-slate-300 border-slate-200"
            >
              Falta
            </Badge>
          ),
      },
      {
        key: "acciones",
        header: "",
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCargaToView(row)}>
                <Eye className="h-4 w-4 mr-2" />
                Detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCargaToEdit(row)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setIdParaEliminar(String(row.id))}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-brand-navy" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Bitácora de Combustible"
          description="Control semanal de cargas, rendimientos y remanentes"
        />

        {/*  FILTROS DE AUDITORÍA (Lógica Gustavo) */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-2 border-r pr-4 pl-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar unidad, estación u operador..."
              className="border-none shadow-none focus-visible:ring-0 text-xs w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0 font-bold text-brand-navy">
              <SelectValue placeholder="Todas las unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las unidades</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  Eco-{u.numero_economico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUnitId !== "all" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedUnitId("all")}
            >
              <FilterX className="h-4 w-4 text-slate-400" />
            </Button>
          )}
        </div>
      </div>

      {/*  DASHBOARD DE RENDIMIENTO (Gustavo min 16:24) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-md bg-white group hover:ring-2 hover:ring-amber-500/20 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  Litros (7 días)
                </p>
                <p className="text-2xl font-black text-brand-navy">
                  {statsAuditoria.litros.toLocaleString()} L
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Fuel className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-[60%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white group">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  Inversión Semanal
                </p>
                <p className="text-2xl font-black text-emerald-600">
                  ${statsAuditoria.inversion.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Basado en tickets cargados
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white group">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  Rendimiento Real
                </p>
                <p className="text-2xl font-black text-blue-600">
                  {statsAuditoria.rendimiento}{" "}
                  <span className="text-xs">km/L</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Diferencia de odómetros / Litros
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-brand-navy text-white group">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                  Último Odómetro
                </p>
                <p className="text-2xl font-black">
                  {statsAuditoria.odoActual.toLocaleString()}{" "}
                  <span className="text-xs">km</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-300 mt-2">
              Cierre de bitácora actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/*  ALERTA DE CONTROL PARA UNIDADES DE PATIO (Min 02:53) */}
      {selectedUnitId !== "all" &&
        selectedUnitObj?.tipo_1?.toLowerCase().includes("patio") && (
          <Alert className="bg-indigo-50 border-indigo-200 rounded-2xl shadow-sm">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <AlertDescription className="text-indigo-900 text-xs flex justify-between items-center w-full">
              <span>
                <strong>Control de Patio Registrado:</strong> Esta unidad opera
                bajo esquema de carga semanal. Consumo proyectado:{" "}
                <strong>~{(statsAuditoria.litros / 7).toFixed(1)} L/día</strong>
                .
              </span>
              <Badge className="bg-indigo-600 text-white border-none px-3">
                Revision Semanal Activa
              </Badge>
            </AlertDescription>
          </Alert>
        )}

      {/* TOOLBAR Y TABLA */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-navy" /> Historial de
          Movimientos
        </h3>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-navy hover:bg-brand-navy/90 gap-2 shadow-lg shadow-brand-navy/20 h-10 px-6 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Registrar Vale / Ticket
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <EnhancedDataTable
            data={filteredCargas}
            columns={columns}
            onRowClick={(row) => setCargaToView(row)}
            exportFileName="auditoria_combustible"
          />
        </CardContent>
      </Card>

      {/* MODALES */}
      <AddTicketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddTicket}
        units={units}
        operators={operators}
      />

      <ViewCargaModal
        open={!!cargaToView}
        onOpenChange={() => setCargaToView(null)}
        carga={cargaToView}
      />

      <EditCargaModal
        open={!!cargaToEdit}
        onOpenChange={() => setCargaToEdit(null)}
        carga={cargaToEdit}
        units={units}
        operators={operators}
        onSave={loadData}
      />

      <AlertDialog
        open={!!idParaEliminar}
        onOpenChange={(o) => !o && setIdParaEliminar(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-brand-navy font-black">
              ¿Eliminar registro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y afectará el cálculo de rendimiento
              km/L de la unidad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white rounded-xl"
            >
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CombustibleCargas;
