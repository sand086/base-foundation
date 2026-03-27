// src/features/tarifas/CatalogoCasetas.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

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

import type { TollBooth } from "@/types/api.types";
import { tollService } from "@/services/tollService";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormaPago = "tag" | "efectivo" | "ambos";

type TollForm = {
  nombre: string;
  carretera: string;
  estado: string;
  origen_tramo: string;
  destino_tramo: string;
  tramo: string;
  costo_5_ejes_sencillo: number;
  costo_9_ejes_full: number;
  forma_pago: FormaPago;
};

const emptyForm = (): TollForm => ({
  nombre: "",
  carretera: "",
  estado: "",
  origen_tramo: "",
  destino_tramo: "",
  tramo: "",
  costo_5_ejes_sencillo: 0,
  costo_9_ejes_full: 0,
  forma_pago: "ambos",
});

const splitTramo = (tramoRaw: string) => {
  const tramo = (tramoRaw ?? "").trim();
  const parts = tramo.includes("-")
    ? tramo.split("-").map((p) => p.trim())
    : [tramo, ""];
  return { tramo, origen: parts[0] ?? "", destino: parts[1] ?? "" };
};

export const CatalogoCasetas = () => {
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

  const [formData, setFormData] = useState<TollForm>(emptyForm());

  // 🚀 CÁLCULO DE KPIs
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
          className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border-blue-200"
        >
          Solo TAG
        </Badge>
      );
    if (format === "EFECTIVO")
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border-amber-200"
        >
          Efectivo
        </Badge>
      );
    return (
      <Badge
        variant="outline"
        className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-emerald-200"
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

  useEffect(() => {
    if (!showAdvanced) return;
    if (formData.origen_tramo || formData.destino_tramo) {
      setFormData((prev) => ({
        ...prev,
        tramo: `${prev.origen_tramo} - ${prev.destino_tramo}`.trim(),
      }));
    } else if (formData.tramo) {
      setFormData((prev) => ({ ...prev, tramo: "" }));
    }
  }, [formData.origen_tramo, formData.destino_tramo, showAdvanced]);

  const handleOpenCreate = () => {
    setSelectedToll(null);
    setFormData(emptyForm());
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (toll: TollBooth) => {
    setSelectedToll(toll);
    const { tramo, origen, destino } = splitTramo(String(toll.tramo ?? ""));
    setShowAdvanced(Boolean(tramo.includes("-") && (origen || destino)));

    setFormData({
      nombre: toll.nombre ?? "",
      carretera: (toll as any).carretera ?? "",
      estado: (toll as any).estado ?? "",
      origen_tramo: origen,
      destino_tramo: destino,
      tramo,
      costo_5_ejes_sencillo: toll.costo_5_ejes_sencillo ?? 0,
      costo_9_ejes_full: toll.costo_9_ejes_full ?? 0,
      forma_pago: ((toll as any).forma_pago ?? "ambos") as FormaPago,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El Nombre de la caseta es obligatorio");
      return;
    }

    let finalTramo = formData.tramo.trim();
    if (showAdvanced) {
      if (formData.origen_tramo.trim() || formData.destino_tramo.trim()) {
        if (!formData.origen_tramo.trim() || !formData.destino_tramo.trim()) {
          toast.error("Completa Origen y Destino del tramo SCT");
          return;
        }
        finalTramo = `${formData.origen_tramo.trim()} - ${formData.destino_tramo.trim()}`;
      } else {
        finalTramo = formData.nombre.trim();
      }
    } else {
      finalTramo = formData.nombre.trim();
    }

    const payload: Partial<TollBooth> & {
      carretera?: string;
      estado?: string;
      forma_pago?: FormaPago;
    } = {
      nombre: formData.nombre.trim(),
      tramo: finalTramo,
      costo_5_ejes_sencillo: Number(formData.costo_5_ejes_sencillo || 0),
      costo_5_ejes_full: 0,
      costo_9_ejes_sencillo: 0,
      costo_9_ejes_full: Number(formData.costo_9_ejes_full || 0),
      carretera: formData.carretera.trim() || "",
      estado: formData.estado.trim() || "",
      forma_pago: formData.forma_pago,
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

  // 🚀 AQUI ESTÁ EL FIX DE ESLINT
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
      {/* 🚀 KPIs METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-navy/5 rounded-xl border border-brand-navy/10">
            <Route className="h-6 w-6 text-brand-navy" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Peajes
            </p>
            <p className="text-2xl font-black text-brand-navy leading-none mt-1">
              {kpis.total}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Costo Prom. Full
            </p>
            <p className="text-xl font-black text-emerald-600 font-mono leading-none mt-1">
              {formatCurrency(kpis.avgFull)}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Calculator className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Costo Prom. Sencillo
            </p>
            <p className="text-xl font-black text-blue-600 font-mono leading-none mt-1">
              {formatCurrency(kpis.avgSencillo)}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Map className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cobertura Nacional
            </p>
            <p className="text-2xl font-black text-amber-600 leading-none mt-1">
              {kpis.estados}{" "}
              <span className="text-xs font-bold text-amber-600/70">
                Estados
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* 🚀 TOOLBAR TAHOE */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/40 p-4 rounded-2xl border border-white/20 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3 w-full md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar peaje, tramo o carretera..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 glass-card border-slate-200 shadow-sm focus:ring-brand-red/20 font-medium"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 glass-card text-slate-500 hover:text-brand-navy shadow-sm"
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
              className="h-11 font-black uppercase text-[10px] tracking-widest animate-in fade-in zoom-in duration-200 shadow-lg shadow-destructive/20"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar ({selectedRows.size})
            </Button>
          )}

          <Button
            onClick={handleOpenCreate}
            className="btn-primary-gradient h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-brand-red/20 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Caseta
          </Button>
        </div>
      </div>

      {/* 🚀 TABLA LIQUID GLASS */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-sm shadow-xl liquid-glass-table">
        <div className="overflow-auto max-h-[60vh] custom-scrollbar">
          <Table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/5 border-b border-white/20">
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
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Sincronizando Catálogo...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tollBooths.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    No se encontraron casetas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                tollBooths.map((t) => (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "border-b border-white/10 interactive-row transition-all hover:bg-white/50",
                      selectedRows.has(t.id) && "bg-white/60 dark:bg-white/10",
                    )}
                  >
                    <TableCell className="w-14 pl-6">
                      <Checkbox
                        checked={selectedRows.has(t.id)}
                        onCheckedChange={() => toggleRow(t.id)}
                        className="border-slate-300 data-[state=checked]:bg-brand-navy data-[state=checked]:border-brand-navy"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-brand-navy text-sm uppercase tracking-tight">
                          {t.nombre}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {(t as any).carretera && (
                            <Badge
                              variant="outline"
                              className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-white/50 border-slate-200 shadow-sm"
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
                        className="font-mono text-[10px] bg-slate-50/80 text-slate-500 font-bold border-slate-200"
                      >
                        {String(t.tramo ?? t.nombre)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col border-l-2 border-blue-500 pl-3">
                          <span className="text-slate-400 uppercase font-black tracking-widest text-[8px]">
                            5 ejes (Sencillo)
                          </span>
                          <span className="text-blue-600 font-mono font-bold text-sm">
                            {formatCurrency(t.costo_5_ejes_sencillo ?? 0)}
                          </span>
                        </div>
                        <div className="flex flex-col border-l-2 border-emerald-500 pl-3">
                          <span className="text-slate-400 uppercase font-black tracking-widest text-[8px]">
                            9 Ejes (Full)
                          </span>
                          <span className="text-emerald-600 font-mono font-bold text-sm">
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
                            className="h-8 w-8 hover:bg-white/80 rounded-xl transition-all shadow-sm border border-slate-200/50 bg-white/50"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="glass-panel border-white/20 min-w-[160px] z-50"
                        >
                          <DropdownMenuItem
                            className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer"
                            onClick={() => handleOpenEdit(t)}
                          >
                            <Edit className="h-4 w-4 text-blue-500" /> Editar
                            Peaje
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 cursor-pointer"
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

      {/* 🚀 DIALOG CREAR / EDITAR (GLASS PANEL) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 glass-panel border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 bg-brand-navy/95 backdrop-blur-md text-white border-b border-white/10 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <DialogTitle className="relative z-10 flex items-center gap-2 text-2xl font-black uppercase tracking-tighter heading-crisp text-shadow-premium">
              <MapPin className="h-6 w-6 text-brand-red" />
              {selectedToll
                ? "Editar Peaje Autorizado"
                : "Alta de Nueva Caseta"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            <div className="space-y-8">
              {/* SECCIÓN 1: DATOS BÁSICOS */}
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1.5">
                  <Label variant="brand" required>
                    Identificador / Nombre de la Caseta
                  </Label>
                  <Input
                    placeholder="Ej: Caseta San Marcos"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="h-11 glass-card font-medium text-brand-navy"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="brand">Carretera / Vía</Label>
                  <Input
                    placeholder="Ej: Mex 150D"
                    value={formData.carretera}
                    onChange={(e) =>
                      setFormData({ ...formData, carretera: e.target.value })
                    }
                    className="h-11 glass-card font-mono uppercase font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="brand">Estado Geográfico</Label>
                  <Input
                    placeholder="Ej: Puebla"
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value })
                    }
                    className="h-11 glass-card font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-1.5 pt-2">
                  <Label variant="brand">Método de Cobro Permitido</Label>
                  <Select
                    value={formData.forma_pago}
                    onValueChange={(v) =>
                      setFormData({ ...formData, forma_pago: v as FormaPago })
                    }
                  >
                    <SelectTrigger className="h-11 glass-card font-bold w-full sm:w-1/2">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      <SelectItem value="tag">
                        Cobro Electrónico (TAG)
                      </SelectItem>
                      <SelectItem value="efectivo">Solo Efectivo</SelectItem>
                      <SelectItem value="ambos">
                        TAG y Efectivo Soportado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SECCIÓN 2: COSTOS OPERATIVOS */}
              <div className="space-y-4 pt-6 border-t border-slate-200/50">
                <h4 className="text-[12px] font-black uppercase tracking-widest text-brand-navy flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Tarifas
                  Operativas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 5 Ejes */}
                  <div className="space-y-3 p-5 rounded-2xl glass-card border border-blue-200/60 bg-blue-50/30">
                    <Label
                      variant="brand"
                      className="text-blue-800 border-b border-blue-100 pb-2 flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500" />{" "}
                      Tarifa 5 ejes (Sencillo)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        value={formData.costo_5_ejes_sencillo || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            costo_5_ejes_sencillo: Number(e.target.value),
                          })
                        }
                        className="h-11 pl-9 bg-white font-mono font-bold text-sm border-blue-200 focus:border-blue-500 shadow-sm"
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>
                  {/* 9 Ejes */}
                  <div className="space-y-3 p-5 rounded-2xl glass-card border border-emerald-200/60 bg-emerald-50/30">
                    <Label
                      variant="brand"
                      className="text-emerald-800 border-b border-emerald-100 pb-2 flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                      Tarifa 9 Ejes (Full)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        value={formData.costo_9_ejes_full || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            costo_9_ejes_full: Number(e.target.value),
                          })
                        }
                        className="h-11 pl-9 bg-white font-mono font-bold text-sm border-emerald-200 focus:border-emerald-500 shadow-sm"
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: AVANZADO SCT */}
              <div className="mt-4 bg-white/40 border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between p-4 bg-slate-100/50">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-brand-red" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
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
                    <div className="space-y-1.5">
                      <Label variant="brand">Punto de Origen</Label>
                      <Input
                        placeholder="Ej: Cd. México"
                        value={formData.origen_tramo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            origen_tramo: e.target.value,
                          })
                        }
                        className="h-10 glass-card"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label variant="brand">Punto de Destino</Label>
                      <Input
                        placeholder="Ej: Puebla"
                        value={formData.destino_tramo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            destino_tramo: e.target.value,
                          })
                        }
                        className="h-10 glass-card"
                      />
                    </div>
                    <div className="col-span-2 mt-2 bg-slate-100/50 p-3 rounded-xl text-center font-mono text-[11px] font-bold text-slate-500 border border-dashed border-slate-300">
                      IDENTIFICADOR GENERADO:{" "}
                      <span className="text-brand-navy">
                        {formData.tramo || "Esperando datos..."}
                      </span>
                    </div>
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
                      Si lo dejas vacío, el sistema guardará el{" "}
                      <b>Nombre principal</b> como identificador de tramo SCT.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white/60 backdrop-blur-md p-5 border-t border-slate-200/60 shrink-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-11 px-8 text-[11px] font-black uppercase tracking-widest text-slate-500 glass-card border-slate-200 hover:bg-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="btn-primary-gradient h-11 px-10 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {selectedToll ? "Actualizar Caseta" : "Confirmar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🚀 ALERTS DIALOGS (USAN COMPONENTE BASE TAHOE) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> ¿Eliminar Caseta del
              Catálogo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dependencies?.in_use ? (
                <>
                  <div className="mb-3">
                    ⚠️ Esta caseta actualmente está{" "}
                    <b>
                      asignada en {dependencies.rutas_count} ruta(s) armada(s)
                    </b>
                    .
                  </div>
                  <p className="mb-4">
                    ¿Deseas eliminarla también de esas rutas? (Se convertirá en
                    un "Tramo Libre" sin costo en las plantillas).
                  </p>
                  <p className="text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium text-xs leading-relaxed shadow-sm">
                    Tranquilo, sin importar lo que elijas,{" "}
                    <b>
                      los viajes despachados y liquidaciones históricas NO se
                      verán afectados
                    </b>
                    .
                  </p>
                </>
              ) : (
                "Esta caseta no está en uso actualmente. Se eliminará permanentemente del catálogo. ¿Deseas continuar?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {dependencies?.in_use ? (
              <>
                <AlertDialogAction
                  onClick={() => executeDelete(false)}
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm"
                >
                  No, lo haré manual
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => executeDelete(true)}
                  disabled={isSubmitting}
                  className="bg-destructive hover:bg-destructive/90 text-white border-none shadow-md"
                >
                  Sí, quitar de rutas
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => executeDelete(false)}
                disabled={isSubmitting}
                className="bg-destructive hover:bg-destructive/90 text-white border-none shadow-md"
              >
                Eliminar Permanentemente
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> ¿Eliminar{" "}
              {selectedRows.size} casetas?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Estás a punto de procesar múltiples casetas de forma simultánea.
              </p>
              <p className="mb-4">
                Las casetas libres serán eliminadas. Aquellas que ya estén
                asignadas a una ruta armada serán <b>ocultadas</b> del catálogo
                para proteger tu información, pero{" "}
                <b className="text-emerald-700">
                  no afectarán los viajes en curso
                </b>
                .
              </p>
              <p>
                ¿Deseas que el sistema también las{" "}
                <b>elimine automáticamente de las rutas armadas</b> donde están
                asignadas?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeBulkDelete(false)}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm"
            >
              No, conservar en rutas
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => executeBulkDelete(true)}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-white border-none shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Sí, quitar de rutas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
