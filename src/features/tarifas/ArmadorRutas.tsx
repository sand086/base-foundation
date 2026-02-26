// src/features/tarifas/ArmadorRutas.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Search,
  ArrowRight,
  Loader2,
  Check,
  MapPin,
  AlertTriangle,
  Repeat,
  HelpCircle,
  Eye,
  Pencil,
  MoreVertical,
  Wand2, // ✅ NUEVO
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
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch"; // ✅ NUEVO
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

// Services & Hooks
import { TollBooth, RateTemplate } from "@/types/api.types";
import { useTiposUnidad } from "@/hooks/useTiposUnidad";
import { useClients } from "@/hooks/useClients";
import { tollService, RateTemplateCreate } from "@/services/tollService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

interface SegmentEntry {
  tempId: string;
  nombre_segmento: string;
  estado: string;
  carretera: string;
  distancia_km: number;
  tiempo_minutos: number;
  toll_booth_id: number | null;
  toll_nombre?: string;
  // Siempre presentes (lado a lado)
  costo_s: number; // 6 ejes (Sencillo) en UI
  costo_f: number; // 9 ejes (Full) en UI
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
  showAdvanced: boolean; // ✅ NUEVO (para ocultar/mostrar Edo/Carr)
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
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <>
      {hasGap && (
        <TableRow className="bg-amber-50/30 border-none h-7">
          {/* ✅ colSpan dinámico según columnas visibles */}
          <TableCell colSpan={showAdvanced ? 9 : 7} className="py-0">
            <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-amber-600 uppercase tracking-tighter">
              <AlertTriangle className="h-3 w-3" /> Discontinuidad:{" "}
              {(seg.nombre_segmento.split("-")[0] || "").trim()} no conecta con
              el anterior
            </div>
          </TableCell>
        </TableRow>
      )}

      <TableRow
        ref={setNodeRef}
        style={style}
        className={cn(
          "group transition-colors",
          isDragging
            ? "bg-slate-100 shadow-2xl"
            : seg.toll_booth_id
              ? "bg-white"
              : "bg-slate-50/40",
        )}
      >
        <TableCell className="w-10">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-primary transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </TableCell>

        <TableCell className={showAdvanced ? "w-[30%]" : "w-[40%]"}>
          <div className="flex flex-col gap-0.5">
            <Input
              className="h-7 text-xs font-bold border-transparent hover:border-slate-200 focus:bg-white"
              value={seg.nombre_segmento}
              onChange={(e) =>
                updateSegment(idx, "nombre_segmento", e.target.value)
              }
              placeholder="Ej: CDMX - Puebla"
            />
            {seg.toll_booth_id && (
              <span className="text-[8px] font-black text-primary px-1 uppercase tracking-tighter">
                ● Peaje Registrado
              </span>
            )}
          </div>
        </TableCell>

        {/* ✅ COLUMNAS OPCIONALES: Estado/Carretera */}
        {showAdvanced && (
          <>
            <TableCell className="w-16">
              <Input
                className="h-7 text-[10px] uppercase w-16 text-center border-transparent hover:border-slate-200 focus:bg-white"
                value={seg.estado}
                placeholder="Edo."
                onChange={(e) => updateSegment(idx, "estado", e.target.value)}
              />
            </TableCell>

            <TableCell className="w-24">
              <Input
                className="h-7 text-[10px] uppercase w-24 border-transparent hover:border-slate-200 focus:bg-white"
                value={seg.carretera}
                placeholder="Carr."
                onChange={(e) =>
                  updateSegment(idx, "carretera", e.target.value)
                }
              />
            </TableCell>
          </>
        )}

        <TableCell className="w-20">
          <Input
            type="number"
            className="h-7 text-[10px] w-20 text-right font-mono border-transparent hover:border-slate-200 focus:bg-white"
            value={seg.distancia_km || ""}
            onChange={(e) =>
              updateSegment(
                idx,
                "distancia_km",
                parseFloat(e.target.value) || 0,
              )
            }
          />
        </TableCell>

