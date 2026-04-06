// src/features/tarifas/TollBoothCatalog.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  MapPin,
  DollarSign,
  Loader2,
  Check,
  AlertTriangle,
  Route,
  RefreshCw,
  Calculator,
  Map,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Label genérico para fuera de forms

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { TollBooth } from "../types";
import { tollService } from "@/features/clients/services/tollService";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

//  1. ESQUEMA DE VALIDACIÓN ZOD
const tollSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  carretera: z.string().optional(),
  estado: z.string().optional(),
  origen_tramo: z.string().optional(),
  destino_tramo: z.string().optional(),
  costo_5_ejes_sencillo: z.coerce
    .number()
    .min(0, "Debe ser un número positivo")
    .optional()
    .default(0),
  costo_9_ejes_full: z.coerce
    .number()
    .min(0, "Debe ser un número positivo")
    .optional()
    .default(0),
  forma_pago: z.enum(["tag", "efectivo", "ambos"], {
    required_error: "Selecciona una forma de pago válida",
  }),
});

type TollFormData = z.infer<typeof tollSchema>;

const splitTramo = (tramoRaw: string) => {
  const tramo = (tramoRaw ?? "").trim();
  const parts = tramo.includes("-")
    ? tramo.split("-").map((p) => p.trim())
    : [tramo, ""];
  return { tramo, origen: parts[0] ?? "", destino: parts[1] ?? "" };
};

