import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Truck,
  Loader2,
  CheckCircle2,
  MapPin,
  Box,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Ticket,
  Container,
  Package,
  Minus,
  Scale,
  Hash,
  AlertCircle,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Lock,
} from "lucide-react";
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
import { useUnits } from "@/features/units/hooks/useUnits";
import { useOperators } from "@/features/operators/hooks/useOperators";
import { useSatCatalogs } from "@/features/settings/hooks/useSatCatalogs";
import { Trip, TripLegCreatePayload } from "../types";
import { cn, checkIsFullTrip } from "@/lib/utils";
import axiosClient from "@/api/axiosClient";

// ─── Tipos locales estrictos ──────────────────────────────────────────────────

interface Unit {
  id: number;
  numero_economico: string;
  tipo_1: string;
  tipo: string;
  placas: string;
  status: string;
  is_loaded?: boolean;
}

interface Operator {
  id: number;
  name: string;
  status: string;
}

interface ExtendedLegPayload extends TripLegCreatePayload {
  remolque_1_id?: number | null;
  dolly_id?: number | null;
  remolque_2_id?: number | null;
  otros_anticipos: number;
  destino_vacio?: string;
}

interface NextLegModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripPadre: Trip | null;
  onSubmit: (tripId: string, payload: TripLegCreatePayload) => Promise<boolean>;
  onSuccessRefresh?: () => void;
}