        <TableCell className="w-20">
          <Input
            type="number"
            className="h-7 text-[10px] w-20 text-right font-mono border-transparent hover:border-slate-200 focus:bg-white"
            value={seg.tiempo_minutos || ""}
            onChange={(e) =>
              updateSegment(
                idx,
                "tiempo_minutos",
                parseInt(e.target.value) || 0,
              )
            }
          />
        </TableCell>

        {/* 6 ejes (Sencillo) */}
        <TableCell className="text-right font-mono text-slate-600 text-xs">
          {formatCurrency(seg.costo_s)}
        </TableCell>

        {/* 9 ejes (Full) */}
        <TableCell className="text-right font-mono font-bold text-slate-800 text-xs bg-slate-50/40">
          {formatCurrency(seg.costo_f)}
        </TableCell>

        <TableCell className="w-10 text-right">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
            onClick={() => removeSegment(idx)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    </>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const ArmadorRutas: React.FC = () => {
  const { tiposActivos } = useTiposUnidad();
  const { clients } = useClients();

  const [selectedCliente, setSelectedCliente] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [tipoUnidadId, setTipoUnidadId] = useState("");

  const [segments, setSegments] = useState<SegmentEntry[]>([]);
  const [allTolls, setAllTolls] = useState<TollBooth[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<RateTemplate[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tollSearch, setTollSearch] = useState("");

  // ✅ NUEVO: Toggle Modo Avanzado
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ✅ NUEVO: Estado de cálculo
  const [isCalculating, setIsCalculating] = useState(false);

  // Eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<RateTemplate | null>(null);

  // Modal detalle (Timeline)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRouteDetail, setSelectedRouteDetail] =
    useState<RateTemplate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, rs] = await Promise.all([
          tollService.getTolls(),
          tollService.getTemplates(),
        ]);
        setAllTolls(t);
        setSavedRoutes(rs);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, []);

  // Detección FULL (se usa solo para tipo_unidad al guardar, compatibilidad)
  const isFullUnit = useMemo(() => {
    const t = tiposActivos.find((x) => x.id === tipoUnidadId);
    const name = t?.nombre?.toLowerCase?.() || "";
    return (
      name.includes("full") || name.includes("9 ejes") || name.includes("9ejes")
    );
  }, [tipoUnidadId, tiposActivos]);

  // Totales lado a lado
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val || 0);