export const TollBoothCatalog = () => {
  const { value: monedaBase } = useSystemConfig("moneda_base");
  const [searchTerm, setSearchTerm] = useState("");
  const [tollBooths, setTollBooths] = useState<TollBooth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [selectedToll, setSelectedToll] = useState<TollBooth | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Avanzado SCT
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dependencies, setDependencies] = useState<{
    in_use: boolean;
    rutas_count: number;
  } | null>(null);

  //  2. REACT HOOK FORM
  const form = useForm<TollFormData>({
    resolver: zodResolver(tollSchema),
    defaultValues: {
      nombre: "",
      carretera: "",
      estado: "",
      origen_tramo: "",
      destino_tramo: "",
      costo_5_ejes_sencillo: 0,
      costo_9_ejes_full: 0,
      forma_pago: "ambos",
    },
  });

  const { watch, reset, setValue } = form;
  const currentOrigen = watch("origen_tramo");
  const currentDestino = watch("destino_tramo");
  const currentNombre = watch("nombre");

  const tramoGenerado = useMemo(() => {
    if (showAdvanced && (currentOrigen || currentDestino)) {
      return `${currentOrigen || ""} - ${currentDestino || ""}`.trim();
    }
    return currentNombre || "";
  }, [currentOrigen, currentDestino, currentNombre, showAdvanced]);

  //  KPIs
  const kpis = useMemo(() => {
    if (!tollBooths.length)
      return { total: 0, avgSencillo: 0, avgFull: 0, estados: 0 };

    const sumSencillo = tollBooths.reduce(
      (acc, t) => acc + (t.costo_5_ejes_sencillo || 0),
      0,
    );
    const sumFull = tollBooths.reduce(
      (acc, t) => acc + (t.costo_9_ejes_full || 0),
      0,
    );
    const estadosUnicos = new Set(
      tollBooths.map((t) => (t as any).estado?.toUpperCase()).filter(Boolean),
    );

    return {
      total: tollBooths.length,
      avgSencillo: sumSencillo / tollBooths.length,
      avgFull: sumFull / tollBooths.length,
      estados: estadosUnicos.size,
    };
  }, [tollBooths]);

  const getFormaPagoBadge = (formaPago: string) => {
    const format = formaPago?.toUpperCase() || "AMBOS";
    if (format === "TAG")
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
        >
          Solo TAG
        </Badge>
      );
    if (format === "EFECTIVO")
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
        >
          Efectivo
        </Badge>
      );
    return (
      <Badge
        variant="outline"
        className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
      >
        Tag/Efectivo
      </Badge>
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: monedaBase || "MXN",
    }).format(Number.isFinite(amount) ? amount : 0);

  const loadTolls = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await tollService.getTolls(searchTerm);
      setTollBooths(data ?? []);
      setSelectedRows(new Set());
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el catálogo de peajes");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadTolls();
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleOpenCreate = () => {
    setSelectedToll(null);
    reset({
      nombre: "",
      carretera: "",
      estado: "",
      origen_tramo: "",
      destino_tramo: "",
      costo_5_ejes_sencillo: 0,
      costo_9_ejes_full: 0,
      forma_pago: "ambos",
    });
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (toll: TollBooth) => {
    setSelectedToll(toll);
    const { tramo, origen, destino } = splitTramo(String(toll.tramo ?? ""));
    setShowAdvanced(Boolean(tramo.includes("-") && (origen || destino)));
    type FormaPago = "tag" | "efectivo" | "ambos";

    reset({
      nombre: toll.nombre ?? "",
      carretera: (toll as any).carretera ?? "",
      estado: (toll as any).estado ?? "",
      origen_tramo: origen,
      destino_tramo: destino,
      costo_5_ejes_sencillo: toll.costo_5_ejes_sencillo ?? 0,
      costo_9_ejes_full: toll.costo_9_ejes_full ?? 0,
      forma_pago: ((toll as any).forma_pago ?? "ambos") as FormaPago,
    });
    setDialogOpen(true);
  };

  //  3. ONSUBMIT CON ZOD
  const onSubmit = async (data: TollFormData) => {
    const finalTramo = tramoGenerado;

    if (showAdvanced && (data.origen_tramo || data.destino_tramo)) {
      if (!data.origen_tramo || !data.destino_tramo) {
        toast.error("Completa Origen y Destino del tramo SCT");
        return;
      }
    }

    const payload = {
      nombre: data.nombre.trim(),
      tramo: finalTramo,
      costo_5_ejes_sencillo: data.costo_5_ejes_sencillo,
      costo_5_ejes_full: 0,
      costo_9_ejes_sencillo: 0,
      costo_9_ejes_full: data.costo_9_ejes_full,
      carretera: (data.carretera || "").trim(),
      estado: (data.estado || "").trim(),
      forma_pago: data.forma_pago,
    };

    setIsSubmitting(true);
    try {
      if (selectedToll) {
        await tollService.updateToll(selectedToll.id, payload as any);
        toast.success("Caseta actualizada con éxito");
      } else {
        await tollService.createToll(payload as any);
        toast.success("Caseta registrada correctamente");
      }
      await loadTolls();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al guardar la caseta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskDelete = async (toll: TollBooth) => {
    setSelectedToll(toll);
    setIsSubmitting(true);
    try {
      const deps = await tollService.checkDependencies(toll.id);
      setDependencies(deps);
      setDeleteDialogOpen(true);
    } catch (error) {
      toast.error("Error al verificar dependencias de la caseta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async (removeFromRoutes: boolean) => {
    if (!selectedToll) return;
    setIsSubmitting(true);
    try {
      await tollService.deleteToll(selectedToll.id, removeFromRoutes);
      toast.success(
        removeFromRoutes
          ? "Caseta eliminada y removida de rutas."
          : "Caseta eliminada (Mantenida en rutas).",
      );
      await loadTolls();
      setDeleteDialogOpen(false);
      setSelectedToll(null);
      setDependencies(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Error al eliminar la caseta",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeBulkDelete = async (removeFromRoutes: boolean) => {
    if (selectedRows.size === 0) return;
    setIsSubmitting(true);
    let successCount = 0,
      errorCount = 0;

    try {
      for (const id of Array.from(selectedRows)) {
        try {
          await tollService.deleteToll(id, removeFromRoutes);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
      if (successCount > 0)
        toast.success(
          removeFromRoutes
            ? `${successCount} casetas removidas totalmente.`
            : `${successCount} casetas archivadas.`,
        );
      if (errorCount > 0)
        toast.error(`Hubo problemas con ${errorCount} casetas.`);

      await loadTolls();
      setBulkDeleteDialogOpen(false);
      setSelectedRows(new Set());
    } catch (error) {
      toast.error("Ocurrió un error general durante la eliminación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRow = (id: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (selectedRows.size === tollBooths.length && tollBooths.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tollBooths.map((t) => t.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/*  KPIs METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* 1. TOTAL PEAJES */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-default"
        >
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Route className="h-6 w-6 text-brand-navy dark:text-slate-300" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Total Peajes
            </p>
            <p className="text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">
              {kpis.total}
            </p>
          </div>
        </Card>

        {/* 2. COSTO PROMEDIO FULL */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Promedio Full
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter leading-none mt-0.5">
              {formatCurrency(kpis.avgFull)}
            </p>
          </div>
        </Card>

        {/* 3. COSTO PROMEDIO SENCILLO */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Prom. Sencillo
            </p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tighter leading-none mt-0.5">
              {formatCurrency(kpis.avgSencillo)}
            </p>
          </div>
        </Card>

        {/* 4. COBERTURA NACIONAL */}
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-amber-300 dark:hover:border-amber-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Map className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Cobertura Nacional
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter">
                {kpis.estados}
              </p>
              <span className="text-[10px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">
                Estados
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/*  TOOLBAR TAHOE */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3 w-full md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar peaje, tramo o carretera..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-slate-200 dark:border-white/10 shadow-sm focus:ring-brand-red/20 bg-white dark:bg-slate-900"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 text-slate-500 dark:text-slate-400"
            onClick={() => loadTolls(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedRows.size > 0 && (
            <Button
              variant="destructive"
              size="lg"
              className="h-11 shadow-lg shadow-destructive/20 animate-in fade-in zoom-in duration-200 w-full sm:w-auto"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar ({selectedRows.size})
            </Button>
          )}
          <Button
            variant="default"
            size="lg"
            onClick={handleOpenCreate}
            className="h-11 shadow-lg shadow-brand-red/20 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Caseta
          </Button>
        </div>
      </div>

      {/*  TABLA LIQUID GLASS */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm shadow-xl liquid-glass-table">
        <div className="overflow-auto max-h-[60vh] custom-scrollbar">
          <Table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 backdrop-blur-xl bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-14 pl-6">
                  <Checkbox
                    checked={
                      selectedRows.size === tollBooths.length &&
                      tollBooths.length > 0
                    }
                    onCheckedChange={toggleAll}
                    className="border-slate-400 data-[state=checked]:bg-brand-navy data-[state=checked]:border-brand-navy"
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                  Identificación & Ubicación
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                  Tramo SCT / Referencia
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12">
                  Costos Autorizados
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 text-center">
                  Forma Pago
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 text-right pr-6">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="table-staggered">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-red/50" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Sincronizando Catálogo...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tollBooths.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                  >
                    No se encontraron casetas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                tollBooths.map((t) => (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "border-b border-slate-100 dark:border-white/5 interactive-row transition-all hover:bg-slate-50/50 dark:hover:bg-white/5",
                      selectedRows.has(t.id) && "bg-slate-50 dark:bg-white/10",
                    )}
                  >
                    <TableCell className="w-14 pl-6">
                      <Checkbox
                        checked={selectedRows.has(t.id)}
                        onCheckedChange={() => toggleRow(t.id)}
                        className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-brand-navy data-[state=checked]:border-brand-navy"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-brand-navy dark:text-slate-200 text-sm uppercase tracking-tight">
                          {t.nombre}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {(t as any).carretera && (
                            <Badge
                              variant="outline"
                              className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            >
                              Ruta {(t as any).carretera}
                            </Badge>
                          )}
                          {(t as any).estado && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {(t as any).estado}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-slate-200 dark:border-white/10"
                      >
                        {String(t.tramo ?? t.nombre)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col border-l-2 border-blue-500 pl-3">
                          <span className="text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest text-[8px]">
                            5 ejes (Sencillo)
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-mono font-bold text-sm">
                            {formatCurrency(t.costo_5_ejes_sencillo ?? 0)}
                          </span>
                        </div>
                        <div className="flex flex-col border-l-2 border-emerald-500 pl-3">
                          <span className="text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest text-[8px]">
                            9 Ejes (Full)
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">
                            {formatCurrency(t.costo_9_ejes_full ?? 0)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {getFormaPagoBadge((t as any).forma_pago)}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
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
                          className="glass-panel border-slate-200 dark:border-white/10 min-w-[160px] z-50 dark:bg-slate-900/90"
                        >
                          <DropdownMenuItem
                            className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                            onClick={() => handleOpenEdit(t)}
                          >
                            <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                            Editar Peaje
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="dark:bg-white/10" />
                          <DropdownMenuItem
                            className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                            onClick={() => handleAskDelete(t)}
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/*  DIALOG CREAR / EDITAR (FORMULARIO CON ZOD + RHF) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
          <DialogHeader className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 z-10">
            <DialogTitle className="flex items-center gap-3 text-slate-800 dark:text-white text-xl font-black">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                  selectedToll
                    ? "bg-amber-100 dark:bg-amber-900/30"
                    : "bg-emerald-100 dark:bg-emerald-900/30",
                )}
              >
                <MapPin
                  className={cn(
                    "h-6 w-6",
                    selectedToll
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                />
              </div>
              <div className="flex flex-col">
                {selectedToll
                  ? "Editar Peaje Autorizado"
                  : "Alta de Nueva Caseta"}
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 tracking-normal normal-case">
                  Configure los parámetros operativos y tarifas para el
                  enrutamiento SCT.
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/*  FORMULARIO ENVOLTURA */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto flex flex-col custom-scrollbar"
            >
              <div className="flex-1 p-6 bg-slate-50/50 dark:bg-transparent space-y-8">
                {/* SECCIÓN 1: DATOS BÁSICOS */}
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel variant="brand" required>
                          Identificador / Nombre de la Caseta
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Caseta San Marcos"
                            className="h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 font-bold text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="carretera"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Carretera / Vía</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Mex 150D"
                            className="h-11 font-mono uppercase font-bold tracking-widest bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Estado Geográfico</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Puebla"
                            className="h-11 font-bold bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="forma_pago"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel variant="brand" required>
                          Método de Cobro Permitido
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 font-bold w-full sm:w-1/2 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                            <SelectItem value="tag" className="font-bold">
                              Cobro Electrónico (TAG)
                            </SelectItem>
                            <SelectItem value="efectivo" className="font-bold">
                              Solo Efectivo
                            </SelectItem>
                            <SelectItem
                              value="ambos"
                              className="font-bold text-brand-blue dark:text-sky-400"
                            >
                              TAG y Efectivo Soportado
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* SECCIÓN 2: COSTOS OPERATIVOS */}
                <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />{" "}
                    Tarifas Operativas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="costo_5_ejes_sencillo"
                      render={({ field }) => (
                        <FormItem className="p-5 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-xl transition-colors hover:border-blue-300 dark:hover:border-blue-500/50">
                          <Label className="text-[9px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />{" "}
                            Tarifa 5 ejes (Sencillo)
                          </Label>
                          <div className="relative mt-3 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-slate-400 dark:text-slate-500">
                              $
                            </span>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                                className="h-auto p-0 text-3xl font-mono font-black text-slate-800 dark:text-white bg-transparent dark:bg-transparent border-none focus-visible:ring-0 hover:border-transparent hover:shadow-none shadow-none"
                                placeholder="0.00"
                                min={0}
                                step="0.01"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="costo_9_ejes_full"
                      render={({ field }) => (
                        <FormItem className="p-5 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-xl transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/50">
                          <Label className="text-[9px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                            Tarifa 9 Ejes (Full)
                          </Label>
                          <div className="relative mt-3 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-slate-400 dark:text-slate-500">
                              $
                            </span>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                                className="h-auto p-0 text-3xl font-mono font-black text-slate-800 dark:text-white bg-transparent dark:bg-transparent border-none focus-visible:ring-0 hover:border-transparent hover:shadow-none shadow-none"
                                placeholder="0.00"
                                min={0}
                                step="0.01"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* SECCIÓN 3: AVANZADO SCT */}
                <div className="mt-4 bg-white/60 dark:bg-slate-800/30 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
                  <div className="flex items-center justify-between p-4 bg-slate-100/80 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-brand-red dark:text-brand-red/80" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                        Configuración Avanzada (Homologación SCT)
                      </span>
                    </div>
                    <Switch
                      checked={showAdvanced}
                      onCheckedChange={setShowAdvanced}
                      className="data-[state=checked]:bg-brand-red"
                    />
                  </div>

                  {showAdvanced && (
                    <div className="p-5 grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormField
                        control={form.control}
                        name="origen_tramo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel variant="brand">
                              Punto de Origen
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: Cd. México"
                                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="destino_tramo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel variant="brand">
                              Punto de Destino
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: Puebla"
                                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="col-span-2 mt-2 bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-xl flex items-center justify-between border border-dashed border-slate-300 dark:border-white/20">
                        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                          IDENTIFICADOR GENERADO:
                        </span>
                        <span className="text-[11px] font-mono font-black text-brand-navy dark:text-white uppercase">
                          {tramoGenerado || "Esperando datos..."}
                        </span>
                      </div>
                      <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">
                        Si lo dejas vacío, el sistema guardará el{" "}
                        <b className="text-slate-600 dark:text-slate-300">
                          Nombre principal
                        </b>{" "}
                        como identificador de tramo SCT.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER DEL FORMULARIO */}
              <DialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
                <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setDialogOpen(false)}
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {selectedToll ? "Actualizar Caseta" : "Confirmar Registro"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/*  ALERT DIALOG - SINGLE DELETE */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col gap-1">
                <AlertDialogTitle className="text-rose-600 dark:text-rose-500 text-lg sm:text-2xl font-black uppercase tracking-tighter heading-crisp leading-none">
                  Eliminar Recurso Crítico
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Protocolo de Integridad de Catálogos • Rápidos 3T v2026
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block">
              {dependencies?.in_use ? (
                <div className="space-y-6">
                  <div className="p-5 sm:p-6 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                        Conflicto de Dependencia Detectado
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                      Esta caseta está vinculada activamente en{" "}
                      <b className="font-black underline">
                        {dependencies.rutas_count} ruta(s) configuradas
                      </b>
                      . Al eliminarla, el sistema la reclasificará
                      automáticamente como un{" "}
                      <span className="font-mono font-bold italic bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">
                        "Tramo Libre"
                      </span>{" "}
                      sin costo en los esquemas logísticos.
                    </p>
                  </div>

                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <div className="bg-emerald-500 rounded-full p-1.5 mt-0.5 shadow-lg shadow-emerald-500/20">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
                          Protección de Datos Históricos
                        </p>
                        <p className="text-[11px] sm:text-[12px] font-medium text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                          Las liquidaciones cerradas y viajes ya despachados{" "}
                          <b>permanecerán intactos</b> para auditoría
                          financiera.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-[0.2em] pt-4 border-t border-slate-100 dark:border-white/5">
                    Seleccione la acción de desvinculación técnica:
                  </p>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="mx-auto w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mb-6" />
                  <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    ¿Confirmar remoción definitiva?
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Este recurso no presenta dependencias activas. Se eliminará
                    permanentemente del catálogo de infraestructura operativa.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto flex-shrink-0"
              >
                Abortar Operación
              </AlertDialogCancel>

              {dependencies?.in_use ? (
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
                  <AlertDialogAction
                    variant="info"
                    size="lg"
                    onClick={() => executeDelete(false)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    Gestión Manual
                  </AlertDialogAction>
                  <AlertDialogAction
                    variant="destructive"
                    size="lg"
                    onClick={() => executeDelete(true)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex-shrink-0 shadow-rose-600/10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Limpiar y Borrar
                  </AlertDialogAction>
                </div>
              ) : (
                <AlertDialogAction
                  variant="destructive"
                  size="lg"
                  onClick={() => executeDelete(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex-shrink-0 sm:px-12"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "Confirmar Borrado Técnico"
                  )}
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*  ALERT DIALOG - BULK DELETE */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
                <div className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border-2 border-white dark:border-slate-900">
                  {selectedRows.size}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <AlertDialogTitle className="text-rose-600 dark:text-rose-500 text-lg sm:text-2xl font-black uppercase tracking-tighter heading-crisp leading-none">
                  Eliminación por Lotes
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Protocolo de Borrado Masivo • Rápidos 3T v2026
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block">
              <div className="space-y-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Estás a punto de procesar{" "}
                  <b className="text-slate-900 dark:text-white">
                    {selectedRows.size} casetas
                  </b>{" "}
                  de forma simultánea. Por favor, revisa la lógica de impacto:
                </p>

                <div className="p-5 sm:p-6 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                      Impacto en Rutas Armadas
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                    Las casetas libres se eliminarán permanentemente. Aquellas
                    que ya estén asignadas a una ruta serán{" "}
                    <b className="font-black underline">
                      ocultadas del catálogo
                    </b>{" "}
                    para proteger la integridad estructural de las plantillas
                    existentes.
                  </p>
                </div>

                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-500 rounded-full p-1.5 mt-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
                        Protección Operativa
                      </p>
                      <p className="text-[11px] sm:text-[12px] font-medium text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                        Esta operación en lote{" "}
                        <b>no afectará los viajes en curso</b> ni alterará los
                        costos calculados en liquidaciones previas.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-[0.2em] pt-4 border-t border-slate-100 dark:border-white/5">
                  ¿Deseas eliminar las casetas asignadas de sus rutas
                  automáticamente?
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto flex-shrink-0"
              >
                Abortar Operación
              </AlertDialogCancel>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
                <AlertDialogAction
                  variant="info"
                  size="lg"
                  onClick={() => executeBulkDelete(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  Conservar en Rutas
                </AlertDialogAction>

                <AlertDialogAction
                  variant="destructive"
                  size="lg"
                  onClick={() => executeBulkDelete(true)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex-shrink-0 shadow-rose-600/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Sí, Limpiar Todo
                </AlertDialogAction>
              </div>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
