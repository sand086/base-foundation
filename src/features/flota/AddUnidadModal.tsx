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

import { Lock, Unlock, Truck, Loader2, Info, Settings } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useTiposUnidad } from "@/hooks/useTiposUnidad";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Unit } from "@/types/api.types";

// =====================
// Types
// =====================
interface UnidadFormData {
  // UI-only
  categoriaActivo: string; // UI category selector (tractocamion / remolque_dolly / utilitario / custom)

  // Core
  numero_economico: string;
  placas: string;
  vin: string;
  marca: string;
  modelo: string;
  year: string;

  // IMPORTANT:
  // tipo = configuracion (enum backend: SENCILLO/FULL/RABON/...)
  // tipo_1 = categoria backend (TRACTOCAMION/REMOLQUE/UTILITARIO/custom)
  tipo: Unit["tipo"] | "";
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

const emptyFormData: UnidadFormData = {
  categoriaActivo: "",

  numero_economico: "",
  placas: "",
  vin: "",
  marca: "",
  modelo: "",
  year: new Date().getFullYear().toString(),

  tipo: "",
  tipo_1: "",

  numero_serie_motor: "",
  marca_motor: "",
  capacidad_carga: "",
  tipo_carga: "",

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
      <Badge variant="outline" className="text-muted-foreground ">
        PENDIENTE
      </Badge>
    );
  }

  const today = new Date();
  const exp = new Date(dateStr);
  exp.setMinutes(exp.getMinutes() + exp.getTimezoneOffset()); // Ajuste UTC

  const days = Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0)
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 ">
        VENCIDO
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 ">
        POR VENCER ({days}d)
      </Badge>
    );

  return (
    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 ">
      VIGENTE
    </Badge>
  );
};

const normalizeCategoriaUI = (tipo1?: string | null) => {
  const cat_ = (tipo1 || "TRACTOCAMION")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (cat_ === "TRACTOCAMION") return "tractocamion";
  if (cat_ === "REMOLQUE") return "remolque_dolly";
  if (cat_ === "UTILITARIO") return "utilitario";

  return cat_.toLowerCase();
};

const mapCategoriaToBackend = (categoriaActivo: string) => {
  // UI -> backend tipo_1
  if (categoriaActivo === "tractocamion") return "TRACTOCAMION";
  if (categoriaActivo === "remolque_dolly") return "REMOLQUE";
  if (categoriaActivo === "utilitario") return "UTILITARIO";

  return (categoriaActivo || "").trim().toUpperCase();
};

/**
 * Normaliza cualquier input (UI / backend / catálogo) al formato
 * que "debe guardar": MAYÚSCULAS + sin acentos.
 * Ej:
 *  - "rabón" -> "RABON"
 *  - "Rabon" -> "RABON"
 *  - "full"  -> "FULL"
 */
const normalizeTipoToSave = (value: unknown): Unit["tipo"] | "" => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const noAccents = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return noAccents.toUpperCase() as Unit["tipo"];
};

// =====================
// Component
// =====================
interface AddUnidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadToEdit?: Unit | null;
  onSave?: (unidad: any) => void;
  isSaving?: boolean;
}