type SearchableItem = {
  label: string;
  value: string;
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(val || 0);

const UNIT_STATUSES_AVAILABLE = [
  "disponible",
  "bloqueado",
  "en_ruta",
  "en ruta",
] as const;

const normalizeStr = (str?: string | null) =>
  str
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") || "";

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

function SearchableSelect({
  items,
  value,
  onSelect,
  placeholder,
  className,
}: {
  items: SearchableItem[];
  value: string;
  onSelect: (val: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 w-full justify-between rounded-xl border-slate-200 bg-card px-4 font-semibold text-slate-800 shadow-sm backdrop-blur-xl dark:border-white/10 dark:text-slate-100",
            className,
          )}
        >
          {selectedItem ? (
            <span className="truncate text-left">{selectedItem.label}</span>
          ) : (
            <span className="truncate text-left text-slate-400 dark:text-slate-500">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 border-slate-200 dark:border-white/10"
        align="start"
        sideOffset={8}
      >
        <Command className="dark:bg-slate-900">
          <CommandInput placeholder="Escribe para buscar..." />
          <CommandList className="max-h-[280px] custom-scrollbar">
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  className="rounded-xl cursor-pointer dark:text-slate-200"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-emerald-500",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function NextLegModal({
  open,
  onOpenChange,
  tripPadre,
  onSubmit,
  onSuccessRefresh,
}: NextLegModalProps) {
  const { unidades, updateLoadStatus } = useUnits();
  const { operadores } = useOperators();
  const { products: satProducts } = useSatCatalogs();

  const [loading, setLoading] = useState(false);
  const [showFiscalData, setShowFiscalData] = useState(false);

  const [formData, setFormData] = useState<Partial<ExtendedLegPayload>>({
    leg_type: "ruta_carretera",
    unit_id: null,
    operator_id: null,
    remolque_1_id: null,
    dolly_id: null,
    remolque_2_id: null,
    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
    otros_anticipos: 0,
    destino_vacio: "",
  });

  const [tripFiscalData, setTripFiscalData] = useState({
    contenedor_1: "",
    contenedor_2: "",
    referencia: "",
    peso_toneladas: 0,
    descripcion_mercancia: "",
    sat_clave_producto: "01010101",
    sat_clave_unidad: "E48",
    es_material_peligroso: false,
    clase_imo: "",
  });

  useEffect(() => {
    if (open && tripPadre) {
      const lastLeg =
        tripPadre.legs && tripPadre.legs.length > 0
          ? tripPadre.legs[tripPadre.legs.length - 1]
          : null;

      let nextLegType: any = "ruta_carretera";
      if (lastLeg?.leg_type === "carga_muelle") nextLegType = "ruta_carretera";
      if (lastLeg?.leg_type === "ruta_carretera") nextLegType = "entrega_vacio";

      //  FIX LEAD: Casteo estricto a Number para asegurar que los comparadores === funcionen en los filtros.
      const inheritedR1 = tripPadre.remolque_1_id
        ? Number(tripPadre.remolque_1_id)
        : (lastLeg as any)?.remolque_1_id
          ? Number((lastLeg as any).remolque_1_id)
          : null;
      const inheritedDolly = tripPadre.dolly_id
        ? Number(tripPadre.dolly_id)
        : (lastLeg as any)?.dolly_id
          ? Number((lastLeg as any).dolly_id)
          : null;
      const inheritedR2 = tripPadre.remolque_2_id
        ? Number(tripPadre.remolque_2_id)
        : (lastLeg as any)?.remolque_2_id
          ? Number((lastLeg as any).remolque_2_id)
          : null;

      setFormData({
        leg_type: nextLegType,
        // El tracto y operador los dejamos null (o heredados) para que despachen al nuevo relevo.
        unit_id: lastLeg?.unit_id ? Number(lastLeg.unit_id) : null,
        operator_id: lastLeg?.operator_id ? Number(lastLeg.operator_id) : null,

        remolque_1_id: inheritedR1,
        dolly_id: inheritedDolly,
        remolque_2_id: inheritedR2,

        anticipo_casetas: tripPadre.costo_casetas ?? 0,
        anticipo_viaticos: 0,
        anticipo_combustible: 0,
        otros_anticipos: 0,
        destino_vacio: "",
      });

      // --- 🛡️ INICIO PARCHE DEFENSIVO SAT ---
      const rawDescription = tripPadre.descripcion_mercancia || "Carga General";
      // Buscamos si la descripción empieza exactamente con 8 dígitos (ej. "12161800 - ...")
      const matchSatCode = rawDescription.match(/^(\d{8})\b/);

      // Si encontramos la clave en la descripción, la usamos. Si no, fallback a lo que manda el backend o genérico.
      const realSatCode = matchSatCode
        ? matchSatCode[1]
        : tripPadre.sat_clave_producto || "01010101";

      // Limpiamos la descripción para que no se duplique visualmente (quita la clave y el guion)
      const cleanDescription = matchSatCode
        ? rawDescription
            .substring(matchSatCode[0].length)
            .replace(/^[\s-]+/, "")
        : rawDescription;
      // --- 🛡️ FIN PARCHE DEFENSIVO SAT ---

      setTripFiscalData({
        contenedor_1: (tripPadre as any).contenedor_1 || "",
        contenedor_2: (tripPadre as any).contenedor_2 || "",
        referencia: (tripPadre as any).referencia || "",
        peso_toneladas: tripPadre.peso_toneladas || 0,
        descripcion_mercancia: cleanDescription, // Descripción limpia
        sat_clave_producto: realSatCode, // Clave real extraída (ej. "12161800")
        sat_clave_unidad: tripPadre.sat_clave_unidad || "E48",
        es_material_peligroso: tripPadre.es_material_peligroso || false,
        clase_imo: tripPadre.clase_imo || "",
      });

      setShowFiscalData(false);
    }
  }, [open, tripPadre]);

  useEffect(() => {
    console.log("=== 🚦 DEBUG FISCAL PARSEADO ===");
    console.log(
      "Clave SAT a inyectar en el Select:",
      tripFiscalData.sat_clave_producto,
    );
    console.log("Descripción limpia:", tripFiscalData.descripcion_mercancia);
  }, [tripFiscalData]);

  const isFullTrip = useMemo(() => {
    return checkIsFullTrip(tripPadre);
  }, [tripPadre]);

  const availableSatProducts = useMemo(
    () =>
      satProducts.map((p) => ({
        label: `${p.clave} - ${p.descripcion}`,
        value: p.clave,
        ...p,
      })),
    [satProducts],
  );

  const isFiscalDataComplete = useMemo(() => {
    return (
      tripFiscalData.peso_toneladas > 0 &&
      tripFiscalData.sat_clave_producto.trim() !== "" &&
      tripFiscalData.sat_clave_unidad.trim() !== "" &&
      tripFiscalData.descripcion_mercancia.trim() !== ""
    );
  }, [tripFiscalData]);

  const finanzas = useMemo(() => {
    if (!tripPadre)
      return {
        base: 0,
        casetasPactadas: 0,
        subtotal: 0,
        iva: 0,
        retencion: 0,
        total: 0,
      };
    const base = tripPadre.tarifa_base ?? 0;
    const casetas = tripPadre.costo_casetas ?? 0;
    const subtotal = base + casetas;
    const iva = subtotal * 0.16;
    const retencion = subtotal * 0.04;
    return {
      base,
      casetasPactadas: casetas,
      subtotal,
      iva,
      retencion,
      total: subtotal + iva - retencion,
    };
  }, [tripPadre]);

  const gastoOperativoActual = useMemo(
    () =>
      Number(formData.anticipo_casetas ?? 0) +
      Number(formData.anticipo_combustible ?? 0) +
      Number(formData.anticipo_viaticos ?? 0) +
      Number(formData.otros_anticipos ?? 0),
    [formData],
  );

  const isRoadLeg = formData.leg_type === "ruta_carretera";

  const legUiConfig = useMemo(() => {
    const config = {
      carga_muelle: {
        actionLabel: "Registrar carga en patio",
        successLabel: "Carga operativa",
        helperText: "Confirma el enganche y la carga física del equipo.",
      },
      ruta_carretera: {
        actionLabel: "Iniciar ruta carretera",
        successLabel: "Salida a ruta",
        helperText: "Confirma la salida del tramo carretero.",
      },
      entrega_vacio: {
        actionLabel: "Registrar retorno de vacío",
        successLabel: "Entrega de vacío",
        helperText: "Confirma el desenganche y liberación del equipo vacío.",
      },
    } as const;

    return (
      config[formData.leg_type as keyof typeof config] ?? config.ruta_carretera
    );
  }, [formData.leg_type]);

  const availableTractos = useMemo(() => {
    return (unidades as Unit[]).filter((u) => {
      const tipo = `${u.tipo_1} ${u.tipo}`.toLowerCase();
      const isTracto = tipo.includes("tracto") || tipo.includes("camion");
      const isAvailable = UNIT_STATUSES_AVAILABLE.includes(
        u.status?.toLowerCase() as any,
      );
      const isSelected = Number(u.id) === Number(formData.unit_id);
      return isTracto && (isAvailable || isSelected);
    });
  }, [unidades, formData.unit_id]);

  const availableRemolques = useMemo(() => {
    return (unidades as Unit[]).filter((u) => {
      const searchIn = `${u.tipo_1} ${u.tipo}`.toLowerCase();
      const isTracto =
        searchIn.includes("tracto") || searchIn.includes("camion");
      const isDolly = searchIn.includes("dolly");
      const isAvailable = UNIT_STATUSES_AVAILABLE.includes(
        u.status?.toLowerCase() as any,
      );
      const isSelected =
        Number(u.id) === Number(formData.remolque_1_id) ||
        Number(u.id) === Number(formData.remolque_2_id);
      return !isTracto && !isDolly && (isAvailable || isSelected);
    });
  }, [unidades, formData.remolque_1_id, formData.remolque_2_id]);

  const availableDollies = useMemo(() => {
    const dollies = (unidades as Unit[]).filter((u) => {
      const isDolly = normalizeStr(u.tipo_1).includes("dolly");
      const isAvailable = UNIT_STATUSES_AVAILABLE.includes(
        u.status?.toLowerCase() as any,
      );
      const isSelected = Number(u.id) === Number(formData.dolly_id);
      return isDolly && (isAvailable || isSelected);
    });
    return dollies.length > 0
      ? dollies
      : [
          {
            id: 9997,
            numero_economico: "DOLLY-PRUEBA",
            tipo_1: "DOLLY",
          } as Unit,
        ];
  }, [unidades, formData.dolly_id]);

  const availableOperators = useMemo(() => {
    return (operadores as Operator[]).filter(
      (o) =>
        o.status === "activo" ||
        o.status === "disponible" ||
        // 👇 AQUÍ AGREGAMOS LOS ESTATUS "en_ruta" y "en ruta"
        o.status === "en_ruta" ||
        o.status === "en ruta" ||
        Number(o.id) === Number(formData.operator_id),
    );
  }, [operadores, formData.operator_id]);

  useEffect(() => {
    if (!open || !tripPadre) return;

    const lastLeg =
      tripPadre.legs && tripPadre.legs.length > 0
        ? tripPadre.legs[tripPadre.legs.length - 1]
        : null;

    console.log("=== 🛑 INICIO DEBUGGER: REMOLQUES Y DOLLY ===");
    console.log("1. TripPadre:", tripPadre);
    console.log("2. Último Tramo (lastLeg):", lastLeg);

    console.log("--- VALORES OBTENIDOS DEL JSON ---");
    console.log("lastLeg.remolque_1_id:", (lastLeg as any)?.remolque_1_id);
    console.log("lastLeg.dolly_id:", (lastLeg as any)?.dolly_id);
    console.log("lastLeg.remolque_2_id:", (lastLeg as any)?.remolque_2_id);

    console.log("tripPadre.remolque_1_id:", tripPadre.remolque_1_id);
    console.log("tripPadre.dolly_id:", tripPadre.dolly_id);
    console.log("tripPadre.remolque_2_id:", tripPadre.remolque_2_id);

    console.log(
      "tripPadre.remolque_1 (Objeto):",
      (tripPadre as any).remolque_1,
    );
    console.log("tripPadre.dolly (Objeto):", (tripPadre as any).dolly);
    console.log(
      "tripPadre.remolque_2 (Objeto):",
      (tripPadre as any).remolque_2,
    );

    console.log("--- RESULTADO EN FORMDATA ---");
    console.log("formData.remolque_1_id:", formData.remolque_1_id);
    console.log("formData.dolly_id:", formData.dolly_id);
    console.log("formData.remolque_2_id:", formData.remolque_2_id);

    console.log("--- VERIFICACIÓN DE SELECTS (AVAILABLES) ---");
    console.log("¿Están los IDs en las listas de opciones?");

    const r1Exists = availableRemolques.some(
      (r) => r.id === formData.remolque_1_id,
    );
    const dollyExists = availableDollies.some(
      (d) => d.id === formData.dolly_id,
    );
    const r2Exists = availableRemolques.some(
      (r) => r.id === formData.remolque_2_id,
    );

    console.log(
      `Remolque 1 (ID ${formData.remolque_1_id}) existe en options:`,
      r1Exists,
    );
    console.log(
      `Dolly (ID ${formData.dolly_id}) existe en options:`,
      dollyExists,
    );
    console.log(
      `Remolque 2 (ID ${formData.remolque_2_id}) existe en options:`,
      r2Exists,
    );

    if (!r1Exists && formData.remolque_1_id) {
      console.warn(
        `⚠️ ALERTA: El Remolque 1 (ID ${formData.remolque_1_id}) NO ESTÁ en availableRemolques. Motivo probable: status diferente a 'disponible' o no lo manda el backend general.`,
      );
    }

    console.log("=== 🛑 FIN DEBUGGER ===");
  }, [open, tripPadre, formData, availableRemolques, availableDollies]);

  const validateForm = useCallback((): boolean => {
    if (!formData.unit_id || !formData.operator_id || !formData.remolque_1_id) {
      toast.error("Falta Asignación", {
        description: "Tracto, Operador y Chasis 1 son obligatorios.",
      });
      return false;
    }

    if (isFullTrip && (!formData.dolly_id || !formData.remolque_2_id)) {
      toast.error("Falta Asignación FULL", {
        description: "El Dolly y Remolque 2 son obligatorios.",
      });
      return false;
    }

    if (
      formData.leg_type === "entrega_vacio" &&
      !formData.destino_vacio?.trim()
    ) {
      toast.error("Falta Destino", {
        description: "Debe indicar el Destino/Patio de entrega del vacío.",
      });
      return false;
    }

    if (formData.leg_type === "ruta_carretera") {
      if (
        !tripFiscalData.peso_toneladas ||
        tripFiscalData.peso_toneladas <= 0
      ) {
        toast.error("Carta Porte Incompleta", {
          description: "El peso es obligatorio para iniciar la ruta carretera.",
        });
        setShowFiscalData(true);
        return false;
      }
    }

    return true;
  }, [formData, isFullTrip, tripFiscalData, isFiscalDataComplete]);

  const handleIniciarTramo = useCallback(async () => {
    if (!tripPadre || !validateForm()) return;

    setLoading(true);
    try {
      await axiosClient.put(`/api/logistics/trips/${tripPadre.id}`, {
        ...tripFiscalData,
        numero_contenedor: tripFiscalData.contenedor_1,
        booking: tripFiscalData.referencia,
        remolque_1_id: formData.remolque_1_id,
        dolly_id: formData.dolly_id,
        remolque_2_id: formData.remolque_2_id,
      });

      const success = await onSubmit(
        String(tripPadre.id),
        formData as TripLegCreatePayload,
      );

      if (success) {
        if (formData.leg_type === "carga_muelle") {
          await updateLoadStatus(Number(formData.remolque_1_id), true);
          if (formData.remolque_2_id)
            await updateLoadStatus(Number(formData.remolque_2_id), true);
        } else if (formData.leg_type === "entrega_vacio") {
          await updateLoadStatus(Number(formData.remolque_1_id), false);
          if (formData.remolque_2_id)
            await updateLoadStatus(Number(formData.remolque_2_id), false);

          toast.success(
            `Equipo liberado en ${formData.destino_vacio}. Viaje listo para liquidación.`,
          );
        }

        onOpenChange(false);
        if (onSuccessRefresh) onSuccessRefresh();
      }
    } catch (error) {
      toast.error("Error al iniciar el tramo o guardar los datos.");
    } finally {
      setLoading(false);
    }
  }, [
    tripPadre,
    formData,
    validateForm,
    onSubmit,
    updateLoadStatus,
    onOpenChange,
    tripFiscalData,
    legUiConfig,
    onSuccessRefresh,
  ]);

  const referencia = (tripPadre as (Trip & { referencia?: string }) | null)
    ?.referencia;

  if (!tripPadre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[1000px] p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex justify-between items-center gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                  <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp">
                    TRP- {tripPadre.public_id ?? tripPadre.id}
                  </DialogTitle>
                  <div className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.3em] mt-1">
                    Asignación Logística Operativa
                  </div>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-3 font-bold text-slate-600 dark:text-white/70 uppercase text-xs tracking-widest pt-2">
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  {tripPadre.origin}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 dark:text-white/20" />
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  {tripPadre.destination}
                </span>

                <Badge className="ml-3 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white border-slate-200 dark:border-white/20 tracking-widest">
                  {isFullTrip ? "FULL / 9 EJES" : "SENCILLO / 5 EJES"}
                </Badge>

                {referencia && (
                  <Badge className="ml-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-500/30 tracking-widest flex items-center gap-1.5">
                    <Container className="h-3.5 w-3.5" />
                    CONTENEDOR: {referencia}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto max-h-[75vh] custom-scrollbar bg-muted/50">
          {/* ── Panel izquierdo: Finanzas ── */}
          <div className="md:col-span-4 p-8 space-y-8 border-r border-slate-200 dark:border-white/10 bg-card">
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-slate-500 dark:text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Negocio Pactado
              </h4>

              <Card className="border border-slate-200 dark:border-white/10 bg-card shadow-sm">
                <CardContent className="p-5 space-y-3">
                  {[
                    {
                      label: "Flete Base:",
                      value: finanzas.base,
                      color: "text-slate-900 dark:text-white",
                    },
                    {
                      label: "Casetas Pactadas:",
                      value: finanzas.casetasPactadas,
                      color: "text-blue-600 dark:text-blue-400",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400"
                    >
                      <span>{label}</span>
                      <span className={cn("font-mono", color)}>
                        {formatCurrency(value)}
                      </span>
                    </div>
                  ))}

                  <Separator className="bg-slate-200 dark:bg-white/10" />

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono">
                        {formatCurrency(finanzas.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span>IVA (16%):</span>
                      <span className="font-mono">
                        {formatCurrency(finanzas.iva)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Retención (4%):</span>
                      <span className="font-mono text-rose-500 dark:text-rose-400">
                        -{formatCurrency(finanzas.retencion)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 mt-4">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Total Factura
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                      {formatCurrency(finanzas.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Utilidad Estimada
              </h4>

              <Card className="border border-rose-200 dark:border-rose-800/50 bg-rose-50/20 dark:bg-rose-900/10 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
                    <span>Gasto Operativo:</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(gastoOperativoActual)}
                    </span>
                  </div>
                  <Separator className="bg-rose-200/50 dark:bg-rose-800/30 mb-4" />
                  <div>
                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase block mb-1">
                      Utilidad Neta Estimada
                    </span>
                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tighter">
                      {formatCurrency(finanzas.total - gastoOperativoActual)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Panel derecho: Formulario ── */}
          <div className="md:col-span-8 p-10 space-y-10 bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest ml-1">
                  Fase Operativa
                </Label>
                <Select
                  value={formData.leg_type}
                  onValueChange={(v: ExtendedLegPayload["leg_type"]) =>
                    setFormData((p) => ({ ...p, leg_type: v }))
                  }
                >
                  <SelectTrigger className="h-11 bg-card border-slate-200 dark:border-white/10 font-bold text-slate-800 dark:text-slate-100 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                    <SelectItem
                      value="carga_muelle"
                      className="font-bold dark:text-white"
                    >
                      1. CARGA PATIO / MUELLE
                    </SelectItem>
                    <SelectItem
                      value="ruta_carretera"
                      className="font-bold dark:text-white"
                    >
                      2. RUTA CARRETERA
                    </SelectItem>
                    <SelectItem
                      value="entrega_vacio"
                      className="font-bold dark:text-white"
                    >
                      3. RETORNO DE VACÍO
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest ml-1">
                  Operador
                </Label>
                <Select
                  value={
                    formData.operator_id ? String(formData.operator_id) : ""
                  }
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, operator_id: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-11 bg-card border-slate-200 dark:border-white/10 font-bold text-slate-800 dark:text-slate-100 shadow-sm">
                    <SelectValue placeholder="Asignar Operador..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                    {availableOperators.map((o) => (
                      <SelectItem
                        key={o.id}
                        value={String(o.id)}
                        className="font-bold dark:text-white"
                      >
                        {o.name.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* BLOQUE FISCAL DINÁMICO */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-card shadow-sm overflow-hidden animate-in fade-in transition-all">
              <button
                type="button"
                onClick={() => setShowFiscalData(!showFiscalData)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors haptic-press"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300">
                    Datos Complementarios Carta Porte 4.0
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {!isFiscalDataComplete && (
                    <div className="flex items-center gap-1.5 text-rose-500 animate-pulse bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-500/30">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">
                        Falta Info
                      </span>
                    </div>
                  )}
                  {isFiscalDataComplete && (
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">
                        Completo
                      </span>
                    </div>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform duration-300",
                      showFiscalData && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {showFiscalData && (
                <div className="p-6 sm:p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 space-y-6 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Container className="h-3 w-3 text-brand-navy dark:text-blue-400" />{" "}
                        Contenedor 1
                      </Label>
                      <Input
                        placeholder="Ej. TAMU1234567"
                        className="h-11 font-mono uppercase bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                        value={tripFiscalData.contenedor_1}
                        onChange={(e) =>
                          setTripFiscalData((p) => ({
                            ...p,
                            contenedor_1: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>

                    {isFullTrip && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Container className="h-3 w-3 text-brand-navy dark:text-blue-400" />{" "}
                          Contenedor 2
                        </Label>
                        <Input
                          placeholder="Ej. MSCU7654321"
                          className="h-11 font-mono uppercase bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          value={tripFiscalData.contenedor_2}
                          onChange={(e) =>
                            setTripFiscalData((p) => ({
                              ...p,
                              contenedor_2: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-brand-navy dark:text-blue-400" />{" "}
                        Referencia / Booking
                      </Label>
                      <Input
                        placeholder="Ej. KH5697143"
                        className="h-11 font-mono uppercase bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                        value={tripFiscalData.referencia}
                        onChange={(e) =>
                          setTripFiscalData((p) => ({
                            ...p,
                            referencia: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                          !tripFiscalData.peso_toneladas
                            ? "text-rose-500"
                            : "text-slate-600 dark:text-slate-400",
                        )}
                      >
                        <Scale className="h-3 w-3" /> Peso (Toneladas) *
                      </Label>
                      <Input
                        type="number"
                        placeholder="Ej. 25.5"
                        className={cn(
                          "h-11 font-mono bg-card",
                          !tripFiscalData.peso_toneladas
                            ? "border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/20 bg-rose-50/50"
                            : "border-slate-200 dark:border-white/10",
                        )}
                        value={tripFiscalData.peso_toneladas || ""}
                        onChange={(e) =>
                          setTripFiscalData((p) => ({
                            ...p,
                            peso_toneladas: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        !tripFiscalData.descripcion_mercancia
                          ? "text-rose-500"
                          : "text-slate-600 dark:text-slate-400",
                      )}
                    >
                      Descripción de Mercancía (CATÁLOGO SAT) *
                    </Label>
                    <SearchableSelect
                      items={availableSatProducts}
                      value={tripFiscalData.sat_clave_producto}
                      placeholder="Buscar producto SAT..."
                      onSelect={(val) => {
                        const prod = availableSatProducts.find(
                          (p) => p.value === val,
                        );
                        if (prod) {
                          setTripFiscalData((p) => ({
                            ...p,
                            sat_clave_producto: prod.clave,
                            descripcion_mercancia: prod.descripcion,
                            es_material_peligroso:
                              prod.es_material_peligroso === "1",
                            clase_imo:
                              prod.es_material_peligroso === "1"
                                ? p.clase_imo
                                : "",
                          }));
                        }
                      }}
                    />
                    <div className="text-[10px] text-slate-500 font-medium ml-1">
                      Al seleccionar un producto, la clave SAT y descripción se
                      autocompletan.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          !tripFiscalData.sat_clave_producto
                            ? "text-rose-500"
                            : "text-slate-600 dark:text-slate-400",
                        )}
                      >
                        Clave Producto SAT *
                      </Label>
                      <Input
                        placeholder="Ej. 01010101"
                        className="h-11 font-mono bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                        value={tripFiscalData.sat_clave_producto}
                        onChange={(e) =>
                          setTripFiscalData((p) => ({
                            ...p,
                            sat_clave_producto: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          !tripFiscalData.sat_clave_unidad
                            ? "text-rose-500"
                            : "text-slate-600 dark:text-slate-400",
                        )}
                      >
                        Clave Unidad SAT *
                      </Label>
                      <Input
                        placeholder="Ej. E48"
                        className="h-11 font-mono uppercase bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                        value={tripFiscalData.sat_clave_unidad}
                        onChange={(e) =>
                          setTripFiscalData((p) => ({
                            ...p,
                            sat_clave_unidad: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FASE 3: Campo dinámico de Destino de Vacío */}
            {formData.leg_type === "entrega_vacio" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest ml-1 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Destino / Ubicación de entrega del vacío *
                </Label>
                <Input
                  placeholder="Ej. Patio CCS, San Julián, Terminal ICAVE..."
                  value={formData.destino_vacio}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      destino_vacio: e.target.value,
                    }))
                  }
                  className="h-11 border-slate-200 dark:border-white/10 bg-card shadow-sm font-medium text-slate-800 dark:text-slate-100"
                />
                <p className="text-[10px] text-slate-500 font-medium ml-1">
                  Debe indicar dónde se desenganchó físicamente el equipo.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest ml-1">
                Unidad (Tractocamión)
              </Label>
              <Select
                value={formData.unit_id ? String(formData.unit_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, unit_id: Number(v) }))
                }
              >
                <SelectTrigger className="h-12 bg-card border-slate-300 dark:border-white/20 text-slate-800 dark:text-slate-100 font-black shadow-md">
                  <SelectValue placeholder="Seleccionar unidad de tracción..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                  {availableTractos.map((u) => (
                    <SelectItem
                      key={u.id}
                      value={String(u.id)}
                      className="font-bold dark:text-white"
                    >
                      ECO-{u.numero_economico} [{u.placas}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-8 rounded-2xl border shadow-xl space-y-8 bg-card border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <h5 className="text-[11px] font-black text-slate-700 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <Box className="h-4 w-4 text-brand-red" />
                  Configuración de Arrastre
                </h5>
                {isFullTrip && (
                  <Badge className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-black text-[9px] border-none px-3">
                    DOBLE ARTICULADO (FULL)
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-2.5">
                  <Label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Chasis 1
                  </Label>
                  <Select
                    value={
                      formData.remolque_1_id
                        ? String(formData.remolque_1_id)
                        : ""
                    }
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, remolque_1_id: Number(v) }))
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "h-10 font-bold border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 bg-card",
                      )}
                    >
                      <SelectValue placeholder="R1" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                      {availableRemolques.map((u) => (
                        <SelectItem
                          key={u.id}
                          value={String(u.id)}
                          className="font-bold dark:text-white"
                        >
                          {u.numero_economico}{" "}
                          {u.is_loaded ? (
                            <Package className="inline h-3.5 w-3.5 text-amber-500 ml-1" />
                          ) : (
                            <Minus className="inline h-3.5 w-3.5 text-slate-400 ml-1" />
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isFullTrip && (
                  <>
                    <div className="space-y-2.5">
                      <Label className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase ml-1">
                        Dolly
                      </Label>
                      <Select
                        value={
                          formData.dolly_id ? String(formData.dolly_id) : ""
                        }
                        onValueChange={(v) =>
                          setFormData((p) => ({ ...p, dolly_id: Number(v) }))
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-10 font-bold border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 bg-card",
                          )}
                        >
                          <SelectValue placeholder="Dolly" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                          {availableDollies.map((u) => (
                            <SelectItem
                              key={u.id}
                              value={String(u.id)}
                              className="font-bold dark:text-white"
                            >
                              {u.numero_economico}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase ml-1">
                        Chasis 2
                      </Label>
                      <Select
                        value={
                          formData.remolque_2_id
                            ? String(formData.remolque_2_id)
                            : ""
                        }
                        onValueChange={(v) =>
                          setFormData((p) => ({
                            ...p,
                            remolque_2_id: Number(v),
                          }))
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-10 font-bold border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 bg-card",
                          )}
                        >
                          <SelectValue placeholder="R2" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                          {availableRemolques.map((u) => (
                            <SelectItem
                              key={u.id}
                              value={String(u.id)}
                              className="font-bold dark:text-white"
                            >
                              {u.numero_economico}{" "}
                              {u.is_loaded ? (
                                <Package className="inline h-3.5 w-3.5 text-amber-500 ml-1" />
                              ) : (
                                <Minus className="inline h-3.5 w-3.5 text-slate-400 ml-1" />
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isRoadLeg && (
              <div
                className={cn(
                  "p-8 rounded-3xl space-y-6 shadow-inner relative overflow-hidden",
                  "bg-amber-500/5 dark:bg-amber-500/10",
                  "border border-amber-500/10 dark:border-amber-500/20",
                )}
              >
                <div className="absolute top-0 left-0 w-1 bg-amber-400 dark:bg-amber-500 h-full rounded-l-3xl" />
                <h4 className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Registro de Anticipos y
                  Vales
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {(
                    [
                      {
                        key: "anticipo_casetas",
                        label: "Casetas",
                        accent: "amber",
                      },
                      {
                        key: "anticipo_combustible",
                        label: "Diesel",
                        accent: "amber",
                      },
                      {
                        key: "anticipo_viaticos",
                        label: "Viáticos",
                        accent: "amber",
                      },
                      {
                        key: "otros_anticipos",
                        label: "Vale / Otros",
                        accent: "blue",
                      },
                    ] as const
                  ).map(({ key, label, accent }) => (
                    <div key={key} className="space-y-2.5">
                      <Label
                        className={cn(
                          "text-[9px] font-bold uppercase ml-1 flex items-center gap-1",
                          accent === "blue"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-400",
                        )}
                      >
                        {key === "otros_anticipos" && (
                          <Ticket className="h-3 w-3" />
                        )}
                        {label}
                      </Label>
                      <div className="relative">
                        <DollarSign
                          className={cn(
                            "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5",
                            accent === "blue"
                              ? "text-blue-400"
                              : "text-slate-400 dark:text-slate-500",
                          )}
                        />
                        <Input
                          type="number"
                          className={cn(
                            "pl-9 h-11 font-mono text-sm",
                            "bg-card",
                            "text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500",
                            accent === "blue"
                              ? "border-blue-200 dark:border-blue-700/50 bg-blue-50/50 dark:bg-blue-900/20"
                              : "border-amber-200/50 dark:border-amber-700/30",
                          )}
                          value={formData[key] || ""}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              [key]: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-2 hidden sm:flex">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {legUiConfig.helperText}
            </span>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground hover:text-foreground hover:bg-transparent haptic-press w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleIniciarTramo}
              disabled={loading}
              className={cn(
                "px-8 sm:px-12 h-12 font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl haptic-press w-full sm:w-auto",
                "bg-brand-red hover:bg-brand-red/90 text-white",
                "shadow-brand-red/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              {legUiConfig.actionLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
