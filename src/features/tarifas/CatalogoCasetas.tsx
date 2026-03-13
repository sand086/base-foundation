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
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";

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
import { toast } from "sonner";

type FormaPago = "tag" | "efectivo" | "ambos";

type TollForm = {
  nombre: string;
  carretera: string;
  estado: string;

  // Avanzado SCT (opcional)
  origen_tramo: string;
  destino_tramo: string;
  tramo: string;

  // UI simplificada (backend se queda igual)
  costo_5_ejes_sencillo: number; // UI: 5 ejes (Sencillo)
  costo_9_ejes_full: number; // UI: 9 Ejes (Full)

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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number.isFinite(amount) ? amount : 0,
  );

const splitTramo = (tramoRaw: string) => {
  const tramo = (tramoRaw ?? "").trim();
  const parts = tramo.includes("-")
    ? tramo.split("-").map((p) => p.trim())
    : [tramo, ""];
  return { tramo, origen: parts[0] ?? "", destino: parts[1] ?? "" };
};

export const CatalogoCasetas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tollBooths, setTollBooths] = useState<TollBooth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [selectedToll, setSelectedToll] = useState<TollBooth | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 ESTADO PARA SELECCIÓN MÚLTIPLE
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // ✅ Toggle avanzado SCT
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dependencies, setDependencies] = useState<{
    in_use: boolean;
    rutas_count: number;
  } | null>(null);

  const [formData, setFormData] = useState<TollForm>(emptyForm());

  const getFormaPagoBadge = (formaPago: string) => {
    const styles: Record<string, string> = {
      TAG: "bg-blue-100 text-blue-700 border-blue-200",
      EFECTIVO: "bg-amber-100 text-amber-700 border-amber-200",
      AMBOS: "bg-slate-100 text-slate-700 border-slate-200",
    };
    const cls = styles[formaPago] ?? styles.AMBOS;
    return <Badge className={`${cls} hover:opacity-80`}>{formaPago}</Badge>;
  };

  const loadTolls = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await tollService.getTolls(searchTerm);
      setTollBooths(data ?? []);
      // Limpiamos selección al recargar para evitar bugs
      setSelectedRows(new Set());
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el catálogo");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadTolls();
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // ✅ Solo construimos "tramo" en vivo si el usuario está en modo avanzado
  useEffect(() => {
    if (!showAdvanced) return;

    if (formData.origen_tramo || formData.destino_tramo) {
      setFormData((prev) => ({
        ...prev,
        tramo: `${prev.origen_tramo} - ${prev.destino_tramo}`.trim(),
      }));
    } else if (formData.tramo) {
      // Si apagaron el avanzado, dejamos el tramo limpio (se resolverá al guardar)
      setFormData((prev) => ({ ...prev, tramo: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.origen_tramo, formData.destino_tramo, showAdvanced]);

  // --- MANEJADORES ---
  const handleOpenCreate = () => {
    setSelectedToll(null);
    setFormData(emptyForm());
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (toll: TollBooth) => {
    setSelectedToll(toll);

    const { tramo, origen, destino } = splitTramo(String(toll.tramo ?? ""));

    // si viene "Origen - Destino" lo abrimos en modo avanzado para que lo vean
    const shouldOpenAdvanced = Boolean(
      tramo.includes("-") && (origen || destino),
    );
    setShowAdvanced(shouldOpenAdvanced);

    setFormData({
      nombre: toll.nombre ?? "",
      carretera: (toll as any).carretera ?? "",
      estado: (toll as any).estado ?? "",
      origen_tramo: origen,
      destino_tramo: destino,
      tramo,
      // ✅ Vista simplificada
      costo_5_ejes_sencillo: toll.costo_5_ejes_sencillo ?? 0,
      costo_9_ejes_full: toll.costo_9_ejes_full ?? 0,
      forma_pago: ((toll as any).forma_pago ?? "ambos") as FormaPago,
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {
    // 1) Validación mínima
    if (!formData.nombre.trim()) {
      toast.error("El Nombre de la caseta es obligatorio");
      return;
    }

    // 2) Resolver tramo para BD (NOT NULL)
    let finalTramo = formData.tramo.trim();

    if (showAdvanced) {
      const hasAny = Boolean(
        formData.origen_tramo.trim() || formData.destino_tramo.trim(),
      );
      if (hasAny) {
        if (!formData.origen_tramo.trim() || !formData.destino_tramo.trim()) {
          toast.error(
            "Completa Origen y Destino del tramo SCT si usas modo avanzado",
          );
          return;
        }
        finalTramo = `${formData.origen_tramo.trim()} - ${formData.destino_tramo.trim()}`;
      } else {
        // avanzado prendido pero vacío: default inteligente
        finalTramo = formData.nombre.trim();
      }
    } else {
      // avanzado apagado: default inteligente
      finalTramo = formData.nombre.trim();
    }

    // 3) Payload a backend:
    // - Mandamos solo las 2 tarifas útiles y “apagamos” las 2 que ya no se usan (0)
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
        toast.success("Caseta actualizada");
      } else {
        await tollService.createToll(payload as any);
        toast.success("Caseta registrada");
      }

      await loadTolls();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la caseta");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cuando le dan click al bote de basura de UNA caseta
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

  // La ejecución real del borrado (recibe la decisión del usuario)
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
    } catch (e) {
      toast.error("Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedToll) return;
    setIsSubmitting(true);
    try {
      // Suponiendo que el servicio devuelve la data del backend: { status: "archived", message: "..." }
      await tollService.deleteToll(selectedToll.id);

      // Mostrar mensaje genérico de éxito
      toast.success("Caseta procesada correctamente");

      await loadTolls();
      setDeleteDialogOpen(false);
      setSelectedToll(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 LÓGICA DE ELIMINACIÓN MASIVA ACTUALIZADA
  const executeBulkDelete = async (removeFromRoutes: boolean) => {
    if (selectedRows.size === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Iteramos sobre el Set y mandamos la petición por cada ID
      for (const id of Array.from(selectedRows)) {
        try {
          // Pasamos el ID y la decisión del usuario (false = Ocultar, true = Quitar de rutas)
          await tollService.deleteToll(id, removeFromRoutes);
          successCount++;
        } catch (error) {
          console.error(`Error eliminando caseta ${id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          removeFromRoutes
            ? `${successCount} casetas procesadas y removidas de rutas.`
            : `${successCount} casetas procesadas (Mantenidas en rutas).`,
        );
      }
      if (errorCount > 0) {
        toast.error(`Hubo problemas procesando ${errorCount} casetas.`);
      }

      await loadTolls();
      setBulkDeleteDialogOpen(false);
      setSelectedRows(new Set()); // Limpiar selección
    } catch (error) {
      toast.error("Ocurrió un error general durante la eliminación");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 LÓGICA DE CHECKBOXES
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
      setSelectedRows(new Set()); // Deseleccionar todos
    } else {
      setSelectedRows(new Set(tollBooths.map((t) => t.id))); // Seleccionar todos
    }
  };

  // ✅ UI tabla: solo 6 (sencillo) y 9 (full)
  const columns = useMemo(() => {
    const cols: Array<{
      key: string;
      header: string;
      render?: (value: any, row: TollBooth) => React.ReactNode;
    }> = [
      {
        key: "nombre",
        header: "Identificación",
        render: (_, t) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{t.nombre}</span>
          </div>
        ),
      },
      {
        key: "tramo",
        header: "Tramo SCT",
        render: (v, t) => (
          <Badge
            variant="outline"
            className="font-mono  bg-slate-50 text-slate-500 font-medium"
          >
            {String(v ?? t.nombre)}
          </Badge>
        ),
      },
      {
        key: "costos",
        header: "Tarifas Autorizadas",
        render: (_, t) => (
          <div className="grid grid-cols-2 gap-4  font-mono w-48">
            <div className="flex flex-col border-l-2 border-blue-500 pl-2">
              <span className="text-slate-500 uppercase font-bold text-[8px]">
                5 ejes (Sencillo)
              </span>
              <span className="text-blue-600 font-bold text-sm">
                {formatCurrency(t.costo_5_ejes_sencillo ?? 0)}
              </span>
            </div>
            <div className="flex flex-col border-l-2 border-emerald-500 pl-2">
              <span className="text-slate-500 uppercase font-bold text-[8px]">
                9 Ejes (Full)
              </span>
              <span className="text-emerald-600 font-bold text-sm">
                {formatCurrency(t.costo_9_ejes_full ?? 0)}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "forma_pago",
        header: "Pago",
        render: (_, t) => getFormaPagoBadge((t as any).forma_pago),
      },
      {
        key: "acciones",
        header: "",
        render: (_, t) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenEdit(t)}>
                <Edit className="h-4 w-4 mr-2 text-blue-600" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleAskDelete(t)} // <--- AQUI CAMBIÓ
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
    return cols;
  }, [tollBooths]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 flex-1 w-full sm:max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por caseta o tramo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 text-slate-500"
            onClick={() => loadTolls(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* 🚀 BOTÓN DE ELIMINACIÓN MASIVA (Aparece si hay selección) */}
          {selectedRows.size > 0 && (
            <Button
              variant="destructive"
              className="h-10 whitespace-nowrap animate-in fade-in zoom-in duration-200"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Selección ({selectedRows.size})
            </Button>
          )}

          <ActionButton
            onClick={handleOpenCreate}
            className="h-10 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Caseta
          </ActionButton>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        </div>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              {/* 🚀 CABECERA CHECKBOX */}
              <DataTableHead className="w-12">
                <Checkbox
                  checked={
                    selectedRows.size === tollBooths.length &&
                    tollBooths.length > 0
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </DataTableHead>
              {columns.map((c) => (
                <DataTableHead key={c.key}>{c.header}</DataTableHead>
              ))}
            </DataTableRow>
          </DataTableHeader>

          <DataTableBody>
            {tollBooths.map((t) => (
              <DataTableRow
                key={t.id}
                className={selectedRows.has(t.id) ? "bg-slate-50/50" : ""}
              >
                {/* 🚀 CELDA CHECKBOX */}
                <DataTableCell className="w-12">
                  <Checkbox
                    checked={selectedRows.has(t.id)}
                    onCheckedChange={() => toggleRow(t.id)}
                    aria-label={`Select row ${t.id}`}
                  />
                </DataTableCell>
                {columns.map((c) => (
                  <DataTableCell key={`${t.id}-${c.key}`}>
                    {c.render
                      ? c.render((t as any)[c.key], t)
                      : (t as any)[c.key]}
                  </DataTableCell>
                ))}
              </DataTableRow>
            ))}

            {tollBooths.length === 0 && !isLoading && (
              <DataTableRow>
                <DataTableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center text-slate-500"
                >
                  No se encontraron casetas.
                </DataTableCell>
              </DataTableRow>
            )}
          </DataTableBody>
        </DataTable>
      )}

      {/* DIALOG CREAR / EDITAR */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-t-4 border-t-primary p-0 overflow-hidden flex flex-col max-h-[95vh]">
          <DialogHeader className="p-6 pb-4 shrink-0 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-800">
              <MapPin className="h-6 w-6 text-primary" />
              {selectedToll ? "Editar Caseta" : "Alta de Caseta"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="space-y-6">
              {/* SECCIÓN 1: DATOS BÁSICOS */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Nombre de la Caseta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ej: San Marcos"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="bg-white border-slate-300 h-10 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Carretera (Opcional)
                  </Label>
                  <Input
                    placeholder="Ej: Mex 150D"
                    value={formData.carretera}
                    onChange={(e) =>
                      setFormData({ ...formData, carretera: e.target.value })
                    }
                    className="bg-white border-slate-300 font-mono uppercase h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Estado (Opcional)
                  </Label>
                  <Input
                    placeholder="Ej: Puebla"
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value })
                    }
                    className="bg-white border-slate-300 h-10"
                  />
                </div>

                <div className="col-span-2 space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Método de Cobro Aceptado
                  </Label>
                  <Select
                    value={formData.forma_pago}
                    onValueChange={(v) =>
                      setFormData({ ...formData, forma_pago: v as FormaPago })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-300 h-10 w-full sm:w-1/2">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tag">Solo TAG</SelectItem>
                      <SelectItem value="efectivo">Solo Efectivo</SelectItem>
                      <SelectItem value="ambos">TAG y Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SECCIÓN 2: COSTOS SIMPLIFICADOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed border-slate-200">
                {/* 5 ejes Sencillo */}
                <div className="space-y-3 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className=" font-black uppercase text-blue-800">
                      Tarifa 5 ejes (Sencillo)
                    </span>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.costo_5_ejes_sencillo || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costo_5_ejes_sencillo: Number(e.target.value),
                        })
                      }
                      className="h-10 pl-8 bg-white font-mono text-sm border-blue-200 focus:border-blue-500"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                {/* 9 Ejes Full */}
                <div className="space-y-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className=" font-black uppercase text-emerald-800">
                      Tarifa 9 Ejes (Full)
                    </span>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.costo_9_ejes_full || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costo_9_ejes_full: Number(e.target.value),
                        })
                      }
                      className="h-10 pl-8 bg-white font-mono text-sm border-emerald-200 focus:border-emerald-500"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: CONFIGURACIÓN AVANZADA DE TRAMO (OPCIONAL) */}
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all duration-300">
                <div className="flex items-center justify-between p-3.5 bg-slate-100/50">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-600">
                      Configuración Avanzada (Tramo SCT)
                    </span>
                  </div>
                  <Switch
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                  />
                </div>

                {showAdvanced && (
                  <div className="p-4 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label className=" font-bold text-slate-500">
                        Origen de Tramo
                      </Label>
                      <Input
                        placeholder="Ej: México"
                        value={formData.origen_tramo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            origen_tramo: e.target.value,
                          })
                        }
                        className="bg-white h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className=" font-bold text-slate-500">
                        Destino de Tramo
                      </Label>
                      <Input
                        placeholder="Ej: Puebla"
                        value={formData.destino_tramo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            destino_tramo: e.target.value,
                          })
                        }
                        className="bg-white h-9 text-xs"
                      />
                    </div>

                    <div className="col-span-2 mt-2 bg-slate-100 p-2 rounded text-center  font-mono text-slate-500 border border-dashed border-slate-300">
                      Resultado: {formData.tramo || "Esperando datos..."}
                    </div>

                    <div className="col-span-2  text-slate-500">
                      Si lo dejas vacío, el sistema guardará el <b>Nombre</b>{" "}
                      como tramo.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white p-4 border-t border-slate-200 shrink-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-10 px-6 border-slate-300"
            >
              Cancelar
            </Button>

            <ActionButton
              onClick={handleSave}
              disabled={isSubmitting}
              className="h-10 px-8 shadow-md shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {selectedToll ? "Actualizar Caseta" : "Confirmar Registro"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ELIMINAR INDIVIDUAL */}
      {/* MODAL ELIMINAR INDIVIDUAL */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 font-black">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar Caseta del Catálogo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 leading-relaxed pt-2 space-y-4">
              {dependencies?.in_use ? (
                <>
                  <div>
                    ⚠️ Esta caseta actualmente está{" "}
                    <b>
                      asignada en {dependencies.rutas_count} ruta(s) armada(s)
                    </b>
                    .
                  </div>
                  <p>
                    ¿Deseas eliminarla también de esas rutas? <br />
                    (Se convertirá en un "Tramo Libre" sin costo en las
                    plantillas).
                  </p>
                  <p className="text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 font-medium">
                    Tranquilo, sin importar lo que elijas,{" "}
                    <b>
                      los viajes despachados y liquidaciones históricas NO se
                      verán afectados
                    </b>
                    .
                  </p>
                </>
              ) : (
                "Esta caseta no está en uso. Se eliminará permanentemente. ¿Deseas continuar?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            {dependencies?.in_use ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => executeDelete(false)}
                  disabled={isSubmitting}
                  className="bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold"
                >
                  No, lo haré manual
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => executeDelete(true)}
                  disabled={isSubmitting}
                  className="font-bold"
                >
                  Sí, quitar de las rutas
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={() => executeDelete(false)}
                disabled={isSubmitting}
                className="font-bold"
              >
                Eliminar Permanentemente
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🚀 MODAL ELIMINACIÓN MASIVA ACTUALIZADO */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl w-full max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 font-black">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar {selectedRows.size} casetas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 leading-relaxed pt-2 space-y-4">
              <p>Estás a punto de procesar múltiples casetas.</p>
              <p>
                Las casetas libres serán eliminadas. Aquellas que ya estén
                asignadas a una ruta armada serán <b>ocultadas</b> del catálogo
                para proteger tu información, pero{" "}
                <b className="text-emerald-700">
                  no afectarán los viajes o liquidaciones en curso.
                </b>
              </p>
              <p>
                ¿Deseas que el sistema también las{" "}
                <b>elimine automáticamente de las rutas armadas</b> donde están
                asignadas?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              variant="secondary"
              onClick={() => executeBulkDelete(false)}
              disabled={isSubmitting}
              className="bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold"
            >
              No, conservar en rutas
            </Button>

            <Button
              variant="destructive"
              onClick={() => executeBulkDelete(true)}
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Sí, quitar de las rutas
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
