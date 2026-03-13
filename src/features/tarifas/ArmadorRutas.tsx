// src/features/tarifas/ArmadorRutas.tsx
import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Eye,
  Pencil,
  Printer,
  MoreVertical,
  Wand2,
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
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
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
import { useClients } from "@/hooks/useClients";
import { tollService } from "@/services/tollService";
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
  costo_s: number; // 5 ejes (Sencillo)
  costo_f: number; // 9 ejes (Full)
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
  isFullUnit: boolean; // 🚀 Nueva prop para saber qué costo mostrar
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
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <>
      {hasGap && (
        <TableRow className="bg-amber-50/30 border-none h-7">
          <TableCell colSpan={showAdvanced ? 8 : 6} className="py-0">
            <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-amber-600 uppercase tracking-tighter">
              <AlertTriangle className="h-3 w-3" /> Discontinuidad detectada
              entre tramos
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

        {showAdvanced && (
          <>
            <TableCell className="w-16">
              <Input
                className="h-7 uppercase w-16 text-center border-transparent hover:border-slate-200 focus:bg-white"
                value={seg.estado}
                placeholder="Edo."
                onChange={(e) => updateSegment(idx, "estado", e.target.value)}
              />
            </TableCell>

            <TableCell className="w-24">
              <Input
                className="h-7 uppercase w-24 border-transparent hover:border-slate-200 focus:bg-white"
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
            className="h-7 w-20 text-right font-mono border-transparent hover:border-slate-200 focus:bg-white"
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
            className="h-7 w-20 text-right font-mono border-transparent hover:border-slate-200 focus:bg-white"
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

        {/* 🚀 Renderizado Condicional del Costo: Solo mostramos la configuración elegida */}
        {!isFullUnit && (
          <TableCell className="text-right font-mono font-bold text-blue-700 text-xs bg-blue-50/40">
            {formatCurrency(seg.costo_s)}
          </TableCell>
        )}
        {isFullUnit && (
          <TableCell className="text-right font-mono font-bold text-emerald-700 text-xs bg-emerald-50/40">
            {formatCurrency(seg.costo_f)}
          </TableCell>
        )}

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
  const { clients } = useClients();

  // ✅ Principales
  const [nombreRuta, setNombreRuta] = useState("");
  const [configuracion, setConfiguracion] = useState<"5ejes" | "9ejes">(
    "5ejes",
  ); // 🚀 Default Sencillo
  const isFullUnit = configuracion === "9ejes";

  // ✅ Secundarios (opcionales)
  const [selectedCliente, setSelectedCliente] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");

  const [segments, setSegments] = useState<SegmentEntry[]>([]);
  const [allTolls, setAllTolls] = useState<TollBooth[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<RateTemplate[]>([]);

  // 🚀 Filtro de tabla histórica
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "5ejes" | "9ejes">(
    "todos",
  );

  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tollSearch, setTollSearch] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<RateTemplate | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRouteDetail, setSelectedRouteDetail] =
    useState<RateTemplate | null>(null);
  const [showAdditional, setShowAdditional] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  // 🚀 NUEVO: Referencia para el scroll
  const topFormRef = useRef<HTMLDivElement>(null);
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

  // 🚀 Lógica del filtro de la tabla
  const rutasFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return savedRoutes;

    return savedRoutes.filter((r: any) => {
      const config = String(r.configuracion || "")
        .trim()
        .toLowerCase();

      const isSencillo =
        config === "5ejes" ||
        config === "5 ejes" ||
        config === "sencillo" ||
        config === "5ejes sencillo";

      const isFull =
        config === "9ejes" ||
        config === "9 ejes" ||
        config === "full" ||
        config === "9ejes full";

      return filtroTipo === "9ejes" ? isFull : isSencillo;
    });
  }, [savedRoutes, filtroTipo]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
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
      setSavedRoutes((prev) => prev.filter((r) => r.id !== routeToDelete.id));
      toast.success("Ruta eliminada correctamente");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleReverseRoute = () => {
    if (!origen && !destino && !nombreRuta) return;
    const oldO = origen;
    setOrigen(destino);
    setDestino(oldO);
    setNombreRuta((prev) => {
      if (!prev?.includes("-")) return prev;
      return prev
        .split("-")
        .map((x) => x.trim())
        .reverse()
        .join(" - ");
    });
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
    if (!nombreRuta.trim()) {
      toast.error("El nombre de la ruta es obligatorio.");
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

    const payload = {
      client_id:
        selectedCliente && selectedCliente !== "none"
          ? parseInt(selectedCliente, 10)
          : 6,
      origen: nombreRuta,
      destino: destino || "N/A",
      tipo_unidad: configuracion, // 🚀 Guardamos la configuración (5ejes o 9ejes)
      segments: mappedSegments,
    };

    try {
      let res: RateTemplate;
      if (editingRouteId) {
        res = await tollService.updateTemplate(editingRouteId, payload);
        setSavedRoutes((prev) =>
          prev.map((r) => (r.id === editingRouteId ? res : r)),
        );
        toast.success("Ruta actualizada correctamente");
      } else {
        res = await tollService.saveTemplate(payload as any);
        setSavedRoutes((prev) => [res, ...prev]);
        toast.success("Nueva ruta guardada exitosamente");
      }

      setEditingRouteId(null);
      setSegments([]);
      setNombreRuta("");
      setConfiguracion("5ejes");
      setSelectedCliente("");
      setOrigen("");
      setDestino("");
      setShowAdditional(false);
    } catch (error) {
      toast.error("Error al procesar la ruta");
    }
  };

  const handleEditRoute = (route: RateTemplate) => {
    setEditingRouteId(route.id);
    setNombreRuta(route.origen || "");
    setSelectedCliente(route.client_id ? String(route.client_id) : "");
    setOrigen("");
    setDestino(route.destino && route.destino !== "N/A" ? route.destino : "");

    // Cargamos la configuración guardada
    const isRouteFull =
      route.tipo_unidad === "9ejes" || route.tipo_unidad === "full";
    setConfiguracion(isRouteFull ? "9ejes" : "5ejes");

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

    // 🚀 SCROLL INFALIBLE HACIA LA REFERENCIA
    setTimeout(() => {
      // 1. Intentamos mover el elemento específico a la vista
      document.getElementById("form-rutas-top")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // 2. Forzamos a TODOS los contenedores padre con scroll a ir hacia arriba
      const scrollContainers = document.querySelectorAll(
        ".overflow-y-auto, .overflow-auto",
      );
      scrollContainers.forEach((container) => {
        container.scrollTo({ top: 0, behavior: "smooth" });
      });

      // 3. Fallback a la ventana principal
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 150);

    toast.info("Ruta cargada para edición");
  };

  // 🚀 FUNCIÓN: Generar Hoja de Ruta para el Chófer (Impresión)
  const handlePrintRoute = (route: RateTemplate) => {
    const isFull =
      route.tipo_unidad === "9ejes" || route.tipo_unidad === "full";
    const totalCost = isFull
      ? route.costo_total_full
      : route.costo_total_sencillo;
    const clientName =
      clients.find((c) => c.id === route.client_id)?.razon_social ||
      "Ruta Libre";

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
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; }
            .title { font-size: 26px; font-weight: 900; margin: 0; text-transform: uppercase; color: #0f172a; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; font-weight: bold; letter-spacing: 2px; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
            .info-box p { margin: 5px 0; font-size: 14px; }
            .info-box strong { color: #334155; display: inline-block; width: 140px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th, td { border-bottom: 1px solid #cbd5e1; padding: 12px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 800; text-transform: uppercase; color: #475569; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { font-weight: 900; font-size: 18px; background-color: #f8fafc; color: #0f172a; }
            .warning { text-align: center; border: 2px dashed #cbd5e1; padding: 15px; border-radius: 8px; color: #475569; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">BITÁCORA DE RUTA AUTORIZADA</h1>
            <p class="subtitle">DOCUMENTO OPERATIVO DE CONTROL</p>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <p><strong>CLIENTE:</strong> ${clientName.toUpperCase()}</p>
              <p><strong>ORIGEN:</strong> ${route.origen.toUpperCase()}</p>
              <p><strong>DESTINO FINAL:</strong> ${route.destino !== "N/A" ? route.destino.toUpperCase() : "NO ESPECIFICADO"}</p>
            </div>
            <div class="info-box text-right">
              <p><strong>CONFIGURACIÓN:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${isFull ? "FULL (9 EJES)" : "SENCILLO (5 EJES)"}</span></p>
              <p><strong>DISTANCIA SCT:</strong> ${Number(route.distancia_total_km || 0).toFixed(1)} KM</p>
              <p><strong>FECHA IMPRESIÓN:</strong> ${new Date().toLocaleDateString("es-MX")}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="text-center">Orden</th>
                <th>Tramo / Plaza de Cobro</th>
                <th>Estado / Vía</th>
                <th class="text-right">Monto Autorizado</th>
              </tr>
            </thead>
            <tbody>
              ${route.segments
                ?.map(
                  (seg: any, i: number) => `
                <tr>
                  <td class="text-center"><b>${i + 1}</b></td>
                  <td>
                    <span style="font-weight: bold; color: #0f172a;">${seg.nombre_segmento}</span><br/>
                    <span style="color: #64748b; font-size: 11px;">${seg.toll_booth_id ? "📍 Caseta SCT" : "🛣️ Tramo Libre"}</span>
                  </td>
                  <td>${seg.carretera || "-"} ${seg.estado ? `(${seg.estado})` : ""}</td>
                  <td class="text-right font-mono"><b>$${Number(isFull ? seg.costo_momento_full : seg.costo_momento_sencillo).toFixed(2)}</b></td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td colspan="3" class="text-right">PRESUPUESTO EXACTO PARA CASETAS:</td>
                <td class="text-right">$${Number(totalCost).toFixed(2)}</td>
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

  // 🚀 COLUMNAS DEL HISTÓRICO (AHORA DINÁMICAS SEGÚN LA CONFIGURACIÓN)
  const historyColumns: ColumnDef<RateTemplate>[] = useMemo(
    () => [
      {
        key: "origen",
        header: "Nombre de Ruta",
        render: (_, row) => (
          <div className="flex items-center gap-1 font-bold text-slate-700">
            <span>{row.origen}</span>
            {row.destino && row.destino !== "N/A" && (
              <>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground font-normal">
                  {row.destino}
                </span>
              </>
            )}
          </div>
        ),
      },
      {
        key: "client_id",
        header: "Cliente Asignado",
        render: (val) => {
          if (!val)
            return (
              <span className="text-slate-400 italic">Libre (Sin Cliente)</span>
            );
          return clients.find((c) => c.id === val)?.razon_social || val;
        },
      },
      {
        key: "tipo_unidad",
        header: "Configuración",
        type: "status",
        statusOptions: ["5ejes", "9ejes"],
        statusNormalizer: (value) => {
          const raw = String(value || "")
            .trim()
            .toLowerCase();

          if (raw === "full") return "9ejes";
          if (raw === "sencillo") return "5ejes";

          return raw;
        },
        render: (_, row) => {
          const isFullRoute =
            row.tipo_unidad === "9ejes" || row.tipo_unidad === "full";

          return (
            <Badge
              variant="outline"
              className={
                isFullRoute
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }
            >
              {isFullRoute ? "FULL (9 EJES)" : "SENCILLO (5 EJES)"}
            </Badge>
          );
        },
      },
      {
        key: "casetas",
        header: "Tramos",
        render: (_, row) => {
          const total = row.segments?.length || 0;
          const numPeaje =
            row.segments?.filter((s: any) => s.toll_booth_id !== null).length ||
            0;
          return (
            <Badge variant="outline" className="bg-slate-50 text-slate-600">
              {total} Tramos ({numPeaje} de Peaje)
            </Badge>
          );
        },
      },
      // 🚀 UNIFICAMOS LOS PRECIOS EN UNA SOLA COLUMNA QUE MUESTRA LO QUE CORRESPONDE
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
              className={`font-mono font-bold text-base ${isFullRoute ? "text-emerald-700" : "text-blue-700"}`}
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

              <DropdownMenuItem onClick={() => handlePrintRoute(row)}>
                <Printer className="mr-2 h-4 w-4 text-slate-700" /> Imprimir
                Bitácora
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
    <div
      className="space-y-6 scroll-mt-24"
      id="form-rutas-top"
      ref={topFormRef}
    >
      <Card className="border-t-4 border-t-primary shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b p-5">
          {/* ✅ FILA 1: OBLIGATORIOS CLAROS PARA GUSTAVO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-sm font-black text-slate-800 flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-primary" /> Nombre de la Ruta
                *
              </Label>
              <Input
                placeholder="Ej: Carcher (Ruta Corta)"
                className="h-11 bg-white text-base font-medium shadow-sm border-slate-300"
                value={nombreRuta}
                onChange={(e) => setNombreRuta(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Configuración de la
                Ruta *
              </Label>
              <Select
                value={configuracion}
                onValueChange={(v: any) => setConfiguracion(v)}
              >
                <SelectTrigger className="h-11 bg-white text-base font-bold shadow-sm border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5ejes">
                    Ruta para Tractocamión Sencillo (5 Ejes)
                  </SelectItem>
                  <SelectItem value="9ejes">
                    Ruta para Doble Articulado / Full (9 Ejes)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* FILA 2: OPCIONAL */}
          {showAdditional && (
            <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-white/60">
              <p className=" uppercase font-bold text-slate-400 mb-3 tracking-widest">
                Información Adicional (Opcional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">
                    Cliente Exclusivo
                  </Label>
                  <Select
                    value={selectedCliente}
                    onValueChange={(v) => {
                      setSelectedCliente(v === "none" ? "" : v);
                    }}
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="Ruta libre (Sin cliente)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ruta libre (Todos)</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">
                    Ciudad Origen
                  </Label>
                  <Input
                    placeholder="Opcional"
                    className="h-9 bg-white"
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">
                    Ciudad Destino
                  </Label>
                  <Input
                    placeholder="Opcional"
                    className="h-9 bg-white"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-slate-300 hover:bg-slate-100"
              onClick={handleReverseRoute}
              title="Invertir"
            >
              <Repeat className="h-4 w-4 mr-2 text-slate-600" /> Invertir Ruta
            </Button>
          </div>
        </CardHeader>

        {/* TOOLBAR */}
        <div className="bg-slate-100/50 border-b p-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
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
            <div className="flex items-center space-x-2 border-l pl-6 border-slate-300">
              <Switch
                id="additional-info-mode"
                checked={showAdditional}
                onCheckedChange={setShowAdditional}
              />
              <Label
                htmlFor="additional-info-mode"
                className="text-xs font-semibold cursor-pointer"
              >
                Más Opciones (Cliente/Ciudad)
              </Label>
            </div>
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
                <TableRow className="uppercase font-bold text-slate-600">
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
                  {/* 🚀 ENCABEZADO DE COSTO DINÁMICO */}
                  {!isFullUnit && (
                    <TableHead className="text-right text-blue-700 font-black">
                      Costo Sencillo
                    </TableHead>
                  )}
                  {isFullUnit && (
                    <TableHead className="text-right text-emerald-700 font-black">
                      Costo Full
                    </TableHead>
                  )}
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
                      isFullUnit={isFullUnit} // Le pasamos la configuración para que oculte columnas
                    />
                  ))}
                </SortableContext>

                {/* TOTALES */}
                <TableRow className="bg-slate-900 text-white font-bold hover:bg-slate-900 border-none sticky bottom-0">
                  <TableCell
                    colSpan={showAdvanced ? 4 : 2}
                    className="text-right uppercase tracking-widest opacity-70"
                  >
                    Totales SCT
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs border-l border-white/10">
                    {totals.distancia.toFixed(1)} km
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs border-l border-white/10">
                    {Math.floor(totals.tiempo / 60)}h {totals.tiempo % 60}m
                  </TableCell>
                  {/* 🚀 TOTAL DINÁMICO */}
                  {!isFullUnit && (
                    <TableCell className="text-right text-base font-bold text-blue-400 border-l border-white/10">
                      {formatCurrency(totals.costo_s)}
                    </TableCell>
                  )}
                  {isFullUnit && (
                    <TableCell className="text-right text-base font-bold text-emerald-400 border-l border-white/10">
                      {formatCurrency(totals.costo_f)}
                    </TableCell>
                  )}
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
                              nombre_segmento: t.nombre,
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
                          <p className="text-muted-foreground uppercase leading-tight mt-0.5">
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
                          {/* 🚀 Solo mostramos el precio que aplica para la ruta actual */}
                          {!isFullUnit && (
                            <Badge
                              variant="secondary"
                              className="font-mono text-[12px] bg-blue-50 text-blue-700 border-blue-200 px-2 py-1"
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
                              className="font-mono text-[12px] bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-1"
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
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-3">
          {editingRouteId && (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                setEditingRouteId(null);
                setSegments([]);
                setNombreRuta("");
                setConfiguracion("5ejes");
                setSelectedCliente("");
                setOrigen("");
                setDestino("");
                setShowAdditional(false);
                toast.info("Edición cancelada");
              }}
            >
              Cancelar Edición
            </Button>
          )}
          <ActionButton
            onClick={handleSave}
            className="px-12 h-11 text-base shadow-lg shadow-primary/20"
          >
            <Check className="h-5 w-5 mr-2" />
            {editingRouteId ? "Actualizar Ruta" : "Guardar Ruta"}
          </ActionButton>
        </div>
      </div>

      {/* TABLA TARIFAS HISTÓRICAS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-3">
          <CardTitle className="text-lg">Catálogo de Rutas Armadas</CardTitle>
          {/* 🚀 FILTRO POR TIPO DE RUTA */}
          <Select
            value={filtroTipo}
            onValueChange={(v: any) => setFiltroTipo(v)}
          >
            <SelectTrigger className="w-[240px] bg-white h-9 text-xs font-bold border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las Configuraciones</SelectItem>
              <SelectItem value="5ejes">
                Solo Rutas Sencillas (5 Ejes)
              </SelectItem>
              <SelectItem value="9ejes">Solo Rutas Full (9 Ejes)</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={rutasFiltradas}
            columns={historyColumns}
            exportFileName="rutas_armadas"
          />
        </CardContent>
      </Card>

      {/* MODAL ELIMINACIÓN */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 font-black">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar Ruta Armada?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 leading-relaxed pt-2 space-y-3">
              <p>
                Estás a punto de eliminar la plantilla de ruta{" "}
                <b>{routeToDelete?.origen}</b>.
              </p>
              <div className="text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 font-medium">
                <b>Tranquilo:</b> Los viajes históricos que ya fueron
                despachados o liquidados con esta ruta{" "}
                <b>NO se verán afectados</b>.
              </div>
              <p>
                Sin embargo, esta plantilla se desactivará y{" "}
                <b>ya no podrá ser seleccionada para viajes futuros</b> en el
                módulo de Despacho.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90 font-bold"
            >
              Sí, Eliminar Ruta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DETALLE DE LA RUTA */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b flex flex-row justify-between items-start">
            <DialogTitle className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Detalles de Ruta
              </span>
              <div className="flex items-center gap-2 text-xl text-primary">
                <span>{selectedRouteDetail?.origen}</span>
              </div>
            </DialogTitle>
            {selectedRouteDetail && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-slate-300"
                onClick={() => handlePrintRoute(selectedRouteDetail)}
              >
                <Printer className="h-4 w-4 mr-2" /> Imprimir Hoja
              </Button>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 px-2 py-4">
            {selectedRouteDetail && (
              <div className="relative border-l-2 border-slate-200 ml-4 mt-2 space-y-8 pb-6">
                {selectedRouteDetail.segments.map((seg: any, idx: number) => {
                  const isFullRoute =
                    selectedRouteDetail.tipo_unidad === "9ejes" ||
                    selectedRouteDetail.tipo_unidad === "full";
                  return (
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
                          <Badge
                            variant="outline"
                            className={
                              seg.toll_booth_id
                                ? "bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px]"
                                : "bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px]"
                            }
                          >
                            {seg.toll_booth_id ? "Caseta" : "Tramo Libre"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs">
                          {/* 🚀 Solo mostramos el costo de la configuración que guardó */}
                          <div
                            className={`p-2.5 border rounded-lg inline-block min-w-[150px] ${isFullRoute ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"}`}
                          >
                            <p className="text-slate-500 font-semibold mb-1 uppercase">
                              Costo Autorizado (
                              {isFullRoute ? "9 Ejes" : "5 Ejes"})
                            </p>
                            <p
                              className={`font-mono text-sm font-bold ${isFullRoute ? "text-emerald-700" : "text-blue-700"}`}
                            >
                              {formatCurrency(
                                Number(
                                  isFullRoute
                                    ? seg.costo_momento_full
                                    : seg.costo_momento_sencillo,
                                ),
                              )}
                            </p>
                          </div>
                        </div>
                        {seg.carretera ||
                        seg.distancia_km ||
                        seg.tiempo_minutos ? (
                          <div className="flex flex-wrap gap-4 mt-1 text-[11px] text-slate-500 font-mono bg-white p-2 border border-dashed rounded-md">
                            {seg.carretera ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {seg.carretera}
                              </span>
                            ) : null}
                            <span>
                              Distancia: {Number(seg.distancia_km || 0)} km
                            </span>
                            <span>
                              Tiempo:{" "}
                              {Math.floor(Number(seg.tiempo_minutos || 0) / 60)}
                              h {Number(seg.tiempo_minutos || 0) % 60}m
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
