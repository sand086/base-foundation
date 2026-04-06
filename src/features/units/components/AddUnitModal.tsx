import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Label genérico
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Truck,
  Loader2,
  Info,
  Settings,
  ShieldAlert,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Unit } from "@/features/units/types";
import { cn } from "@/lib/utils";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker"; //  Importado para reemplazar input date nativo

// =====================
// Configuración
// =====================
const MARCAS_SUGERIDAS = [
  "Freightliner",
  "Kenworth",
  "International",
  "Volvo",
  "Mercedes-Benz",
  "Scania",
  "Mack",
  "Peterbilt",
  "Utility",
  "Great Dane",
  "Fruehauf",
  "Hendrickson",
];

const NATURALEZA_OPTIONS = [
  { value: "TRACTOCAMION", label: "🚛 Tractocamión" },
  { value: "REMOLQUE", label: "📦 Remolque / Caja" },
  { value: "DOLLY", label: "🔗 Dolly" },
] as const;

/**
 * Mapeo automático:
 * TRACTOCAMION -> T3
 * REMOLQUE     -> R2
 * DOLLY        -> D2
 */
const AUTOMATIC_LAYOUT_MAPPING: Record<string, string> = {
  TRACTOCAMION: "T3",
  REMOLQUE: "R2",
  DOLLY: "D2",
};

const LAYOUT_LABELS: Record<string, string> = {
  T3: "T3 (10 llantas)",
  R2: "R2 (8 llantas)",
  D2: "D2 (8 llantas)",
};

// =====================
// Esquema Zod
// =====================
const unidadSchema = z
  .object({
    categoriaFisica: z.string().min(1, "Seleccione un tipo de activo"),
    numero_economico: z.string().min(1, "El número económico es requerido"),
    placas: z.string().optional(),
    vin: z.string().optional(),
    marca: z.string().min(1, "La marca es requerida"),
    modelo: z.string().min(1, "El modelo es requerido"),
    year: z.string().min(4, "Requerido"),

    tipo: z.string(),
    tipo_1: z.string(),

    numero_serie_motor: z.string().optional(),
    marca_motor: z.string().optional(),
    capacidad_carga: z.string().optional(),
    tipo_carga: z.string().optional(),

    tarjeta_circulacion_url: z.string().optional(),
    tarjeta_circulacion_folio: z.string().optional(),
    permiso_sct_folio: z.string().optional(),
    caat_folio: z.string().optional(),

    // Cambiadas a z.date().optional() para usar con DatePicker
    caat_vence: z.date().optional(),
    seguro_vence: z.date().optional(),
    verificacion_humo_vence: z.date().optional(),
    verificacion_fisico_mecanica_vence: z.date().optional(),
    permiso_sct_vence: z.date().optional(),

    status: z.string().default("disponible"),
  })
  .superRefine((data, ctx) => {
    if (
      data.categoriaFisica === "TRACTOCAMION" &&
      (!data.placas || data.placas.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las placas son requeridas para tractocamiones",
        path: ["placas"],
      });
    }
  });

type UnidadFormData = z.infer<typeof unidadSchema>;

interface AddUnidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadToEdit?: Unit | null;
  onSave?: (unidad: any) => void;
  isSaving?: boolean;
}

// =====================
// Helpers
// =====================
const getStatusBadge = (dateValue?: Date | null) => {
  if (!dateValue) {
    return (
      <Badge
        variant="outline"
        className="text-slate-400 dark:text-slate-500 font-black text-[9px] tracking-widest shadow-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      >
        PENDIENTE
      </Badge>
    );
  }

  const today = new Date();
  const exp = new Date(dateValue);

  const days = Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) {
    return (
      <Badge className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30 font-black text-[9px] tracking-widest shadow-sm">
        VENCIDO
      </Badge>
    );
  }

  if (days <= 30) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30 font-black text-[9px] tracking-widest shadow-sm">
        POR VENCER ({days}d)
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30 font-black text-[9px] tracking-widest shadow-sm">
      VIGENTE
    </Badge>
  );
};

const normalizeText = (value: unknown): string => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const normalizeTipoLayout = (value: unknown): string => {
  return normalizeText(value);
};

