import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Unit } from "@/types/api.types";

// =====================
// Types
// =====================
interface UnidadFormData {
  /**
   * UI-only:
   * Naturaleza física del activo
   * TRACTOCAMION | REMOLQUE | DOLLY
   */
  categoriaFisica: string;

  // Core
  numero_economico: string;
  placas: string;
  vin: string;
  marca: string;
  modelo: string;
  year: string;

  /**
   * Lógica nueva:
   * tipo   = layout físico para SVG/UI
   * tipo_1 = naturaleza física backend
   */
  tipo: string;
  tipo_1: string;

  // Tech
  numero_serie_motor: string;
  marca_motor: string;
  capacidad_carga: string;
  tipo_carga: string;

  // Docs
  tarjeta_circulacion_url: string;
  tarjeta_circulacion_folio: string;
  permiso_sct_folio: string;
  caat_folio: string;
  caat_vence: string;

  // Dates
  seguro_vence: string;
  verificacion_humo_vence: string;
  verificacion_fisico_mecanica_vence: string;
  permiso_sct_vence: string;

  status: string;
}

interface AddUnidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadToEdit?: Unit | null;
  onSave?: (unidad: any) => void;
  isSaving?: boolean;
}

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

const emptyFormData: UnidadFormData = {
  categoriaFisica: "TRACTOCAMION",

  numero_economico: "",
  placas: "",
  vin: "",
  marca: "",
  modelo: "",
  year: new Date().getFullYear().toString(),

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
  caat_vence: "",

  seguro_vence: "",
  verificacion_humo_vence: "",
  verificacion_fisico_mecanica_vence: "",
  permiso_sct_vence: "",

  status: "disponible",
};