export function AddUnidadModal({
  open,
  onOpenChange,
  unidadToEdit,
  onSave,
  isSaving = false,
}: AddUnidadModalProps) {
  const { toast } = useToast();
  const { tiposActivos } = useTiposUnidad();

  const [formData, setFormData] = useState<UnidadFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customCategoryMode, setCustomCategoryMode] = useState(false);

  const isEditMode = !!unidadToEdit;

  // Ocultar sencillo/full del listado, pero permitir que se muestren si ya vienen en la unidad
  // (en tu backend probablemente es MAYÚSCULAS, pero aquí lo normalizamos para comparar)
  const hiddenTipos = useMemo(() => ["SENCILLO", "FULL"], []);
  const currentTipoIsHidden = hiddenTipos.includes(
    normalizeTipoToSave(formData.tipo),
  );

  const [masterPassword, setMasterPassword] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  // =====================
  // Load edit data
  // =====================
  useEffect(() => {
    if (open && unidadToEdit) {
      const catUI = normalizeCategoriaUI(unidadToEdit.tipo_1);

      // Si no es de las 3 categorías predefinidas -> custom input
      const isKnown = ["tractocamion", "remolque_dolly", "utilitario"].includes(
        catUI,
      );
      setCustomCategoryMode(!isKnown);

      setFormData({
        categoriaActivo: isKnown ? catUI : unidadToEdit.tipo_1 || catUI,

        numero_economico: unidadToEdit.numero_economico || "",
        placas: unidadToEdit.placas || "",
        vin: unidadToEdit.vin || "",
        marca: unidadToEdit.marca || "",
        modelo: unidadToEdit.modelo || "",
        year:
          unidadToEdit.year?.toString() || new Date().getFullYear().toString(),

        // IMPORTANT: guardamos ya normalizado para que el SELECT lo refleje y se guarde bien
        tipo: normalizeTipoToSave(unidadToEdit.tipo),
        // tipo_1 backend (solo para referencia; se recalcula al guardar)
        tipo_1: (unidadToEdit.tipo_1 || "").toString(),

        numero_serie_motor: unidadToEdit.numero_serie_motor || "",
        marca_motor: unidadToEdit.marca_motor || "",
        capacidad_carga: unidadToEdit.capacidad_carga?.toString() || "",
        tipo_carga: unidadToEdit.tipo_carga || "",

        tarjeta_circulacion_folio: unidadToEdit.tarjeta_circulacion_folio || "",
        tarjeta_circulacion_url: unidadToEdit.tarjeta_circulacion_url || "",

        permiso_sct_folio: unidadToEdit.permiso_sct_folio || "",
        caat_folio: unidadToEdit.caat_folio || "",
        caat_vence: unidadToEdit.caat_vence || "",
        permiso_sct_vence: unidadToEdit.permiso_sct_vence || "",

        seguro_vence: unidadToEdit.seguro_vence || "",
        verificacion_humo_vence: unidadToEdit.verificacion_humo_vence || "",
        verificacion_fisico_mecanica_vence:
          unidadToEdit.verificacion_fisico_mecanica_vence || "",

        status: (unidadToEdit.status || "disponible") as any,
      });

      setErrors({});
      return;
    }

    if (!open) {
      setFormData(emptyFormData);
      setErrors({});
      setCustomCategoryMode(false);
    }
  }, [unidadToEdit, open]);

  // =====================
  // Validation
  // =====================
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoriaActivo) newErrors.categoriaActivo = "Requerido";
    if (!formData.numero_economico.trim())
      newErrors.numero_economico = "Requerido";

    // Condicionales
    if (formData.categoriaActivo === "tractocamion") {
      if (!formData.placas.trim()) newErrors.placas = "Requerido";
      if (!formData.marca.trim()) newErrors.marca = "Requerido";
      // Si quieres obligar configuración:
      // if (!formData.tipo) newErrors.tipo = "Requerido";
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

    // Limpieza (Empty strings -> null)
    const cleanDate = (dateStr: string) =>
      dateStr && dateStr.trim() !== "" ? dateStr : null;
    const cleanString = (str: string) =>
      str && str.trim() !== "" ? str : null;
    const cleanNumber = (numStr: string) =>
      numStr && !isNaN(parseFloat(numStr)) ? parseFloat(numStr) : null;

    let ignoreBlocking = false;

    if (showOverride) {
      if (masterPassword === "ADMIN123") {
        // <--- TU CONTRASEÑA MAESTRA
        ignoreBlocking = true;
      } else {
        toast({ title: "Contraseña incorrecta", variant: "destructive" });
        return;
      }
    }

    const tipo1Backend = mapCategoriaToBackend(formData.categoriaActivo);

    // tipo = "configuración" -> SIEMPRE normalizada para guardar
    const tipoPayload: Unit["tipo"] =
      formData.categoriaActivo === "tractocamion" && formData.tipo
        ? (normalizeTipoToSave(formData.tipo) as Unit["tipo"])
        : ((normalizeTipoToSave(unidadToEdit?.tipo) || "FULL") as Unit["tipo"]);

    const payload: Partial<Unit> = {
      ...(isEditMode && unidadToEdit ? { id: unidadToEdit.id } : {}),

      numero_economico: formData.numero_economico,
      placas: formData.placas || "S/P",
      marca: formData.marca,
      modelo: formData.modelo,
      year: parseInt(formData.year) || new Date().getFullYear(),

      ignore_blocking: ignoreBlocking,

      tipo: tipoPayload as any,
      tipo_1: tipo1Backend,
      vin: cleanString(formData.vin),

      numero_serie_motor: cleanString(formData.numero_serie_motor),
      marca_motor: cleanString(formData.marca_motor),
      capacidad_carga: cleanNumber(formData.capacidad_carga),
      tipo_carga: cleanString(formData.tipo_carga),

      tarjeta_circulacion_url: cleanString(formData.tarjeta_circulacion_url),
      tarjeta_circulacion_folio: cleanString(
        formData.tarjeta_circulacion_folio,
      ),

      seguro_vence: cleanDate(formData.seguro_vence),
      verificacion_humo_vence: cleanDate(formData.verificacion_humo_vence),
      verificacion_fisico_mecanica_vence: cleanDate(
        formData.verificacion_fisico_mecanica_vence,
      ),

      permiso_sct_folio: cleanString(formData.permiso_sct_folio),
      caat_folio: cleanString(formData.caat_folio),
      caat_vence: cleanDate(formData.caat_vence),
      permiso_sct_vence: cleanDate(formData.permiso_sct_vence),

      status: (unidadToEdit?.status || "disponible") as any,
    };

    onSave?.(payload);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
    setCustomCategoryMode(false);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) => currentYear - i + 1);

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
              : "Registrar Nueva Unidad"}
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            Gestión completa del expediente vehicular.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* SELECCIÓN DE CATEGORÍA */}
          <div className="bg-muted/30 p-4 rounded-lg border mb-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Categoría de Activo *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-blue-600"
                  onClick={() => {
                    setCustomCategoryMode((prev) => !prev);
                    if (!customCategoryMode) {
                      setFormData((prev) => ({ ...prev, categoriaActivo: "" }));
                    }
                  }}
                >
                  {customCategoryMode ? "Volver a lista" : "+ Otra categoría"}
                </Button>
              </div>

              {customCategoryMode ? (
                <Input
                  placeholder="Ej: Montacargas"
                  value={formData.categoriaActivo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoriaActivo: e.target.value,
                    }))
                  }
                  className={errors.categoriaActivo ? "border-destructive" : ""}
                  autoFocus
                />
              ) : (
                <Select
                  value={formData.categoriaActivo}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, categoriaActivo: val }))
                  }
                >
                  <SelectTrigger
                    className={
                      errors.categoriaActivo ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tractocamion">
                      🚛 Tractocamión
                    </SelectItem>
                    <SelectItem value="remolque_dolly">
                      📦 Remolque / Dolly
                    </SelectItem>
                    <SelectItem value="utilitario">
                      🔧 Utilitario / Otro
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              {errors.categoriaActivo && (
                <p className="text-xs text-destructive">
                  {errors.categoriaActivo}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-slate-50 space-y-4 mt-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" /> Control de Estatus
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estatus Operativo</Label>
                <Select
                  value={formData.status || "disponible"}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, status: v }))
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

              {/* BOTÓN DE DESBLOQUEO DE EMERGENCIA */}
              <div className="flex items-end">
                <Button
                  type="button"
                  variant={showOverride ? "destructive" : "outline"}
                  className="w-full"
                  onClick={() => setShowOverride(!showOverride)}
                >
                  {showOverride ? "Cancelar Desbloqueo" : "Forzar Habilitación"}
                </Button>
              </div>
            </div>

            {/* INPUT DE CONTRASEÑA MAESTRA (Solo si se activa override) */}
            {showOverride && (
              <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-1" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold">ZONA DE PELIGRO</p>
                    <p className="text-xs">
                      Estás a punto de habilitar una unidad que el sistema ha
                      marcado como insegura. La data quedará incompleta pero la
                      unidad podrá asignarse.
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

            {/* TAB 1: DATOS GENERALES */}
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
                    Placas {formData.categoriaActivo === "tractocamion" && "*"}
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
                    <option value="Freightliner" />
                    <option value="Kenworth" />
                    <option value="International" />
                    <option value="Volvo" />
                    <option value="Mercedes-Benz" />
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CONFIGURACIÓN (usa tipo, NO tipo_1) */}
                {formData.categoriaActivo === "tractocamion" && (
                  <div className="space-y-2">
                    <Label>Configuración</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          tipo: normalizeTipoToSave(val),
                        }))
                      }
                    >
                      <SelectTrigger
                        className={errors.tipo ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>

                      <SelectContent>
                        {/* Mostrar valor oculto si ya viene (SENCILLO/FULL) */}
                        {currentTipoIsHidden && formData.tipo && (
                          <SelectItem value={formData.tipo}>
                            {String(formData.tipo).toUpperCase()} (oculto)
                          </SelectItem>
                        )}

                        {tiposActivos
                          .filter(
                            (t) =>
                              !hiddenTipos.includes(
                                normalizeTipoToSave(t.nombre) || "",
                              ),
                          )
                          .map((t) => {
                            const normalizedValue =
                              normalizeTipoToSave(t.nombre) || "";
                            return (
                              <SelectItem key={t.id} value={normalizedValue}>
                                {t.nombre}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    {errors.tipo && (
                      <p className="text-xs text-destructive">{errors.tipo}</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: FICHA TÉCNICA */}
            <TabsContent value="tecnica" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
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
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Carga</Label>
                  <Select
                    value={formData.tipo_carga}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, tipo_carga: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="General, IMO, etc." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">Carga General</SelectItem>
                      <SelectItem value="Refrigerada">Refrigerada</SelectItem>
                      <SelectItem value="Peligrosa">
                        Material Peligroso (IMO)
                      </SelectItem>
                      <SelectItem value="Granel">Granel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: DOCUMENTACIÓN */}
            <TabsContent value="documentacion" className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md flex items-start gap-2 mb-4 border border-blue-100">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Aquí registramos los vencimientos. La carga de archivos PDF se
                  realiza en el detalle de la unidad.
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

                {/* CAAT */}
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

                {/* Permiso SCT Folio */}
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
                    <Badge variant="outline" className="text-muted-foreground ">
                      PERMANENTE
                    </Badge>
                  </div>
                </div>

                {/* Tarjeta Circulación Folio */}
                <div className="flex items-end gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Folio Tarjeta Circulación
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
                    <Badge variant="outline" className="text-muted-foreground ">
                      INFO
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4 sticky bottom-0 pb-2">
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
              {isEditMode ? "Actualizar Unidad" : "Guardar Unidad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