const normalizeCategoriaFisica = (tipo1?: string | null): string => {
  const normalized = normalizeText(tipo1);

  if (normalized === "TRACTOCAMION") return "TRACTOCAMION";
  if (normalized === "REMOLQUE") return "REMOLQUE";
  if (normalized === "DOLLY") return "DOLLY";

  return "TRACTOCAMION";
};

const getAutoLayoutByCategoria = (categoriaFisica: string): string => {
  return AUTOMATIC_LAYOUT_MAPPING[normalizeText(categoriaFisica)] || "T3";
};

const getLayoutDescription = (categoriaFisica: string): string => {
  const layout = getAutoLayoutByCategoria(categoriaFisica);
  return LAYOUT_LABELS[layout] || layout;
};

const getAxleConfig = (categoriaFisica: string) => {
  const cat = normalizeText(categoriaFisica);
  if (cat === "TRACTOCAMION") return "TRACTO_10";
  if (cat === "REMOLQUE") return "REMOLQUE_8";
  if (cat === "DOLLY") return "DOLLY_8";
  return "TRACTO_10";
};

const parseDateSafe = (dateStr?: string | null) => {
  if (!dateStr) return undefined;
  const d = new Date(`${dateStr}T12:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
};

// =====================
// Component
// =====================
export function AddUnidadModal({
  open,
  onOpenChange,
  unidadToEdit,
  onSave,
  isSaving = false,
}: AddUnidadModalProps) {
  const { toast } = useToast();

  const [masterPassword, setMasterPassword] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const isEditMode = !!unidadToEdit;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) =>
    (currentYear - i + 1).toString(),
  );

  //  REACT HOOK FORM
  const form = useForm<UnidadFormData>({
    resolver: zodResolver(unidadSchema),
    defaultValues: {
      categoriaFisica: "TRACTOCAMION",
      numero_economico: "",
      placas: "",
      vin: "",
      marca: "",
      modelo: "",
      year: currentYear.toString(),
      tipo: "T3",
      tipo_1: "TRACTOCAMION",
      numero_serie_motor: "",
      marca_motor: "",
      capacidad_carga: "",
      tipo_carga: "General",
      tarjeta_circulacion_url: "",
      tarjeta_circulacion_folio: "",
      permiso_sct_folio: "",
      caat_folio: "",
      caat_vence: undefined,
      seguro_vence: undefined,
      verificacion_humo_vence: undefined,
      verificacion_fisico_mecanica_vence: undefined,
      permiso_sct_vence: undefined,
      status: "disponible",
    },
  });

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = form;
  const currentCategoriaFisica = watch("categoriaFisica");
  const currentStatus = watch("status");

  // =====================
  // Load edit data
  // =====================
  useEffect(() => {
    if (open && unidadToEdit) {
      const categoriaFisica = normalizeCategoriaFisica(unidadToEdit.tipo_1);
      const autoLayout = getAutoLayoutByCategoria(categoriaFisica);

      setShowOverride(false);
      setMasterPassword("");

      reset({
        categoriaFisica,
        numero_economico: unidadToEdit.numero_economico || "",
        placas: unidadToEdit.placas || "",
        vin: unidadToEdit.vin || "",
        marca: unidadToEdit.marca || "",
        modelo: unidadToEdit.modelo || "",
        year: unidadToEdit.year?.toString() || currentYear.toString(),
        tipo: autoLayout,
        tipo_1: categoriaFisica,
        numero_serie_motor: unidadToEdit.numero_serie_motor || "",
        marca_motor: unidadToEdit.marca_motor || "",
        capacidad_carga: unidadToEdit.capacidad_carga?.toString() || "",
        tipo_carga: unidadToEdit.tipo_carga || "General",
        tarjeta_circulacion_url: unidadToEdit.tarjeta_circulacion_url || "",
        tarjeta_circulacion_folio: unidadToEdit.tarjeta_circulacion_folio || "",
        permiso_sct_folio: unidadToEdit.permiso_sct_folio || "",
        caat_folio: unidadToEdit.caat_folio || "",
        caat_vence: parseDateSafe(unidadToEdit.caat_vence),
        seguro_vence: parseDateSafe(unidadToEdit.seguro_vence),
        verificacion_humo_vence: parseDateSafe(
          unidadToEdit.verificacion_humo_vence,
        ),
        verificacion_fisico_mecanica_vence: parseDateSafe(
          unidadToEdit.verificacion_fisico_mecanica_vence,
        ),
        permiso_sct_vence: parseDateSafe(unidadToEdit.permiso_sct_vence),
        status: unidadToEdit.status || "disponible",
      });
      return;
    }

    if (!open) {
      reset({
        categoriaFisica: "TRACTOCAMION",
        numero_economico: "",
        placas: "",
        vin: "",
        marca: "",
        modelo: "",
        year: currentYear.toString(),
        tipo: "T3",
        tipo_1: "TRACTOCAMION",
        numero_serie_motor: "",
        marca_motor: "",
        capacidad_carga: "",
        tipo_carga: "General",
        tarjeta_circulacion_url: "",
        tarjeta_circulacion_folio: "",
        permiso_sct_folio: "",
        caat_folio: "",
        caat_vence: undefined,
        seguro_vence: undefined,
        verificacion_humo_vence: undefined,
        verificacion_fisico_mecanica_vence: undefined,
        permiso_sct_vence: undefined,
        status: "disponible",
      });
      setShowOverride(false);
      setMasterPassword("");
    }
  }, [unidadToEdit, open, reset, currentYear]);

  // Sincronizar tipo y tipo_1 cuando cambia categoriaFisica
  useEffect(() => {
    const categoriaNormalizada = normalizeCategoriaFisica(
      currentCategoriaFisica,
    );
    const layoutAutomatico = getAutoLayoutByCategoria(categoriaNormalizada);

    setValue("tipo_1", categoriaNormalizada);
    setValue("tipo", layoutAutomatico);
  }, [currentCategoriaFisica, setValue]);

  // =====================
  // Submit
  // =====================
  const onSubmit = (data: UnidadFormData) => {
    const formatDateForApi = (date?: Date | null) =>
      date ? format(date, "yyyy-MM-dd") : null;
    const cleanString = (str?: string) =>
      str && str.trim() !== "" ? str.trim() : null;
    const cleanNumber = (numStr?: string) =>
      numStr && !Number.isNaN(parseFloat(numStr)) ? parseFloat(numStr) : null;

    let ignoreBlocking = false;

    if (showOverride) {
      if (masterPassword === "ADMIN123") {
        ignoreBlocking = true;
      } else {
        toast({
          title: "Contraseña incorrecta",
          description: "No se pudo aplicar la habilitación forzada.",
          variant: "destructive",
        });
        return;
      }
    }

    const categoriaFisica = normalizeCategoriaFisica(data.categoriaFisica);
    const layoutCalculado = normalizeTipoLayout(
      getAutoLayoutByCategoria(categoriaFisica),
    );

    const payload: Partial<Unit> & { ignore_blocking?: boolean } = {
      ...(isEditMode && unidadToEdit ? { id: unidadToEdit.id } : {}),

      numero_economico: data.numero_economico
        .replace(/^ECO[-\s]?/i, "")
        .trim()
        .toUpperCase(),
      placas: data.placas?.trim().toUpperCase() || "S/P",
      vin: cleanString(data.vin?.toUpperCase()),
      marca: data.marca.trim(),
      modelo: cleanString(data.modelo),
      year: parseInt(data.year, 10) || currentYear,

      tipo: layoutCalculado as any,
      tipo_1: categoriaFisica as any,
      configuracion_ejes: getAxleConfig(categoriaFisica) as any,

      numero_serie_motor: cleanString(data.numero_serie_motor),
      marca_motor: cleanString(data.marca_motor),
      capacidad_carga: cleanNumber(data.capacidad_carga),
      tipo_carga: cleanString(data.tipo_carga),

      tarjeta_circulacion_url: cleanString(data.tarjeta_circulacion_url),
      tarjeta_circulacion_folio: cleanString(data.tarjeta_circulacion_folio),
      permiso_sct_folio: cleanString(data.permiso_sct_folio),
      caat_folio: cleanString(data.caat_folio),
      seguro_vence: formatDateForApi(data.seguro_vence),
      verificacion_humo_vence: formatDateForApi(data.verificacion_humo_vence),
      verificacion_fisico_mecanica_vence: formatDateForApi(
        data.verificacion_fisico_mecanica_vence,
      ),
      permiso_sct_vence: formatDateForApi(data.permiso_sct_vence),
      caat_vence: formatDateForApi(data.caat_vence),
      status: (data.status || "disponible") as any,
      ignore_blocking: ignoreBlocking,
    };

    onSave?.(payload);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setShowOverride(false);
    setMasterPassword("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) handleClose();
      }}
    >
      {/*  CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
        {/*  CAPA 2: HEADER TAHOE (Blanco en Light, Navy en Dark) */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border border-emerald-200 dark:border-emerald-500/20",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30",
              )}
            >
              <Truck
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none">
                {isEditMode
                  ? `Editar ECO-${form.getValues("numero_economico")}`
                  : "Registrar Nuevo Activo"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                Gestión del activo físico y expediente documental.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/*  CAPA 3: BODY FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            {/* TABS CONTAINER */}
            <Tabs
              defaultValue="general"
              className="flex-1 flex flex-col min-h-0 w-full"
            >
              {/* TABS LIST (Fija) */}
              <div className="shrink-0 w-full overflow-x-auto hide-scrollbar pt-6 px-6 sm:pt-8 sm:px-8 pb-2 sm:pb-0 z-20">
                <TabsList className="bg-slate-200/50 dark:bg-slate-800/80 backdrop-blur-md p-1 h-12 rounded-xl border border-slate-300/50 dark:border-white/5 grid min-w-max sm:w-full grid-cols-3">
                  {" "}
                  <TabsTrigger
                    value="general"
                    type="button"
                    className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
                  >
                    General
                  </TabsTrigger>
                  <TabsTrigger
                    value="tecnica"
                    type="button"
                    className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
                  >
                    Ficha Técnica
                  </TabsTrigger>
                  <TabsTrigger
                    value="documentacion"
                    type="button"
                    className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
                  >
                    Documentos
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* SCROLL AREA */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
                {/* TAB GENERAL */}
                <TabsContent
                  value="general"
                  className="space-y-8 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  {/* NATURALEZA + LAYOUT AUTOMÁTICO */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <Label className="font-black text-blue-900 dark:text-blue-400 uppercase tracking-tight text-sm">
                        Clasificación Física del Activo
                      </Label>
                      <Badge
                        variant="outline"
                        className="bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-400 text-[10px] uppercase font-black tracking-widest shadow-sm w-fit"
                      >
                        Layout: {getLayoutDescription(currentCategoriaFisica)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="categoriaFisica"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel variant="brand" required>
                              Tipo de Activo (Físico)
                            </FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 glass-card font-black uppercase text-xs shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-brand-navy dark:text-slate-100">
                                  <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                                {NATURALEZA_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className="font-bold text-xs uppercase"
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Configuración de Ejes
                        </Label>
                        <div className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 px-4 flex items-center shadow-inner">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                            {getLayoutDescription(currentCategoriaFisica)}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Asignación automática del sistema.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DATOS DE IDENTIFICACIÓN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="numero_economico"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            No. Económico
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: TR-001"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="placas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            variant="brand"
                            required={currentCategoriaFisica === "TRACTOCAMION"}
                          >
                            Placas
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: 123-ABC"
                              className="h-11 font-mono uppercase font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Marca
                          </FormLabel>
                          <FormControl>
                            <>
                              <Input
                                {...field}
                                list="marcas-list"
                                placeholder="Seleccione o escriba..."
                                className="h-11 font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              />
                              <datalist id="marcas-list">
                                {MARCAS_SUGERIDAS.map((marca) => (
                                  <option key={marca} value={marca} />
                                ))}
                              </datalist>
                            </>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="modelo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Modelo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: Cascadia"
                              className="h-11 font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel variant="brand" required>
                            Año
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm w-full sm:w-1/2">
                                <SelectValue placeholder="Seleccione año" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl max-h-[40vh] border-slate-200 dark:border-white/10">
                              {yearOptions.map((y) => (
                                <SelectItem
                                  key={y}
                                  value={y}
                                  className="font-mono"
                                >
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* CONTROL DE ESTATUS */}
                  <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-5">
                    <h3 className="font-black text-sm flex items-center gap-2 text-brand-navy dark:text-slate-200 uppercase tracking-tight">
                      <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      Control Operativo
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel variant="brand">
                              Estatus Actual
                            </FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 glass-card font-black uppercase text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                                <SelectItem
                                  value="disponible"
                                  className="font-bold text-xs uppercase text-emerald-600 dark:text-emerald-400"
                                >
                                  🟢 Disponible
                                </SelectItem>
                                <SelectItem
                                  value="mantenimiento"
                                  className="font-bold text-xs uppercase text-amber-600 dark:text-amber-400"
                                >
                                  🟡 Maintenance
                                </SelectItem>
                                <SelectItem
                                  value="bloqueado"
                                  disabled
                                  className="font-bold text-xs uppercase text-rose-600 dark:text-rose-400"
                                >
                                  🔴 Bloqueado (Auto)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant={showOverride ? "destructive" : "outline"}
                          size="lg"
                          className="w-full text-[10px] font-black uppercase tracking-widest shadow-sm"
                          onClick={() => setShowOverride((prev) => !prev)}
                        >
                          {showOverride
                            ? "Cancelar Desbloqueo"
                            : "Forzar Habilitación"}
                        </Button>
                      </div>
                    </div>

                    {showOverride && (
                      <div className="animate-in fade-in slide-in-from-top-2 p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-300">
                        <div className="flex items-start gap-3">
                          <Lock className="h-5 w-5 mt-0.5 text-rose-600 dark:text-rose-500 shrink-0" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
                                ZONA DE PELIGRO
                              </p>
                              <p className="text-[11px] font-medium leading-relaxed mt-1 dark:text-rose-300/80">
                                Estás habilitando una unidad que el sistema
                                podría considerar incompleta o insegura. La
                                operación quedará bajo excepción.
                              </p>
                            </div>
                            <div className="space-y-1.5 max-w-xs">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">
                                Contraseña Maestra
                              </Label>
                              <Input
                                type="password"
                                value={masterPassword}
                                onChange={(e) =>
                                  setMasterPassword(e.target.value)
                                }
                                placeholder="••••••••"
                                className="bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50 h-10 font-bold shadow-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB TÉCNICA */}
                <TabsContent
                  value="tecnica"
                  className="space-y-6 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel variant="brand">
                            VIN / Número de Serie
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="17 caracteres alfanuméricos"
                              className="h-11 font-mono uppercase font-bold tracking-widest bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {currentCategoriaFisica === "TRACTOCAMION" && (
                      <>
                        <FormField
                          control={form.control}
                          name="numero_serie_motor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel variant="brand">
                                Número de Motor
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-11 font-mono uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="marca_motor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel variant="brand">
                                Marca de Motor
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-11 font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="capacidad_carga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            Capacidad de Carga (Ton)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              {...field}
                              placeholder="0.0"
                              className="h-11 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipo_carga"
                      render={({ field }) => (
                        <FormItem className="border-l-4 border-amber-500 pl-4 bg-amber-50 dark:bg-amber-950/20 py-3 pr-4 rounded-r-xl shadow-sm">
                          <FormLabel className="flex items-center gap-2 text-amber-800 dark:text-amber-500 font-black uppercase text-[10px] tracking-widest mb-2">
                            <ShieldAlert className="h-4 w-4" /> Tipo de Carga
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm">
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                              <SelectItem
                                value="General"
                                className="font-bold text-xs uppercase"
                              >
                                Carga General
                              </SelectItem>
                              <SelectItem
                                value="Peligrosa"
                                className="font-bold text-xs uppercase text-amber-700 dark:text-amber-500"
                              >
                                ⚠️ Material Peligroso (IMO)
                              </SelectItem>
                              <SelectItem
                                value="Refrigerada"
                                className="font-bold text-xs uppercase text-blue-600 dark:text-blue-400"
                              >
                                ❄️ Refrigerada
                              </SelectItem>
                              <SelectItem
                                value="Granel"
                                className="font-bold text-xs uppercase text-orange-600 dark:text-orange-400"
                              >
                                🌾 Granel
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {field.value === "Peligrosa" && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-500 font-bold uppercase tracking-widest mt-2 leading-tight">
                              Requiere equipamiento y permisos IMO.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB DOCUMENTACIÓN */}
                <TabsContent
                  value="documentacion"
                  className="space-y-6 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50 shadow-sm">
                    <Info className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed dark:text-blue-200/80">
                      Aquí se registran folios y fechas de vencimiento
                      operativas. La carga física de archivos PDF se realiza
                      desde el <b>Expediente Detallado</b> de la unidad una vez
                      registrada.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {
                        label: "Póliza de Seguro",
                        key: "seguro_vence" as const,
                      },
                      {
                        label: "Verif. Emisiones (Humo)",
                        key: "verificacion_humo_vence" as const,
                      },
                      {
                        label: "Verif. Físico-Mecánica",
                        key: "verificacion_fisico_mecanica_vence" as const,
                      },
                    ].map((field) => (
                      <FormField
                        key={field.key}
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => (
                          <FormItem className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/20">
                            <div className="flex-1 space-y-2 w-full">
                              <FormLabel variant="brand">
                                {field.label}
                              </FormLabel>
                              <FormControl>
                                <DatePicker
                                  date={formField.value}
                                  onDateChange={formField.onChange}
                                  modalTitle={field.label}
                                />
                              </FormControl>
                            </div>
                            <div className="w-full sm:w-[140px] flex justify-start sm:justify-center pb-1 shrink-0">
                              {getStatusBadge(form.watch(field.key))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}

                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-5 border border-blue-200 dark:border-blue-900/50 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
                      <div className="flex-1 space-y-3 w-full">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800 dark:text-blue-400">
                          Registro CAAT (Folio y Vigencia)
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <FormField
                            control={form.control}
                            name="caat_folio"
                            render={({ field }) => (
                              <FormItem className="flex-[2] space-y-1.5">
                                <FormControl>
                                  <Input
                                    placeholder="Folio CAAT"
                                    {...field}
                                    className="h-11 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/50 font-mono font-bold uppercase shadow-sm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="caat_vence"
                            render={({ field }) => (
                              <FormItem className="flex-1 space-y-1.5">
                                <FormControl>
                                  <DatePicker
                                    date={field.value}
                                    onDateChange={field.onChange}
                                    modalTitle="Vigencia CAAT"
                                    className="h-11 border-blue-200 dark:border-blue-800/50"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-[140px] flex justify-start sm:justify-center pb-1 shrink-0">
                        {getStatusBadge(form.watch("caat_vence"))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                      <FormField
                        control={form.control}
                        name="permiso_sct_folio"
                        render={({ field }) => (
                          <FormItem className="flex-1 space-y-2 w-full">
                            <FormLabel variant="brand">
                              Folio Permiso de Carga SCT
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ingrese Folio SCT"
                                {...field}
                                className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 font-mono font-bold uppercase shadow-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="w-full sm:w-[140px] flex justify-start sm:justify-center pb-1 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        >
                          PERMANENTE
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                      <FormField
                        control={form.control}
                        name="tarjeta_circulacion_folio"
                        render={({ field }) => (
                          <FormItem className="flex-1 space-y-2 w-full">
                            <FormLabel variant="brand">
                              Folio Tarjeta de Circulación
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ingrese Folio"
                                {...field}
                                className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 font-mono font-bold uppercase shadow-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="w-full sm:w-[140px] flex justify-start sm:justify-center pb-1 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        >
                          INFO
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/*  CAPA 4: FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={isSaving}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white",
                    isEditMode
                      ? "bg-brand-green hover:bg-brand-green/80 shadow-amber-500/20"
                      : "bg-brand-red hover:bg-brand-red/80 shadow-brand-red/20",
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {isEditMode ? "Actualizar Activo" : "Guardar Activo"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
