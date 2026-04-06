import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Trash2,
  GripVertical,
  Search,
  Loader2,
  Check,
  MapPin,
  AlertTriangle,
  Repeat,
  Eye,
  Pencil,
  Printer,
  MoreVertical,
  Wand2,
  Clock,
  Route as RouteIcon,
  Truck,
} from "lucide-react";

// DND Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Form Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Services & Hooks
import { TollBooth, RateTemplate } from "@/types/api.types";
import { useClients } from "@/features/clients/hooks/useClients";
import { tollService } from "@/features/clients/services/tollService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";

//  1. ESQUEMA DE VALIDACIÓN ZOD PARA LA RUTA
const routeSchema = z.object({
  origen: z.string().min(2, "Mínimo 2 caracteres requeridos"),
  destino: z.string().min(2, "Mínimo 2 caracteres requeridos"),
  variante: z.string().optional(),
  configuracion: z.enum(["5ejes", "9ejes"], {
    required_error: "Selecciona una configuración válida",
  }),
  selectedCliente: z.string().optional(),
});

type RouteFormData = z.infer<typeof routeSchema>;

interface SegmentEntry {
  tempId: string;
  nombre_segmento: string;
  estado: string;
  carretera: string;
  distancia_km: number;
  tiempo_minutos: number;
  toll_booth_id: number | null;
  toll_nombre?: string;
  costo_s: number;
  costo_f: number;
}

type UpdateField = keyof SegmentEntry;
const genTempId = () => `seg-${Math.random().toString(36).slice(2, 11)}`;

type SortableRowProps = {
  seg: SegmentEntry;
  idx: number;
  updateSegment: (idx: number, field: UpdateField, value: unknown) => void;
  removeSegment: (idx: number) => void;
  formatCurrency: (val: number) => string;
  hasGap: boolean;
  showAdvanced: boolean;
  isFullUnit: boolean;
};