// =====================
// Helpers
// =====================
const getStatusBadge = (dateStr: string) => {
  if (!dateStr) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        PENDIENTE
      </Badge>
    );
  }

  const today = new Date();
  const exp = new Date(dateStr);
  exp.setMinutes(exp.getMinutes() + exp.getTimezoneOffset());

  const days = Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        VENCIDO
      </Badge>
    );
  }

  if (days <= 30) {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        POR VENCER ({days}d)
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
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

  const [formData, setFormData] = useState<UnidadFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [masterPassword, setMasterPassword] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const isEditMode = !!unidadToEdit;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) =>
    (currentYear - i + 1).toString(),
  );

  const calculatedLayout = useMemo(() => {
    return getAutoLayoutByCategoria(formData.categoriaFisica);
  }, [formData.categoriaFisica]);

  // =====================
  // Load edit data
  // =====================
  useEffect(() => {
    if (open && unidadToEdit) {
      const categoriaFisica = normalizeCategoriaFisica(unidadToEdit.tipo_1);
      const autoLayout = getAutoLayoutByCategoria(categoriaFisica);

      setShowOverride(false);
      setMasterPassword("");
      setErrors({});

      setFormData({
        categoriaFisica,

        numero_economico: unidadToEdit.numero_economico || "",
        placas: unidadToEdit.placas || "",
        vin: unidadToEdit.vin || "",
        marca: unidadToEdit.marca || "",
        modelo: unidadToEdit.modelo || "",
        year:
          unidadToEdit.year?.toString() || new Date().getFullYear().toString(),

        // Siempre alineados a la nueva lógica
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
        caat_vence: unidadToEdit.caat_vence || "",

        seguro_vence: unidadToEdit.seguro_vence || "",
        verificacion_humo_vence: unidadToEdit.verificacion_humo_vence || "",
        verificacion_fisico_mecanica_vence:
          unidadToEdit.verificacion_fisico_mecanica_vence || "",
        permiso_sct_vence: unidadToEdit.permiso_sct_vence || "",

        status: (unidadToEdit.status || "disponible") as string,
      });

      return;
    }

    if (!open) {
      setFormData(emptyFormData);
      setErrors({});
      setShowOverride(false);
      setMasterPassword("");
    }
  }, [unidadToEdit, open]);

  // Mantener tipo y tipo_1 sincronizados siempre que cambie la naturaleza
  useEffect(() => {
    const categoriaNormalizada = normalizeCategoriaFisica(
      formData.categoriaFisica,
    );
    const layoutAutomatico = getAutoLayoutByCategoria(categoriaNormalizada);

    setFormData((prev) => {
      if (
        prev.tipo === layoutAutomatico &&
        prev.tipo_1 === categoriaNormalizada &&
        prev.categoriaFisica === categoriaNormalizada
      ) {
        return prev;
      }

      return {
        ...prev,
        categoriaFisica: categoriaNormalizada,
        tipo_1: categoriaNormalizada,
        tipo: layoutAutomatico,
      };
    });
  }, [formData.categoriaFisica]);

  // =====================
  // Validation
  // =====================
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoriaFisica.trim()) {
      newErrors.categoriaFisica = "Requerido";
    }

    if (!formData.numero_economico.trim()) {
      newErrors.numero_economico = "Requerido";
    }

    if (!formData.marca.trim()) {
      newErrors.marca = "Requerido";
    }

    if (!formData.year.trim()) {
      newErrors.year = "Requerido";
    }

    if (normalizeCategoriaFisica(formData.categoriaFisica) === "TRACTOCAMION") {
      if (!formData.placas.trim()) {
        newErrors.placas = "Requerido";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =====================
  // Submit
  // =====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Faltan datos",
        description: "Revisa los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const cleanDate = (dateStr: string) =>
      dateStr && dateStr.trim() !== "" ? dateStr : null;

    const cleanString = (str: string) =>
      str && str.trim() !== "" ? str.trim() : null;

    const cleanNumber = (numStr: string) =>
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

    const categoriaFisica = normalizeCategoriaFisica(formData.categoriaFisica);
    const layoutCalculado = normalizeTipoLayout(
      getAutoLayoutByCategoria(categoriaFisica),
    );

    const payload: Partial<Unit> & { ignore_blocking?: boolean } = {
      ...(isEditMode && unidadToEdit ? { id: unidadToEdit.id } : {}),

      numero_economico: formData.numero_economico.trim().toUpperCase(),
      placas: formData.placas.trim().toUpperCase() || "S/P",
      vin: cleanString(formData.vin?.toUpperCase?.() ?? formData.vin),
      marca: formData.marca.trim(),
      modelo: cleanString(formData.modelo),
      year: parseInt(formData.year, 10) || new Date().getFullYear(),

      // Nueva lógica oficial
      tipo: layoutCalculado as any,
      tipo_1: categoriaFisica as any,

      numero_serie_motor: cleanString(formData.numero_serie_motor),
      marca_motor: cleanString(formData.marca_motor),
      capacidad_carga: cleanNumber(formData.capacidad_carga),
      tipo_carga: cleanString(formData.tipo_carga),

      tarjeta_circulacion_url: cleanString(formData.tarjeta_circulacion_url),
      tarjeta_circulacion_folio: cleanString(
        formData.tarjeta_circulacion_folio,
      ),
      permiso_sct_folio: cleanString(formData.permiso_sct_folio),
      caat_folio: cleanString(formData.caat_folio),

      seguro_vence: cleanDate(formData.seguro_vence),
      verificacion_humo_vence: cleanDate(formData.verificacion_humo_vence),
      verificacion_fisico_mecanica_vence: cleanDate(
        formData.verificacion_fisico_mecanica_vence,
      ),
      permiso_sct_vence: cleanDate(formData.permiso_sct_vence),
      caat_vence: cleanDate(formData.caat_vence),

      status: (formData.status || unidadToEdit?.status || "disponible") as any,
      ignore_blocking: ignoreBlocking,
    };

    onSave?.(payload);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
    setShowOverride(false);
    setMasterPassword("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            {isEditMode
              ? `Editar ${formData.numero_economico}`
              : "Registrar Nuevo Activo"}
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            Gestión del activo físico y su expediente documental.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* NATURALEZA + LAYOUT AUTOMÁTICO */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-blue-900">
                Clasificación Física del Activo
              </Label>
              <Badge
                variant="outline"
                className="bg-white border-blue-300 text-blue-800"
              >
                Layout automático:{" "}
                {getLayoutDescription(formData.categoriaFisica)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Activo (Físico) *</Label>
                <Select
                  value={formData.categoriaFisica}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoriaFisica: val,
                    }))
                  }
                >
                  <SelectTrigger
                    className={
                      errors.categoriaFisica ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NATURALEZA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.categoriaFisica && (
                  <p className="text-xs text-destructive">
                    {errors.categoriaFisica}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Configuración de Ejes (Layout)</Label>
                <div className="h-10 rounded-md border bg-white px-3 flex items-center">
                  <span className="text-sm font-medium text-slate-800">
                    {getLayoutDescription(formData.categoriaFisica)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  El sistema lo asigna automáticamente según la naturaleza del
                  activo.
                </p>
              </div>
            </div>
          </div>

          {/* CONTROL DE ESTATUS */}
          <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Control de Estatus
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estatus Operativo</Label>
                <Select
                  value={formData.status || "disponible"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">🟢 Disponible</SelectItem>
                    <SelectItem value="mantenimiento">
                      🟡 Mantenimiento
                    </SelectItem>
                    <SelectItem value="bloqueado" disabled>
                      🔴 Bloqueado (Automático)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant={showOverride ? "destructive" : "outline"}
                  className="w-full"
                  onClick={() => setShowOverride((prev) => !prev)}
                >
                  {showOverride ? "Cancelar Desbloqueo" : "Forzar Habilitación"}
                </Button>
              </div>
            </div>

            {showOverride && (
              <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-1" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold">ZONA DE PELIGRO</p>
                    <p className="text-xs">
                      Estás habilitando una unidad que el sistema podría
                      considerar incompleta o insegura. La operación quedará
                      bajo excepción.
                    </p>
                    <div className="space-y-1">
                      <Label className="text-xs">Contraseña Maestra</Label>
                      <Input
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        placeholder="Ingrese contraseña de admin..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="tecnica">Ficha Técnica</TabsTrigger>
              <TabsTrigger value="documentacion">Documentación</TabsTrigger>
            </TabsList>

            {/* TAB GENERAL */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>No. Económico *</Label>
                  <Input
                    value={formData.numero_economico}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        numero_economico: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Ej: TR-001"
                    className={
                      errors.numero_economico ? "border-destructive" : ""
                    }
                  />
                  {errors.numero_economico && (
                    <p className="text-xs text-destructive">
                      {errors.numero_economico}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Placas {formData.categoriaFisica === "TRACTOCAMION" && "*"}
                  </Label>
                  <Input
                    value={formData.placas}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        placas: e.target.value.toUpperCase(),
                      }))
                    }
                    className={errors.placas ? "border-destructive" : ""}
                  />
                  {errors.placas && (
                    <p className="text-xs text-destructive">{errors.placas}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    list="marcas-list"
                    value={formData.marca}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        marca: e.target.value,
                      }))
                    }
                    placeholder="Seleccione o escriba..."
                    className={errors.marca ? "border-destructive" : ""}
                  />
                  <datalist id="marcas-list">
                    {MARCAS_SUGERIDAS.map((marca) => (
                      <option key={marca} value={marca} />
                    ))}
                  </datalist>
                  {errors.marca && (
                    <p className="text-xs text-destructive">{errors.marca}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input
                    value={formData.modelo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        modelo: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Año *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, year: val }))
                    }
                  >
                    <SelectTrigger
                      className={errors.year ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Seleccione año" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.year && (
                    <p className="text-xs text-destructive">{errors.year}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB TÉCNICA */}
            <TabsContent value="tecnica" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>VIN / Número de Serie</Label>
                  <Input
                    value={formData.vin}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vin: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="17 caracteres alfanuméricos"
                  />
                </div>

                {formData.categoriaFisica === "TRACTOCAMION" && (
                  <>
                    <div className="space-y-2">
                      <Label>Número de Motor</Label>
                      <Input
                        value={formData.numero_serie_motor}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            numero_serie_motor: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Marca de Motor</Label>
                      <Input
                        value={formData.marca_motor}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            marca_motor: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Capacidad de Carga (Ton)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.capacidad_carga}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        capacidad_carga: e.target.value,
                      }))
                    }
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2 border-l-4 border-amber-500 pl-4 bg-amber-50/30 p-2 rounded">
                  <Label className="flex items-center gap-2 text-amber-800 font-bold">
                    <ShieldAlert className="h-4 w-4" />
                    Tipo de Carga / Clasificación
                  </Label>
                  <Select
                    value={formData.tipo_carga}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, tipo_carga: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">Carga General</SelectItem>
                      <SelectItem value="Peligrosa">
                        ⚠️ Material Peligroso (IMO)
                      </SelectItem>
                      <SelectItem value="Refrigerada">
                        ❄️ Refrigerada
                      </SelectItem>
                      <SelectItem value="Granel">🌾 Granel</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.tipo_carga === "Peligrosa" && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      La unidad debe contar con equipamiento, permisos y
                      señalización para materiales peligrosos.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB DOCUMENTACIÓN */}
            <TabsContent value="documentacion" className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md flex items-start gap-2 mb-4 border border-blue-100">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Aquí se registran folios y vencimientos. La carga de archivos
                  PDF puede mantenerse en el detalle de la unidad.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "Póliza de Seguro", key: "seguro_vence" as const },
                  {
                    label: "Verif. Emisiones (Humo)",
                    key: "verificacion_humo_vence" as const,
                  },
                  {
                    label: "Verif. Físico-Mecánica",
                    key: "verificacion_fisico_mecanica_vence" as const,
                  },
                ].map((field) => (
                  <div
                    key={field.key}
                    className="flex items-end gap-3 p-3 border rounded-lg bg-gray-50/50"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        type="date"
                        value={formData[field.key]}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="w-[140px] flex justify-center pb-1">
                      {getStatusBadge(formData[field.key])}
                    </div>
                  </div>
                ))}

                <div className="flex items-end gap-3 p-3 border rounded-lg bg-blue-50/20 border-blue-100">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold uppercase text-blue-700">
                      Registro CAAT (Folio y Vigencia)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Folio CAAT"
                        value={formData.caat_folio}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            caat_folio: e.target.value,
                          }))
                        }
                        className="h-8 flex-[2]"
                      />
                      <Input
                        type="date"
                        value={formData.caat_vence}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            caat_vence: e.target.value,
                          }))
                        }
                        className="h-8 flex-1"
                      />
                    </div>
                  </div>
                  <div className="w-[140px] flex justify-center pb-1">
                    {getStatusBadge(formData.caat_vence)}
                  </div>
                </div>

                <div className="flex items-end gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Folio Permiso de Carga SCT
                    </Label>
                    <Input
                      value={formData.permiso_sct_folio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          permiso_sct_folio: e.target.value,
                        }))
                      }
                      className="h-8"
                      placeholder="Ingrese Folio SCT"
                    />
                  </div>
                  <div className="w-[140px] flex justify-center pb-1">
                    <Badge variant="outline" className="text-muted-foreground">
                      PERMANENTE
                    </Badge>
                  </div>
                </div>

                <div className="flex items-end gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Folio Tarjeta de Circulación
                    </Label>
                    <Input
                      value={formData.tarjeta_circulacion_folio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tarjeta_circulacion_folio: e.target.value,
                        }))
                      }
                      className="h-8"
                      placeholder="Ingrese Folio"
                    />
                  </div>
                  <div className="w-[140px] flex justify-center pb-1">
                    <Badge variant="outline" className="text-muted-foreground">
                      INFO
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4 sticky bottom-0 pb-2 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Actualizar Activo" : "Guardar Activo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
