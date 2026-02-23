// src/features/tarifas/CatalogoCasetas.tsx
import { useState, useEffect, useMemo } from "react";
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
  Route,
  Info,
  ArrowRight,
  FileText,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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

import { TollBooth } from "@/types/api.types";
import { tollService } from "@/services/tollService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormaPago = "TAG" | "EFECTIVO" | "AMBOS";

type TollForm = {
  nombre: string;
  carretera: string;
  estado: string;

  // UX SCT: se arma automáticamente a partir de origen/destino
  origen_tramo: string;
  destino_tramo: string;

  tramo: string;

  costo_5_ejes_sencillo: number;
  costo_5_ejes_full: number;
  costo_9_ejes_sencillo: number;
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
  costo_5_ejes_full: 0,
  costo_9_ejes_sencillo: 0,
  costo_9_ejes_full: 0,
  forma_pago: "AMBOS",
});

export const CatalogoCasetas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tollBooths, setTollBooths] = useState<TollBooth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedToll, setSelectedToll] = useState<TollBooth | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<TollForm>(emptyForm());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const loadTolls = async () => {
    setIsLoading(true);
    try {
      const data = await tollService.getTolls(searchTerm);
      setTollBooths(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el catálogo");
    } finally {
      setIsLoading(false);
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

  // ✅ UX: Construcción automática del tramo SCT
  useEffect(() => {
    if (formData.origen_tramo || formData.destino_tramo) {
      setFormData((prev) => ({
        ...prev,
        tramo: `${prev.origen_tramo} - ${prev.destino_tramo}`.trim(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.origen_tramo, formData.destino_tramo]);

  const getFormaPagoBadge = (formaPago: string) => {
    const styles: Record<string, string> = {
      TAG: "bg-blue-100 text-blue-700 border-blue-200",
      EFECTIVO: "bg-amber-100 text-amber-700 border-amber-200",
      AMBOS: "bg-slate-100 text-slate-700 border-slate-200",
    };
    const cls = styles[formaPago] ?? styles.AMBOS;
    return <Badge className={`${cls} hover:opacity-80`}>{formaPago}</Badge>;
  };

  // --- MANEJADORES ---
  const handleOpenCreate = () => {
    setSelectedToll(null);
    setFormData(emptyForm());
    setDialogOpen(true);
  };

  const handleOpenEdit = (toll: TollBooth) => {
    setSelectedToll(toll);

    const tramo = (toll.tramo ?? "").trim();
    const parts = tramo.includes("-")
      ? tramo.split("-").map((p) => p.trim())
      : [tramo, ""];

    setFormData({
      nombre: toll.nombre ?? "",
      carretera: (toll as any).carretera ?? "",
      estado: (toll as any).estado ?? "",
      origen_tramo: parts[0] ?? "",
      destino_tramo: parts[1] ?? "",
      tramo: tramo,
      costo_5_ejes_sencillo: toll.costo_5_ejes_sencillo ?? 0,
      costo_5_ejes_full: toll.costo_5_ejes_full ?? 0,
      costo_9_ejes_sencillo: toll.costo_9_ejes_sencillo ?? 0,
      costo_9_ejes_full: toll.costo_9_ejes_full ?? 0,
      forma_pago: ((toll as any).forma_pago ?? "AMBOS") as FormaPago,
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {
    // 1) Validaciones
    if (!formData.nombre.trim() || !formData.carretera.trim()) {
      toast.error("Nombre y Carretera son obligatorios");
      return;
    }

    // Si armamos tramo por origen/destino, exigimos ambos (porque SCT)
    const hasAutoTramo = Boolean(
      formData.origen_tramo || formData.destino_tramo,
    );
    if (
      hasAutoTramo &&
      (!formData.origen_tramo.trim() || !formData.destino_tramo.trim())
    ) {
      toast.error("Completa Origen y Destino del tramo");
      return;
    }

    // Validación de formato SCT: debe incluir "-"
    if (!formData.tramo.trim() || !formData.tramo.includes("-")) {
      toast.error("Formato de Tramo inválido", {
        description:
          "Debe usar el formato: Origen - Destino (ej: México - Puebla)",
      });
      return;
    }

    // 2) Payload a backend (no enviamos origen_tramo/destino_tramo si el backend no los tiene)
    const payload: Partial<TollBooth> & {
      carretera?: string;
      estado?: string;
      forma_pago?: FormaPago;
    } = {
      nombre: formData.nombre.trim(),
      tramo: formData.tramo.trim(),
      costo_5_ejes_sencillo: Number(formData.costo_5_ejes_sencillo || 0),
      costo_5_ejes_full: Number(formData.costo_5_ejes_full || 0),
      costo_9_ejes_sencillo: Number(formData.costo_9_ejes_sencillo || 0),
      costo_9_ejes_full: Number(formData.costo_9_ejes_full || 0),
      carretera: formData.carretera.trim(),
      estado: formData.estado.trim(),
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
      toast.error("Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedToll) return;
    try {
      await tollService.deleteToll(selectedToll.id);
      toast.success("Eliminado");
      await loadTolls();
      setDeleteDialogOpen(false);
      setSelectedToll(null);
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    }
  };

  // ✅ UI: tabla más limpia agrupando costos
  const columns = useMemo(() => {
    const cols: Array<{
      key: string;
      header: string;
      render?: (value: any, row: TollBooth) => React.ReactNode;
      align?: "left" | "right" | "center";
    }> = [
      {
        key: "nombre",
        header: "Identificación",
        render: (_, t) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{t.nombre}</span>
            <span className="text-[10px] text-primary font-mono uppercase">
              {(t as any).carretera || "—"} | {(t as any).estado || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "tramo",
        header: "Tramo SCT",
        render: (v) => (
          <Badge
            variant="outline"
            className="font-mono text-[10px] bg-slate-50"
          >
            {String(v ?? "")}
          </Badge>
        ),
      },
      {
        key: "costos",
        header: "Tarifas (Sencillo / Full)",
        render: (_, t) => (
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="text-blue-600">
              5E: {formatCurrency(t.costo_5_ejes_sencillo)} /{" "}
              {formatCurrency(t.costo_5_ejes_full)}
            </div>
            <div className="text-amber-600">
              9E: {formatCurrency(t.costo_9_ejes_sencillo)} /{" "}
              {formatCurrency(t.costo_9_ejes_full)}
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
        header: "Acciones",
        render: (_, t) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenEdit(t)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedToll(t);
                  setDeleteDialogOpen(true);
                }}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tollBooths]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar caseta o tramo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <ActionButton onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Caseta
        </ActionButton>
      </div>

      {/* Table & Loader */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        </div>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              {columns.map((c) => (
                <DataTableHead key={c.key}>{c.header}</DataTableHead>
              ))}
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {tollBooths.map((t) => (
              <DataTableRow key={t.id}>
                {columns.map((c) => (
                  <DataTableCell key={`${t.id}-${c.key}`}>
                    {c.render
                      ? c.render((t as any)[c.key], t)
                      : (t as any)[c.key]}
                  </DataTableCell>
                ))}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {/* ✅ DIALOG: ficha técnica + tramo automático */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-t-4 border-t-primary p-0 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Header Fijo */}
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-800">
              <MapPin className="h-6 w-6 text-primary" />
              {selectedToll ? "Editar Caseta" : "Alta de Caseta SCT"}
            </DialogTitle>
          </DialogHeader>

          {/* Contenedor con Scroll 
              max-h-[calc(95vh-200px)]: Restamos el espacio aproximado de header y footer
          */}
          <div className="flex-1 overflow-y-auto p-6 pt-2 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="space-y-6">
              {/* UBICACIÓN */}
              {/* SECCIÓN 1: UBICACIÓN - Ahora "Ficha Técnica" */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <div className="col-span-2 flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Ficha Técnica del Peaje
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white text-[9px] font-bold text-primary border-primary/20"
                  >
                    DATOS SCT
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Nombre de la Caseta *
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

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Identificador Carretera *
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

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Estado
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

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Método de Cobro
                  </Label>
                  <Select
                    value={formData.forma_pago}
                    onValueChange={(v) =>
                      setFormData({ ...formData, forma_pago: v as FormaPago })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-300 h-10">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TAG">Solo TAG</SelectItem>
                      <SelectItem value="EFECTIVO">Solo Efectivo</SelectItem>
                      <SelectItem value="AMBOS">TAG y Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SECCIÓN AUTO-TRAMO */}
                <div className="col-span-2 space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Configuración de Tramo
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500">
                        Origen
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
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500">
                        Destino
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
                  </div>

                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white rounded border border-primary/20">
                        <Route className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold text-primary uppercase">
                        Tramo SCT:
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-700">
                      {formData.tramo || "Esperando datos..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* COSTOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 5 Ejes */}
                <div className="space-y-3 p-4 rounded-xl border border-blue-100 bg-blue-50/20">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black uppercase text-blue-700">
                      Configuración 5 Ejes
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">
                        Sencillo
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input
                          type="number"
                          value={formData.costo_5_ejes_sencillo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              costo_5_ejes_sencillo: Number(e.target.value),
                            })
                          }
                          className="h-8 pl-6 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">
                        Full
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input
                          type="number"
                          value={formData.costo_5_ejes_full}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              costo_5_ejes_full: Number(e.target.value),
                            })
                          }
                          className="h-8 pl-6 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 9 Ejes */}
                <div className="space-y-3 p-4 rounded-xl border border-amber-100 bg-amber-50/20">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-black uppercase text-amber-700">
                      Configuración 9 Ejes
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">
                        Sencillo
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input
                          type="number"
                          value={formData.costo_9_ejes_sencillo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              costo_9_ejes_sencillo: Number(e.target.value),
                            })
                          }
                          className="h-8 pl-6 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">
                        Full
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input
                          type="number"
                          value={formData.costo_9_ejes_full}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              costo_9_ejes_full: Number(e.target.value),
                            })
                          }
                          className="h-8 pl-6 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Fijo */}
          <DialogFooter className="bg-slate-50 p-4 border-t border-slate-200 shrink-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-10 px-6"
            >
              Cancelar
            </Button>
            <ActionButton
              onClick={handleSave}
              disabled={isSubmitting}
              className="h-10 px-8 shadow-md"
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

      {/* Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer y puede afectar tarifas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Regresar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar Caseta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