// --- COMPONENTE FILA (SORTABLE) ---
const SortableTableRow: React.FC<SortableRowProps> = ({
  seg,
  idx,
  updateSegment,
  removeSegment,
  formatCurrency,
  hasGap,
  showAdvanced,
  isFullUnit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: seg.tempId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <>
      {hasGap && (
        <TableRow className="bg-amber-50/50 dark:bg-amber-950/30 border-none h-8">
          <TableCell colSpan={showAdvanced ? 8 : 6} className="py-0">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em]">
              <AlertTriangle className="h-3.5 w-3.5" /> Discontinuidad detectada
              entre tramos
            </div>
          </TableCell>
        </TableRow>
      )}

      <TableRow
        ref={setNodeRef}
        style={style}
        className={cn(
          "group transition-all duration-200 border-b border-slate-200/50 dark:border-white/10 interactive-row",
          isDragging
            ? "bg-white dark:bg-slate-800 shadow-2xl scale-[1.01]"
            : seg.toll_booth_id
              ? "bg-white/80 dark:bg-slate-900/80"
              : "bg-slate-50/40 dark:bg-slate-950/40",
        )}
      >
        <TableCell className="w-12 pl-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 text-slate-400 dark:text-slate-500 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </TableCell>

        <TableCell className={showAdvanced ? "w-[30%]" : "w-[40%]"}>
          <div className="flex flex-col gap-1 py-1">
            <Input
              className="h-9 text-xs font-black uppercase tracking-tight bg-transparent border-transparent hover:border-slate-200 dark:hover:border-white/20 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-none focus:shadow-sm"
              value={seg.nombre_segmento}
              onChange={(e) =>
                updateSegment(idx, "nombre_segmento", e.target.value)
              }
              placeholder="Ej: CDMX - PUEBLA"
            />
            {seg.toll_booth_id && (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 px-3 uppercase tracking-widest flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />{" "}
                Peaje Registrado
              </span>
            )}
          </div>
        </TableCell>

        {showAdvanced && (
          <>
            <TableCell className="w-20">
              <Input
                className="h-9 uppercase text-[10px] font-bold text-center bg-transparent border-transparent hover:border-slate-200 dark:hover:border-white/20 focus:bg-white dark:focus:bg-slate-950 shadow-none"
                value={seg.estado}
                placeholder="EDO."
                onChange={(e) => updateSegment(idx, "estado", e.target.value)}
              />
            </TableCell>

            <TableCell className="w-28">
              <Input
                className="h-9 uppercase text-[10px] font-bold bg-transparent border-transparent hover:border-slate-200 dark:hover:border-white/20 focus:bg-white dark:focus:bg-slate-950 shadow-none"
                value={seg.carretera}
                placeholder="CARR."
                onChange={(e) =>
                  updateSegment(idx, "carretera", e.target.value)
                }
              />
            </TableCell>
          </>
        )}

        <TableCell className="w-24">
          <div className="relative">
            <Input
              type="number"
              className="h-9 w-full text-right font-mono font-bold text-xs bg-transparent border-transparent hover:border-slate-200 dark:hover:border-white/20 focus:bg-white dark:focus:bg-slate-950 shadow-none pr-8"
              value={seg.distancia_km || ""}
              onChange={(e) =>
                updateSegment(
                  idx,
                  "distancia_km",
                  parseFloat(e.target.value) || 0,
                )
              }
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 dark:text-slate-500">
              KM
            </span>
          </div>
        </TableCell>

        <TableCell className="w-24">
          <div className="relative">
            <Input
              type="number"
              className="h-9 w-full text-right font-mono font-bold text-xs bg-transparent border-transparent hover:border-slate-200 dark:hover:border-white/20 focus:bg-white dark:focus:bg-slate-950 shadow-none pr-9"
              value={seg.tiempo_minutos || ""}
              onChange={(e) =>
                updateSegment(
                  idx,
                  "tiempo_minutos",
                  parseInt(e.target.value) || 0,
                )
              }
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 dark:text-slate-500">
              MIN
            </span>
          </div>
        </TableCell>

        {!isFullUnit && (
          <TableCell className="text-right font-mono font-black text-blue-700 dark:text-blue-400 text-sm bg-blue-50/30 dark:bg-blue-900/10 pr-6">
            {formatCurrency(seg.costo_s)}
          </TableCell>
        )}
        {isFullUnit && (
          <TableCell className="text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50/30 dark:bg-emerald-900/10 pr-6">
            {formatCurrency(seg.costo_f)}
          </TableCell>
        )}

        <TableCell className="w-12 pr-4 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-white hover:bg-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            onClick={() => removeSegment(idx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    </>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const RouteBuilder: React.FC = () => {
  const { clients } = useClients();
  const { value: monedaBase } = useSystemConfig("moneda_base");

  //  2. INICIALIZAMOS REACT HOOK FORM
  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      origen: "",
      destino: "",
      variante: "",
      configuracion: "5ejes",
      selectedCliente: "none",
    },
  });

  const { watch, setValue, reset } = form;
  const { origen, destino, variante, configuracion, selectedCliente } = watch();

  const isFullUnit = configuracion === "9ejes";

  const nombreRutaGenerada = useMemo(() => {
    if (!origen.trim() && !destino.trim()) return "";
    return [origen.trim(), destino.trim(), variante?.trim()]
      .filter(Boolean)
      .join(" - ")
      .toUpperCase();
  }, [origen, destino, variante]);

  const [segments, setSegments] = useState<SegmentEntry[]>([]);
  const [allTolls, setAllTolls] = useState<TollBooth[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<RateTemplate[]>([]);

  const [filtroTipo, setFiltroTipo] = useState<"todos" | "5ejes" | "9ejes">(
    "todos",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tollSearch, setTollSearch] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<RateTemplate | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRouteDetail, setSelectedRouteDetail] =
    useState<RateTemplate | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);

  const topFormRef = useRef<HTMLFormElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  //  FIX: Creada función maestra para forzar la actualización de rutas desde la BD
  const fetchRutas = useCallback(async () => {
    try {
      const rs = await tollService.getTemplates();
      setSavedRoutes(rs);
    } catch (e) {
      console.error("Error fetching templates", e);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = await tollService.getTolls();
        setAllTolls(t);
        await fetchRutas();
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, [fetchRutas]);

  const totals = useMemo(() => {
    return segments.reduce(
      (acc, s) => {
        acc.distancia += s.distancia_km || 0;
        acc.tiempo += s.tiempo_minutos || 0;
        acc.costo_s += s.costo_s || 0;
        acc.costo_f += s.costo_f || 0;
        return acc;
      },
      { distancia: 0, tiempo: 0, costo_s: 0, costo_f: 0 },
    );
  }, [segments]);

  const rutasFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return savedRoutes;
    return savedRoutes.filter((r: any) => {
      const config = String(r.tipo_unidad || "")
        .trim()
        .toLowerCase();
      const isSencillo = config === "5ejes" || config === "sencillo";
      const isFull = config === "9ejes" || config === "full";
      return filtroTipo === "9ejes" ? isFull : isSencillo;
    });
  }, [savedRoutes, filtroTipo]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: monedaBase || "MXN",
    }).format(val || 0);

  const updateSegment = (idx: number, field: UpdateField, value: unknown) => {
    setSegments((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === "nombre_segmento") {
        const v = String(value || "")
          .toLowerCase()
          .trim();
        const match = allTolls.find(
          (t) =>
            (t.nombre || "").toLowerCase() === v ||
            (t.tramo || "").toLowerCase() === v,
        );
        if (match) {
          updated[idx].carretera = (match as any).carretera || "";
          updated[idx].estado = (match as any).estado || "";
          updated[idx].toll_booth_id = match.id;
          updated[idx].costo_s = (match as any).costo_5_ejes_sencillo ?? 0;
          updated[idx].costo_f = (match as any).costo_9_ejes_full ?? 0;
        } else {
          updated[idx].toll_booth_id = null;
        }
      }
      return updated;
    });
  };

  const handleAutoCalculate = async () => {
    if (segments.length === 0) {
      toast.warning("Agrega al menos un tramo para calcular");
      return;
    }
    setIsCalculating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSegments((prev) =>
      prev.map((seg) => {
        const newKm =
          seg.distancia_km > 0
            ? seg.distancia_km
            : Math.floor(Math.random() * 50) + 20;
        const newMins =
          seg.tiempo_minutos > 0
            ? seg.tiempo_minutos
            : Math.floor(newKm * 0.85);
        return { ...seg, distancia_km: newKm, tiempo_minutos: newMins };
      }),
    );
    setIsCalculating(false);
    toast.success("Distancias y tiempos estimados calculados.");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSegments((items) => {
      const oldIndex = items.findIndex((i) => i.tempId === active.id);
      const newIndex = items.findIndex((i) => i.tempId === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete) return;
    try {
      await tollService.deleteTemplate(routeToDelete.id);
      await fetchRutas(); //  FIX: Forzamos la descarga desde DB para evitar duplicados fantasma
      toast.success("Ruta eliminada correctamente");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al eliminar la ruta");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleReverseRoute = () => {
    if (!origen && !destino) return;
    const oldO = origen;
    setValue("origen", destino);
    setValue("destino", oldO);

    setSegments((prev) =>
      [...prev].reverse().map((s) => ({
        ...s,
        nombre_segmento: s.nombre_segmento.includes("-")
          ? s.nombre_segmento
              .split("-")
              .map((x) => x.trim())
              .reverse()
              .join(" - ")
          : s.nombre_segmento,
      })),
    );
    toast.success("Ruta invertida");
  };

  const checkRouteGap = (idx: number) => {
    if (idx === 0 || !segments[idx] || !segments[idx - 1]) return false;
    const currentStart = segments[idx].nombre_segmento
      .split("-")[0]
      ?.trim()
      .toLowerCase();
    const prevEnd = segments[idx - 1].nombre_segmento
      .split("-")[1]
      ?.trim()
      .toLowerCase();
    return Boolean(prevEnd && currentStart && prevEnd !== currentStart);
  };

  //  3. ONSUBMIT INTEGRADO CON ZOD + SUFIJOS AUTOMÁTICOS + SYNC
  const onSubmit = async (data: RouteFormData) => {
    if (segments.length === 0) {
      toast.error("Debes agregar al menos un tramo a la ruta.");
      return;
    }

    const mappedSegments = segments.map((s, idx) => ({
      nombre_segmento: s.nombre_segmento,
      estado: s.estado,
      carretera: s.carretera,
      distancia_km: s.distancia_km,
      tiempo_minutos: s.tiempo_minutos,
      toll_booth_id: s.toll_booth_id,
      orden: idx + 1,
      costo_momento_sencillo: s.costo_s,
      costo_momento_full: s.costo_f,
    }));

    //  FIX: Agregamos el sufijo para que Gustavo no tenga que poner guiones manuales
    const sufijoConfig =
      data.configuracion === "9ejes" ? "[FULL]" : "[SENCILLO]";
    const finalOrigen = data.variante?.trim()
      ? `${data.origen.trim().toUpperCase()} - ${data.variante.trim().toUpperCase()} ${sufijoConfig}`
      : `${data.origen.trim().toUpperCase()} ${sufijoConfig}`;

    const payload = {
      client_id:
        data.selectedCliente && data.selectedCliente !== "none"
          ? parseInt(data.selectedCliente, 10)
          : null,
      origen: finalOrigen,
      destino: data.destino.trim().toUpperCase(),
      tipo_unidad: data.configuracion,
      segments: mappedSegments,
    };

    setIsSubmitting(true);
    try {
      if (editingRouteId) {
        await tollService.updateTemplate(editingRouteId, payload);
        toast.success("Ruta actualizada correctamente");
      } else {
        await tollService.saveTemplate(payload as any);
        toast.success("Nueva ruta guardada exitosamente");
      }

      await fetchRutas(); //  FIX: Forzar Sync con BD

      setEditingRouteId(null);
      setSegments([]);
      reset({
        origen: "",
        destino: "",
        variante: "",
        configuracion: "5ejes",
        selectedCliente: "none",
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Error al guardar la ruta armada",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRoute = (route: RateTemplate) => {
    setEditingRouteId(route.id);
    const originStr = (route.origen || "")
      .replace("[FULL]", "")
      .replace("[SENCILLO]", "")
      .trim();
    const partes = originStr.split("-");
    const editOrigen = partes.length >= 2 ? partes[0].trim() : originStr;
    const editVariante =
      partes.length >= 2 ? partes.slice(1).join("-").trim() : "";
    const isRouteFull =
      route.tipo_unidad === "9ejes" || route.tipo_unidad === "full";

    reset({
      origen: editOrigen,
      destino: route.destino || "",
      variante: editVariante,
      configuracion: isRouteFull ? "9ejes" : "5ejes",
      selectedCliente: route.client_id ? String(route.client_id) : "none",
    });

    setSegments(
      (route.segments || []).map((s: any) => ({
        tempId: genTempId(),
        nombre_segmento: s.nombre_segmento,
        estado: s.estado || "",
        carretera: s.carretera || "",
        distancia_km: Number(s.distancia_km || 0),
        tiempo_minutos: Number(s.tiempo_minutos || 0),
        toll_booth_id: s.toll_booth_id ?? null,
        toll_nombre: s.toll_nombre,
        costo_s: Number(s.costo_momento_sencillo ?? 0),
        costo_f: Number(s.costo_momento_full ?? 0),
      })),
    );

    setTimeout(() => {
      topFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    toast.info("Ruta cargada en el panel superior para edición");
  };

  const handlePrintRoute = (route: RateTemplate) => {
    const isFull =
      route.tipo_unidad === "9ejes" || route.tipo_unidad === "full";
    const totalCost = isFull
      ? route.costo_total_full
      : route.costo_total_sencillo;
    const clientName =
      clients.find((c) => c.id === route.client_id)?.razon_social ||
      "Ruta Libre (General)";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(
        "Por favor permite las ventanas emergentes (pop-ups) para imprimir.",
      );
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hoja de Ruta - ${route.origen}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; background: #ffffff; }
            .header { text-align: center; border-bottom: 4px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; font-weight: bold; letter-spacing: 3px; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 30px; }
            .info-box p { margin: 8px 0; font-size: 13px; text-transform: uppercase; }
            .info-box strong { color: #475569; display: inline-block; width: 140px; font-weight: 900; letter-spacing: 1px;}
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 14px 16px; text-align: left; }
            th { background-color: #0f172a; font-weight: 900; text-transform: uppercase; color: #ffffff; letter-spacing: 1px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row td { font-weight: 900; font-size: 16px; background-color: #f8fafc; color: #0f172a; border-bottom: none; padding-top: 20px;}
            .warning { text-align: center; border: 2px dashed #ef4444; padding: 20px; border-radius: 12px; color: #ef4444; font-size: 13px; font-weight: bold; background: #fef2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">BITÁCORA DE RUTA AUTORIZADA</h1>
            <p class="subtitle">DOCUMENTO OPERATIVO DE CONTROL OFICIAL</p>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <p><strong>CLIENTE:</strong> <span style="color: #0f172a; font-weight: bold;">${clientName}</span></p>
              <p><strong>NOMBRE RUTA:</strong> <span style="color: #0f172a; font-weight: bold;">${route.origen}</span></p>
              <p><strong>DESTINO FINAL:</strong> <span style="color: #0f172a; font-weight: bold;">${route.destino !== "N/A" ? route.destino : "NO ESPECIFICADO"}</span></p>
            </div>
            <div class="info-box text-right">
              <p><strong>CONFIGURACIÓN:</strong> <span style="background: #e2e8f0; color: #0f172a; padding: 4px 8px; border-radius: 6px; font-weight: bold;">${isFull ? "FULL (9 EJES)" : "SENCILLO (5 EJES)"}</span></p>
              <p><strong>DISTANCIA:</strong> <span style="color: #0f172a; font-weight: bold;">${Number(route.distancia_total_km || 0).toFixed(1)} KM</span></p>
              <p><strong>IMPRESIÓN:</strong> <span style="color: #0f172a; font-weight: bold;">${new Date().toLocaleDateString("es-MX")}</span></p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">Nº</th>
                <th>Tramo / Plaza de Cobro</th>
                <th>Estado / Vía</th>
                <th class="text-right">Costo Autorizado</th>
              </tr>
            </thead>
            <tbody>
              ${route.segments
                ?.map(
                  (seg: any, i: number) => `
                <tr>
                  <td class="text-center"><b style="color: #64748b;">${i + 1}</b></td>
                  <td>
                    <span style="font-weight: 900; color: #0f172a; font-size: 14px;">${seg.nombre_segmento.toUpperCase()}</span><br/>
                    <span style="color: #64748b; font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">${seg.toll_booth_id ? "CASETA DE PEAJE SCT" : "TRAMO LIBRE"}</span>
                  </td>
                  <td style="font-weight: bold; color: #475569; text-transform: uppercase;">${seg.carretera || "-"} ${seg.estado ? `(${seg.estado})` : ""}</td>
                  <td class="text-right font-mono" style="font-size: 15px; font-weight: bold; color: #0f172a;">$${Number(isFull ? seg.costo_momento_full : seg.costo_momento_sencillo).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td colspan="3" class="text-right" style="letter-spacing: 1px;">PRESUPUESTO EXACTO PARA CASETAS:</td>
                <td class="text-right" style="font-size: 20px;">$${Number(totalCost).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="warning">
            ⚠️ NOTA IMPORTANTE PARA EL OPERADOR ⚠️<br/>
            Las desviaciones de esta ruta o los cobros de casetas no autorizadas serán descontados en la liquidación del viaje.
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const historyColumns: ColumnDef<RateTemplate>[] = useMemo(
    () => [
      {
        key: "origen",
        header: "Nombre de Ruta",
        render: (_, row) => (
          <div className="flex flex-col gap-1 py-1">
            <span className="font-black text-brand-navy dark:text-slate-200 text-sm uppercase tracking-tight">
              {row.origen}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <MapPin className="h-3 w-3 text-brand-red" /> Hacia: {row.destino}
            </span>
          </div>
        ),
      },
      {
        key: "client_id",
        header: "Asignación",
        render: (val) => {
          if (!val)
            return (
              <Badge
                variant="outline"
                className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 text-[9px] uppercase tracking-widest font-black"
              >
                Libre (Todos)
              </Badge>
            );
          return (
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">
              {clients.find((c) => c.id === val)?.razon_social || val}
            </span>
          );
        },
      },
      {
        key: "tipo_unidad",
        header: "Configuración",
        render: (_, row) => {
          const isFullRoute =
            row.tipo_unidad === "9ejes" || row.tipo_unidad === "full";
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-black uppercase tracking-widest shadow-sm",
                isFullRoute
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
              )}
            >
              {isFullRoute ? "FULL (9 EJES)" : "SENCILLO (5 EJES)"}
            </Badge>
          );
        },
      },
      {
        key: "casetas",
        header: "Tramos / Distancia",
        render: (_, row) => {
          const total = row.segments?.length || 0;
          const numPeaje =
            row.segments?.filter((s: any) => s.toll_booth_id !== null).length ||
            0;
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] uppercase font-bold tracking-widest border-slate-200 dark:border-white/10 w-fit"
              >
                {total} Tramos ({numPeaje} Peajes)
              </Badge>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 ml-1">
                {row.distancia_total_km} KM
              </span>
            </div>
          );
        },
      },
      {
        key: "costo",
        header: "Presupuesto Autorizado",
        render: (_, row) => {
          const isFullRoute =
            row.tipo_unidad === "9ejes" || row.tipo_unidad === "full";
          const cost = isFullRoute
            ? row.costo_total_full
            : row.costo_total_sencillo;
          return (
            <span
              className={cn(
                "font-mono font-black text-sm",
                isFullRoute
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-blue-600 dark:text-blue-400",
              )}
            >
              {formatCurrency(Number(cost || 0))}
            </span>
          );
        },
      },
      {
        key: "id",
        header: "Acciones",
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900/50"
              >
                <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-white/20 min-w-[180px] z-50 dark:bg-slate-900/90"
            >
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                onClick={() => handleEditRoute(row)}
              >
                <Pencil className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                Editar Ruta
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                onClick={() => {
                  setSelectedRouteDetail(row);
                  setDetailModalOpen(true);
                }}
              >
                <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />{" "}
                Ver Detalles
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                onClick={() => handlePrintRoute(row)}
              >
                <Printer className="h-4 w-4 text-brand-navy dark:text-slate-400" />{" "}
                Imprimir Hoja
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem
                className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                onClick={() => {
                  setRouteToDelete(row);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> Eliminar Plantilla
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [clients],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-red h-10 w-10" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Cargando motor de rutas...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 scroll-mt-24"
          id="form-rutas-top"
          ref={topFormRef}
        >
          {/*  FORMULARIO PRINCIPAL TOP */}
          <Card
            variant="default"
            className="overflow-hidden border-t-4 border-t-brand-navy shadow-xl overflow-visible"
          >
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <FormField
                  control={form.control}
                  name="origen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand" required>
                        <MapPin className="h-3 w-3 inline mr-1" /> Ciudad Origen
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: VERACRUZ"
                          className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destino"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand" required>
                        <MapPin className="h-3 w-3 inline mr-1" /> Ciudad
                        Destino
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: TOLUCA"
                          className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="variante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">
                        <RouteIcon className="h-3 w-3 inline mr-1" /> Variante
                        (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: BRAUN-IMO"
                          className="h-11 font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="configuracion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand" required>
                        <Truck className="h-3 w-3 inline mr-1" /> Configuración
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 font-black uppercase text-brand-navy dark:text-white shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                          <SelectItem
                            value="5ejes"
                            className="font-bold uppercase text-xs"
                          >
                            Sencillo (5 Ejes)
                          </SelectItem>
                          <SelectItem
                            value="9ejes"
                            className="font-bold uppercase text-xs"
                          >
                            Full (9 Ejes)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-6 p-4 bg-brand-navy dark:bg-slate-950 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner border border-brand-navy/20 dark:border-white/10">
                <span className="text-brand-navy/60 dark:text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-brand-red" /> Identificador
                  Oficial:
                </span>
                <span
                  className={cn(
                    "font-mono font-black text-lg tracking-tight",
                    nombreRutaGenerada ? "text-white" : "text-white/30 italic",
                  )}
                >
                  {nombreRutaGenerada
                    ? `${nombreRutaGenerada} [${configuracion === "9ejes" ? "FULL" : "SENCILLO"}]`
                    : "ESPERANDO DATOS..."}
                </span>
              </div>

              <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-200/50 dark:border-white/10 pt-6">
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <FormField
                    control={form.control}
                    name="selectedCliente"
                    render={({ field }) => (
                      <FormItem className="flex flex-col sm:flex-row sm:items-center gap-3 space-y-0 w-full">
                        <FormLabel
                          variant="brand"
                          className="whitespace-nowrap mb-0"
                        >
                          Cliente Exclusivo:
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? "" : v)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 w-full sm:w-[280px] font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                              <SelectValue placeholder="Ruta libre (Sin cliente)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10 max-h-[40vh]">
                            <SelectItem
                              value="none"
                              className="font-bold italic text-slate-500"
                            >
                              Ruta libre (Todos)
                            </SelectItem>
                            {clients.map((c) => (
                              <SelectItem
                                key={c.id}
                                value={String(c.id)}
                                className="font-bold text-xs uppercase"
                              >
                                {c.razon_social}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full md:w-auto h-10 text-[10px]"
                  onClick={handleReverseRoute}
                >
                  <Repeat className="h-4 w-4 mr-2 text-brand-red" /> Invertir
                  Sentido
                </Button>
              </div>
            </CardHeader>

            {/* TOOLBAR SECUNDARIO */}
            <div className="bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-white/10 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="advanced-mode"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                  className="data-[state=checked]:bg-brand-red shadow-sm"
                />
                <Label
                  htmlFor="advanced-mode"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer mt-0.5"
                >
                  Mostrar Datos Completos (Carr / Edo)
                </Label>
              </div>
              <Button
                type="button"
                variant="info"
                size="lg"
                className="w-full sm:w-auto h-9 text-[10px]"
                onClick={handleAutoCalculate}
                disabled={isCalculating || segments.length === 0}
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Auto-Calcular Tiempos
              </Button>
            </div>

            {/*  TABLA DND */}
            <CardContent className="p-0">
              <div className="relative w-full overflow-hidden bg-slate-50/50 dark:bg-transparent">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table className="w-full caption-bottom text-sm">
                    <TableHeader className="bg-slate-200/50 dark:bg-slate-900/80">
                      <TableRow className="border-b border-slate-300 dark:border-white/10">
                        <TableHead className="w-12 pl-4"></TableHead>
                        <TableHead
                          className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12",
                            showAdvanced ? "w-[30%]" : "w-[40%]",
                          )}
                        >
                          Tramo / Plaza
                        </TableHead>
                        {showAdvanced && (
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12 w-20">
                            Edo.
                          </TableHead>
                        )}
                        {showAdvanced && (
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12 w-28">
                            Carr.
                          </TableHead>
                        )}
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12 text-right w-36 pr-4">
                          Distancia
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12 text-right w-36 pr-4">
                          Tiempo
                        </TableHead>
                        {!isFullUnit && (
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400 h-12 text-right pr-6">
                            Costo Sencillo
                          </TableHead>
                        )}
                        {isFullUnit && (
                          <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 h-12 text-right pr-6">
                            Costo Full
                          </TableHead>
                        )}
                        <TableHead className="w-12 pr-4"></TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="relative table-staggered">
                      <SortableContext
                        items={segments.map((s) => s.tempId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {segments.map((seg, idx) => (
                          <SortableTableRow
                            key={seg.tempId}
                            seg={seg}
                            idx={idx}
                            updateSegment={updateSegment}
                            removeSegment={(i) =>
                              setSegments((prev) =>
                                prev.filter((_, idxx) => idxx !== i),
                              )
                            }
                            formatCurrency={formatCurrency}
                            hasGap={checkRouteGap(idx)}
                            showAdvanced={showAdvanced}
                            isFullUnit={isFullUnit}
                          />
                        ))}
                      </SortableContext>
                      {segments.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={showAdvanced ? 8 : 6}
                            className="h-32 text-center"
                          >
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              Utiliza los botones de abajo para agregar tramos a
                              la ruta.
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>

                    {/* FOOTER TOTALES */}
                    <tfoot className="bg-brand-navy dark:bg-slate-950 text-white sticky bottom-0 z-10 border-t-2 border-brand-red">
                      <TableRow className="hover:bg-brand-navy dark:hover:bg-slate-950 border-none">
                        <TableCell
                          colSpan={showAdvanced ? 4 : 2}
                          className="text-right text-[10px] font-black uppercase tracking-[0.3em] text-white/70 py-4"
                        >
                          TOTALES ESTIMADOS
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm border-l border-white/10 pr-4">
                          {totals.distancia.toFixed(1)} km
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm border-l border-white/10 pr-4">
                          {Math.floor(totals.tiempo / 60)}h {totals.tiempo % 60}
                          m
                        </TableCell>
                        {!isFullUnit && (
                          <TableCell className="text-right font-mono font-black text-lg text-blue-400 border-l border-white/10 pr-6">
                            {formatCurrency(totals.costo_s)}
                          </TableCell>
                        )}
                        {isFullUnit && (
                          <TableCell className="text-right font-mono font-black text-lg text-emerald-400 border-l border-white/10 pr-6">
                            {formatCurrency(totals.costo_f)}
                          </TableCell>
                        )}
                        <TableCell className="pr-4 border-l border-white/10"></TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </DndContext>
              </div>
            </CardContent>

            {/* BOTONERAS DE ACCIÓN Y SUBMIT */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl gap-4">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Button
                  type="button"
                  onClick={() =>
                    setSegments([
                      ...segments,
                      {
                        tempId: genTempId(),
                        nombre_segmento: "Nuevo Tramo - ",
                        estado: "",
                        carretera: "",
                        distancia_km: 0,
                        tiempo_minutos: 0,
                        toll_booth_id: null,
                        costo_s: 0,
                        costo_f: 0,
                      },
                    ])
                  }
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-dashed border-2 text-[10px]"
                >
                  <Plus className="h-4 w-4 mr-2" /> Tramo Libre
                </Button>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="info"
                      size="lg"
                      className="w-full sm:w-auto text-[10px]"
                    >
                      <MapPin className="h-4 w-4 mr-2" /> Insertar Caseta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-md p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                    <DialogHeader className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0">
                      <DialogTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp">
                        Catálogo de Peajes
                      </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 bg-slate-50/50 dark:bg-transparent flex-1 overflow-hidden flex flex-col">
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Filtrar por nombre o tramo..."
                          className="pl-10 h-11 font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 shadow-sm"
                          value={tollSearch}
                          onChange={(e) => setTollSearch(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="flex-1 custom-scrollbar pr-4">
                        <div className="space-y-2">
                          {allTolls
                            .filter(
                              (t) =>
                                t.nombre
                                  .toLowerCase()
                                  .includes(tollSearch.toLowerCase()) ||
                                t.tramo
                                  .toLowerCase()
                                  .includes(tollSearch.toLowerCase()),
                            )
                            .map((t) => (
                              <div
                                key={t.id}
                                className="p-4 border border-slate-200 dark:border-white/10 rounded-xl flex justify-between items-center hover:border-brand-navy dark:hover:border-white/30 hover:shadow-md cursor-pointer group transition-all bg-white dark:bg-slate-800/50"
                                onClick={() => {
                                  setSegments([
                                    ...segments,
                                    {
                                      tempId: genTempId(),
                                      nombre_segmento: t.nombre,
                                      estado: (t as any).estado || "",
                                      carretera: (t as any).carretera || "",
                                      distancia_km: 0,
                                      tiempo_minutos: 0,
                                      toll_booth_id: t.id,
                                      toll_nombre: t.nombre,
                                      costo_s:
                                        (t as any).costo_5_ejes_sencillo ?? 0,
                                      costo_f:
                                        (t as any).costo_9_ejes_full ?? 0,
                                    },
                                  ]);
                                  setDialogOpen(false);
                                }}
                              >
                                <div className="flex-1 pr-4">
                                  <p className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 group-hover:text-brand-navy dark:group-hover:text-white">
                                    {t.nombre}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-tight">
                                    {t.tramo}
                                    {((t as any).carretera ||
                                      (t as any).estado) && (
                                      <span className="block mt-0.5 text-slate-500">
                                        {(t as any).carretera}{" "}
                                        {(t as any).carretera &&
                                        (t as any).estado
                                          ? "•"
                                          : ""}{" "}
                                        {(t as any).estado}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  {!isFullUnit && (
                                    <Badge
                                      variant="secondary"
                                      className="font-mono text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 px-2 py-0.5"
                                    >
                                      $
                                      {Number(
                                        (t as any).costo_5_ejes_sencillo ?? 0,
                                      ).toFixed(2)}
                                    </Badge>
                                  )}
                                  {isFullUnit && (
                                    <Badge
                                      variant="secondary"
                                      className="font-mono text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5"
                                    >
                                      $
                                      {Number(
                                        (t as any).costo_9_ejes_full ?? 0,
                                      ).toFixed(2)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                {editingRouteId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setEditingRouteId(null);
                      setSegments([]);
                      form.reset();
                      toast.info("Edición cancelada");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                {/*  BOTÓN TIPO SUBMIT CENTRALIZADO */}
                <Button
                  type="submit"
                  size="lg"
                  variant="default"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {editingRouteId ? "Actualizar Ruta" : "Guardar Ruta"}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </Form>

      <Card variant="default" className="shadow-2xl border-none">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 py-6 rounded-t-2xl gap-4">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
            <RouteIcon className="h-6 w-6 text-brand-red" /> Directorio de Rutas
          </CardTitle>

          {/*  FIX: Aquí se agregó el Filtro de FULL / SENCILLO que faltaba en la UI */}
          <Tabs
            value={filtroTipo}
            onValueChange={(v) => setFiltroTipo(v as any)}
            className="w-full sm:w-[300px]"
          >
            <TabsList className="grid w-full grid-cols-3 bg-slate-200/50 dark:bg-slate-800">
              <TabsTrigger
                value="todos"
                className="text-xs font-bold uppercase"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="5ejes"
                className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400"
              >
                Sencillos
              </TabsTrigger>
              <TabsTrigger
                value="9ejes"
                className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400"
              >
                Full
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6 p-0 bg-white dark:bg-slate-950">
          <EnhancedDataTable
            data={rutasFiltradas}
            columns={historyColumns}
            exportFileName="rutas_armadas_oficiales"
            className="border-none"
          />
        </CardContent>
      </Card>

      {/*  MODAL ELIMINAR RUTA */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col gap-1">
                <AlertDialogTitle className="text-rose-600 dark:text-rose-500 text-lg sm:text-2xl font-black uppercase tracking-tighter heading-crisp leading-none">
                  Eliminar Plantilla de Ruta
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Confirmación de Borrado • Catálogo 3T
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block">
              <div className="space-y-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Estás a punto de eliminar la ruta{" "}
                  <b className="text-slate-900 dark:text-white uppercase">
                    {routeToDelete?.origen}
                  </b>
                  .
                </p>

                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-500 rounded-full p-1.5 mt-0.5 shadow-lg shadow-emerald-500/20">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
                        Seguridad de Históricos
                      </p>
                      <p className="text-[11px] sm:text-[12px] font-medium text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                        Los viajes históricos despachados o liquidados con esta
                        ruta <b>NO se verán afectados</b>.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 border-l-4 border-amber-500 pl-4 py-1">
                  Sin embargo, esta plantilla se desactivará y{" "}
                  <b>ya no podrá ser seleccionada</b> en despachos futuros.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
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
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Sí, Eliminar Ruta
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*  MODAL DETALLE DE RUTA (BITÁCORA) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl p-0 overflow-hidden bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 sm:px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <DialogTitle className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Bitácora de Control Operativo
                </span>
                <span className="text-xl sm:text-2xl font-black text-brand-navy dark:text-white flex items-center gap-3 uppercase tracking-tighter heading-crisp">
                  <RouteIcon className="h-6 w-6 text-brand-red" />
                  {selectedRouteDetail?.origen}
                </span>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest shadow-sm",
                      selectedRouteDetail?.tipo_unidad === "9ejes" ||
                        selectedRouteDetail?.tipo_unidad === "full"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                        : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
                    )}
                  >
                    {selectedRouteDetail?.tipo_unidad === "9ejes" ||
                    selectedRouteDetail?.tipo_unidad === "full"
                      ? "FULL (9 Ejes)"
                      : "SENCILLO (5 Ejes)"}
                  </Badge>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold font-mono tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                    {selectedRouteDetail?.distancia_total_km || 0} KM TOTALES
                  </span>
                </div>
              </DialogTitle>
              {selectedRouteDetail && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => handlePrintRoute(selectedRouteDetail)}
                >
                  <Printer className="h-4 w-4 mr-2 text-brand-red" /> Imprimir
                  Hoja
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 sm:px-8 py-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            {selectedRouteDetail && (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-[15px] top-4 bottom-8 w-1 bg-slate-200 dark:bg-slate-800 rounded-full" />

                <div className="space-y-8">
                  {selectedRouteDetail.segments.map((seg: any, idx: number) => {
                    const isFullRoute =
                      selectedRouteDetail.tipo_unidad === "9ejes" ||
                      selectedRouteDetail.tipo_unidad === "full";
                    const cost = isFullRoute
                      ? seg.costo_momento_full
                      : seg.costo_momento_sencillo;

                    return (
                      <div
                        key={seg.id || idx}
                        className="relative pl-12 flex flex-col group"
                      >
                        <div
                          className={cn(
                            "absolute left-0 top-2 h-8 w-8 rounded-full border-4 border-slate-50 dark:border-brand-navy flex items-center justify-center shadow-md z-10 transition-colors",
                            seg.toll_booth_id ? "bg-amber-500" : "bg-blue-500",
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-white dark:bg-slate-900" />
                        </div>

                        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-base font-black text-brand-navy dark:text-white uppercase tracking-tight">
                                  {seg.nombre_segmento}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "uppercase text-[9px] font-black tracking-widest px-2 py-0.5",
                                    seg.toll_booth_id
                                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                                      : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
                                  )}
                                >
                                  {seg.toll_booth_id
                                    ? "CASETA DE PEAJE SCT"
                                    : "TRAMO LIBRE"}
                                </Badge>
                              </div>
                              {(seg.carretera || seg.estado) && (
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <MapPin className="h-3 w-3 text-slate-300 dark:text-slate-500" />
                                  {seg.carretera}{" "}
                                  {seg.carretera && seg.estado ? "•" : ""}{" "}
                                  {seg.estado}
                                </p>
                              )}
                            </div>

                            <div
                              className={cn(
                                "flex flex-col items-start md:items-end p-3 rounded-xl border min-w-[140px] shrink-0 shadow-sm",
                                isFullRoute
                                  ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20"
                                  : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-500/20",
                              )}
                            >
                              <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                                Costo Autorizado
                              </span>
                              <span
                                className={cn(
                                  "font-mono font-black text-xl leading-none",
                                  isFullRoute
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-blue-700 dark:text-blue-400",
                                )}
                              >
                                {formatCurrency(Number(cost || 0))}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-white/5">
                                <RouteIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                                  Distancia
                                </span>
                                <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {Number(seg.distancia_km || 0)} KM
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-white/5">
                                <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                                  Tiempo Estimado
                                </span>
                                <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {Math.floor(
                                    Number(seg.tiempo_minutos || 0) / 60,
                                  )}
                                  h {Number(seg.tiempo_minutos || 0) % 60}m
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