  // --- MANEJADORES ---
  const updateSegment = (idx: number, field: UpdateField, value: unknown) => {
    setSegments((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === "nombre_segmento") {
        // Buscar por nombre O por tramo
        const match = allTolls.find(
          (t) =>
            (t.nombre || "").toLowerCase() === String(value).toLowerCase() ||
            (t.tramo || "").toLowerCase() === String(value).toLowerCase(),
        );

        if (match) {
          updated[idx].carretera = (match as any).carretera || "";
          updated[idx].estado = (match as any).estado || "";
          updated[idx].toll_booth_id = match.id;

          // 6 ejes (Sencillo)
          updated[idx].costo_s = (match as any).costo_5_ejes_sencillo ?? 0;

          // 9 ejes (Full)
          updated[idx].costo_f = (match as any).costo_9_ejes_full ?? 0;
        } else {
          // Si el usuario escribe algo que no es caseta, limpiamos el peaje
          updated[idx].toll_booth_id = null;
        }
      }

      return updated;
    });
  };

  // ✅ NUEVO: Auto-calcular KM y Min (mock listo para reemplazar por API real)
  const handleAutoCalculate = async () => {
    if (segments.length === 0) {
      toast.warning("Agrega al menos un tramo/caseta para calcular");
      return;
    }

    setIsCalculating(true);

    // TODO (producción):
    // const response = await api.post("/api/rutas/calcular", { origen, destino, segments });
    // setSegments(response.data.segments);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSegments((prev) =>
      prev.map((seg) => {
        const newKm =
          seg.distancia_km > 0
            ? seg.distancia_km
            : Math.floor(Math.random() * 50) + 20; // 20..70
        const newMins =
          seg.tiempo_minutos > 0
            ? seg.tiempo_minutos
            : Math.floor(newKm * 0.85); // ~70km/h

        return {
          ...seg,
          distancia_km: newKm,
          tiempo_minutos: newMins,
        };
      }),
    );

    setIsCalculating(false);
    toast.success("Distancias y tiempos estimados calculados.");
  };

  const handleEditRoute = (route: RateTemplate) => {
    setSelectedCliente(route.client_id.toString());
    setOrigen(route.origen);
    setDestino(route.destino);

    const unit = tiposActivos.find((t) =>
      route.tipo_unidad === "9ejes"
        ? t.nombre.toLowerCase().includes("9")
        : t.nombre.toLowerCase().includes("5"),
    );
    if (unit) setTipoUnidadId(unit.id);

    setSegments(
      route.segments.map((s) => ({
        tempId: genTempId(),
        nombre_segmento: s.nombre_segmento,
        estado: s.estado || "",
        carretera: s.carretera || "",
        distancia_km: s.distancia_km,
        tiempo_minutos: s.tiempo_minutos,
        toll_booth_id: s.toll_booth_id,
        costo_s: s.costo_momento_sencillo,
        costo_f: s.costo_momento_full,
      })),
    );

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 800);

    toast.info("Ruta cargada para edición");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSegments((items) => {
      const oldIndex = items.findIndex((i) => i.tempId === active.id);
      const newIndex = items.findIndex((i) => i.tempId === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });

    toast.info("Orden de ruta actualizado", { duration: 1000 });
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete) return;
    try {
      await tollService.deleteTemplate(routeToDelete.id);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== routeToDelete.id));
      toast.success("Tarifa eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleReverseRoute = () => {
    if (segments.length === 0) return;
    const oldO = origen;
    setOrigen(destino);
    setDestino(oldO);

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

  const handleSave = async () => {
    if (!selectedCliente || !origen || !destino || !tipoUnidadId) {
      return toast.error("Datos incompletos");
    }

    const payload: RateTemplateCreate = {
      client_id: parseInt(selectedCliente, 10),
      origen,
      destino,
      tipo_unidad: isFullUnit ? "9ejes" : "5ejes",
      segments: segments.map((s, idx) => ({ ...s, orden: idx + 1 })) as any,
    };

    try {
      const res = await tollService.saveTemplate(payload);
      setSavedRoutes((prev) => [res, ...prev]);
      setSegments([]);
      toast.success("Tarifa Autorizada Guardada");
    } catch {
      toast.error("Error al guardar");
    }
  };

  // History: Casetas + Costo 6 + Costo 9
  const historyColumns: ColumnDef<RateTemplate>[] = useMemo(
    () => [
      {
        key: "client_id",
        header: "Cliente",
        render: (val) => clients.find((c) => c.id === val)?.razon_social || val,
      },
      {
        key: "origen",
        header: "Ruta",
        render: (_, row) => (
          <div className="flex items-center gap-1 font-bold text-slate-700">
            <span>{row.origen}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span>{row.destino}</span>
          </div>
        ),
      },
      {
        key: "casetas",
        header: "Casetas",
        render: (_, row) => {
          const numCasetas =
            row.segments?.filter((s: any) => s.toll_booth_id !== null).length ||
            0;
          return (
            <Badge variant="outline" className="bg-slate-50 text-slate-600">
              {numCasetas} {numCasetas === 1 ? "Caseta" : "Casetas"}
            </Badge>
          );
        },
      },
      {
        key: "costo_total_sencillo",
        header: "Costo 6 Ejes",
        render: (v) => (
          <span className="font-mono font-medium text-blue-600">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
      },
      {
        key: "costo_total_full",
        header: "Costo 9 Ejes",
        render: (v) => (
          <span className="font-mono font-bold text-emerald-600">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
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
                className="h-8 w-8 hover:bg-slate-200"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditRoute(row)}>
                <Pencil className="mr-2 h-4 w-4 text-blue-500" /> Editar Ruta
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setSelectedRouteDetail(row);
                  setDetailModalOpen(true);
                }}
              >
                <Eye className="mr-2 h-4 w-4 text-slate-500" /> Ver Detalle
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setRouteToDelete(row);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <Alert className="bg-blue-50 border-blue-200 mb-6 shadow-sm">
        <HelpCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 text-xs leading-relaxed font-medium">
          **Guía:** Selecciona cliente y unidad. Inserta casetas o tramos
          libres. Activa **Modo Avanzado** para ver/editar Estado y Carretera.
          Usa **Auto-calcular** para estimar KM y tiempo (mock listo para
          conectarlo a tu API).
        </AlertDescription>
      </Alert> */}

      <Card className="border-t-4 border-t-primary shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">
                Cliente Autorizado
              </Label>
              <Select
                value={selectedCliente}
                onValueChange={setSelectedCliente}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="Cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">
                Origen
              </Label>
              <Input
                placeholder="CDMX"
                className="h-9 bg-white"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">
                Destino
              </Label>
              <Input
                placeholder="VERACRUZ"
                className="h-9 bg-white"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Unidad
                </Label>
                <Select value={tipoUnidadId} onValueChange={setTipoUnidadId}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Ejes..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposActivos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 border-slate-300 hover:bg-slate-100"
                onClick={handleReverseRoute}
                title="Invertir"
              >
                <Repeat className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* ✅ TOOLBAR: switch + autocalc */}
        <div className="bg-slate-100/50 border-b p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Switch
              id="advanced-mode"
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
            <Label
              htmlFor="advanced-mode"
              className="text-xs font-semibold cursor-pointer"
            >
              Mostrar Carretera / Estado
            </Label>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoCalculate}
            disabled={isCalculating || segments.length === 0}
            className="h-8 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
          >
            {isCalculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Auto-Calcular KM / Min
          </Button>
        </div>

        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow className="text-[10px] uppercase font-bold text-slate-600">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className={showAdvanced ? "w-[30%]" : "w-[40%]"}>
                    Tramo / Plaza
                  </TableHead>
                  {showAdvanced && <TableHead className="w-16">Edo.</TableHead>}
                  {showAdvanced && (
                    <TableHead className="w-24">Carr.</TableHead>
                  )}
                  <TableHead className="text-right w-20">Km</TableHead>
                  <TableHead className="text-right w-20">Min</TableHead>
                  <TableHead className="text-right">6 Ejes (Senc.)</TableHead>
                  <TableHead className="text-right">9 Ejes (Full)</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="relative">
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
                    />
                  ))}
                </SortableContext>

                {/* TOTALES */}
                <TableRow className="bg-slate-900 text-white font-bold hover:bg-slate-900 border-none sticky bottom-0">
                  <TableCell
                    colSpan={showAdvanced ? 4 : 2}
                    className="text-right text-[10px] uppercase tracking-widest opacity-70"
                  >
                    Totales SCT
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs border-l border-white/10">
                    {totals.distancia.toFixed(1)} km
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs border-l border-white/10">
                    {Math.floor(totals.tiempo / 60)}h {totals.tiempo % 60}m
                  </TableCell>
                  <TableCell className="text-right text-base font-bold text-blue-400 border-l border-white/10">
                    {formatCurrency(totals.costo_s)}
                  </TableCell>
                  <TableCell className="text-right text-base font-bold text-emerald-400 border-l border-white/10">
                    {formatCurrency(totals.costo_f)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      {/* BOTONES INFERIORES */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-2xl border shadow-sm gap-4">
        <div className="flex gap-3">
          <Button
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
            className="h-10 border-slate-200"
          >
            <Plus className="h-4 w-4 mr-2 text-primary" /> Tramo Libre
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-10 border-slate-200">
                <MapPin className="h-4 w-4 mr-2 text-emerald-600" /> Catálogo
                Casetas
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Insertar Caseta</DialogTitle>
              </DialogHeader>

              <div className="relative my-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filtrar por nombre o tramo..."
                  className="pl-9 h-9"
                  value={tollSearch}
                  onChange={(e) => setTollSearch(e.target.value)}
                />
              </div>

              <ScrollArea className="h-80 pr-4">
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
                        className="p-3 border rounded-lg flex justify-between items-center hover:bg-slate-50 cursor-pointer group transition-colors"
                        onClick={() => {
                          setSegments([
                            ...segments,
                            {
                              tempId: genTempId(),
                              nombre_segmento: t.nombre, // ✅ nombre
                              estado: (t as any).estado || "",
                              carretera: (t as any).carretera || "",
                              distancia_km: 0,
                              tiempo_minutos: 0,
                              toll_booth_id: t.id,
                              toll_nombre: t.nombre,
                              costo_s: (t as any).costo_5_ejes_sencillo ?? 0,
                              costo_f: (t as any).costo_9_ejes_full ?? 0,
                            },
                          ]);
                          setDialogOpen(false);
                        }}
                      >
                        <div className="flex-1 pr-4">
                          <p className="text-sm font-bold group-hover:text-primary">
                            {t.nombre}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase leading-tight mt-0.5">
                            {t.tramo}
                            {((t as any).carretera || (t as any).estado) && (
                              <span className="block mt-0.5 text-slate-400">
                                📍 {(t as any).carretera}{" "}
                                {(t as any).carretera && (t as any).estado
                                  ? "•"
                                  : ""}{" "}
                                {(t as any).estado}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9px] bg-blue-50 text-blue-700 border-blue-100 px-1.5"
                          >
                            Sencillo:{" "}
                            {formatCurrency(
                              (t as any).costo_5_ejes_sencillo ?? 0,
                            )}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100 px-1.5"
                          >
                            Full:{" "}
                            {formatCurrency((t as any).costo_9_ejes_full ?? 0)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <ActionButton
          onClick={handleSave}
          className="px-12 h-11 text-base shadow-lg shadow-primary/20"
        >
          <Check className="h-5 w-5 mr-2" /> Guardar y Autorizar
        </ActionButton>
      </div>

      {/* TABLA TARIFAS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-3">
          <CardTitle className="text-lg">Tarifas Autorizadas</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={savedRoutes}
            columns={historyColumns}
            exportFileName="tarifas_tms"
          />
        </CardContent>
      </Card>

      {/* MODAL ELIMINACIÓN */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarifa autorizada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y afectará los reportes de
              rentabilidad históricos asociados a esta ruta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DETALLE (TIMELINE) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Detalles de Ruta
              </span>
              <div className="flex items-center gap-2 text-xl text-primary">
                <span>{selectedRouteDetail?.origen}</span>
                <ArrowRight className="h-5 w-5" />
                <span>{selectedRouteDetail?.destino}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-2 py-4">
            {selectedRouteDetail && (
              <div className="relative border-l-2 border-slate-200 ml-4 mt-2 space-y-8 pb-6">
                {selectedRouteDetail.segments.map((seg: any, idx: number) => (
                  <div key={seg.id || idx} className="relative pl-6">
                    <span
                      className={cn(
                        "absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white",
                        seg.toll_booth_id ? "bg-amber-500" : "bg-blue-500",
                      )}
                    />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-bold text-slate-800">
                          {seg.nombre_segmento}
                        </span>
                        {seg.toll_booth_id ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px]"
                          >
                            Caseta
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px]"
                          >
                            Tramo Libre
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                        <div className="p-2.5 bg-slate-50 border rounded-lg">
                          <p className="text-slate-500 font-semibold mb-1 text-[10px] uppercase">
                            Sencillo (6 Ejes)
                          </p>
                          <p className="font-mono text-sm">
                            {formatCurrency(
                              Number(seg.costo_momento_sencillo || 0),
                            )}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 border rounded-lg">
                          <p className="text-slate-500 font-semibold mb-1 text-[10px] uppercase">
                            Full (9 Ejes)
                          </p>
                          <p className="font-mono font-bold text-emerald-600 text-sm">
                            {formatCurrency(
                              Number(seg.costo_momento_full || 0),
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-1 text-[11px] text-slate-500 font-mono bg-white p-2 border border-dashed rounded-md">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {seg.carretera}
                        </span>
                        <span>Distancia: {seg.distancia_km} km</span>
                        <span>
                          Tiempo: {Math.floor(seg.tiempo_minutos / 60)}h{" "}
                          {seg.tiempo_minutos % 60}m
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
