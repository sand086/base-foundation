import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useTiposUnidad } from "@/hooks/useTiposUnidad";
import { Truck, Loader2, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Unidad } from "@/types/api.types"; // Importamos el tipo correcto

// Estado interno del formulario (Manejamos todo como string para los inputs)
interface UnidadFormData {
  categoriaActivo: string;
  numero_economico: string;
  placas: string;
  vin: string;
  marca: string;
  modelo: string;
  year: string;
  tipo: string;
  numero_serie_motor: string;
  marca_motor: string;
  capacidad_carga: string;
  tipo_carga: string;
  tarjeta_circulacion: string; // Input de texto (Folio) -> Se mapeará según lógica

  // Fechas
  seguro_vence: string;
  verificacion_humo_vence: string;
  verificacion_fisico_mecanica_vence: string;
  verificacion_vence: string;
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
  numero_serie_motor: "",
  marca_motor: "",
  capacidad_carga: "",
  tipo_carga: "",
  tarjeta_circulacion: "",
  seguro_vence: "",
  verificacion_humo_vence: "",
  verificacion_fisico_mecanica_vence: "",
  verificacion_vence: "",
  permiso_sct_vence: "",
  status: "disponible",
};

// Helper visual para fechas
const getStatusBadge = (dateStr: string) => {
  if (!dateStr)
    return (
      <Badge variant="outline" className="text-muted-foreground text-[10px]">
        PENDIENTE
      </Badge>
    );

  const today = new Date();
  const exp = new Date(dateStr);
  exp.setMinutes(exp.getMinutes() + exp.getTimezoneOffset()); // Ajuste UTC

  const days = Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0)
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
        VENCIDO
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
        POR VENCER ({days}d)
      </Badge>
    );

  return (
    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
      VIGENTE
    </Badge>
  );
};

interface AddUnidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadToEdit?: Unidad | null; // Tipado estricto
  onSave?: (unidad: any) => void; // El padre manejará el envío
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

  useEffect(() => {
    if (open && unidadToEdit) {
      // Mapeo inverso: Backend -> Formulario
      let cat = unidadToEdit.tipo_1 || "tractocamion";

      // Normalización de categorías legacy
      if (cat === "TRACTOCAMION") cat = "tractocamion";
      if (cat === "REMOLQUE") cat = "remolque_dolly";
      if (cat === "UTILITARIO") cat = "utilitario";

      if (!["tractocamion", "remolque_dolly", "utilitario"].includes(cat)) {
        setCustomCategoryMode(true);
      }

      setFormData({
        categoriaActivo: cat,
        numero_economico: unidadToEdit.numero_economico,
        placas: unidadToEdit.placas,
        vin: unidadToEdit.vin || "",
        marca: unidadToEdit.marca,
        modelo: unidadToEdit.modelo,
        year:
          unidadToEdit.year?.toString() || new Date().getFullYear().toString(),
        tipo: unidadToEdit.tipo,
        numero_serie_motor: unidadToEdit.numero_serie_motor || "",
        marca_motor: unidadToEdit.marca_motor || "",
        capacidad_carga: unidadToEdit.capacidad_carga?.toString() || "",
        tipo_carga: unidadToEdit.tipo_carga || "",
        // NOTA: Si el backend usa 'tarjeta_circulacion_url' para guardar el folio (hack), lo leemos de ahí
        tarjeta_circulacion: unidadToEdit.tarjeta_circulacion_url || "",

        // Fechas: Aseguramos string vacío si es null
        seguro_vence: unidadToEdit.seguro_vence || "",
        verificacion_humo_vence: unidadToEdit.verificacion_humo_vence || "",
        verificacion_fisico_mecanica_vence:
          unidadToEdit.verificacion_fisico_mecanica_vence || "",
        verificacion_vence: unidadToEdit.verificacion_vence || "",
        permiso_sct_vence: unidadToEdit.permiso_sct_vence || "",
        status: unidadToEdit.status,
      });
      setErrors({});
    } else if (!open) {
      setFormData(emptyFormData);
      setErrors({});
      setCustomCategoryMode(false);
    }
  }, [unidadToEdit, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoriaActivo) newErrors.categoriaActivo = "Requerido";
    if (!formData.numero_economico.trim())
      newErrors.numero_economico = "Requerido";

    // Validaciones condicionales
    if (formData.categoriaActivo === "tractocamion") {
      if (!formData.placas.trim()) newErrors.placas = "Requerido";
      if (!formData.marca.trim()) newErrors.marca = "Requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

    // Transformación: Formulario -> Backend
    let tipo1Backend = formData.categoriaActivo;
    if (formData.categoriaActivo === "tractocamion")
      tipo1Backend = "TRACTOCAMION";
    else if (formData.categoriaActivo === "remolque_dolly")
      tipo1Backend = "REMOLQUE";
    else if (formData.categoriaActivo === "utilitario")
      tipo1Backend = "UTILITARIO";
    else tipo1Backend = formData.categoriaActivo.toUpperCase(); // Custom categories

    // Limpieza de datos (Empty strings -> null)
    const cleanDate = (dateStr: string) =>
      dateStr && dateStr.trim() !== "" ? dateStr : null;
    const cleanString = (str: string) =>
      str && str.trim() !== "" ? str : null;
    const cleanNumber = (numStr: string) =>
      numStr && !isNaN(parseFloat(numStr)) ? parseFloat(numStr) : null;

    const payload: Partial<Unidad> = {
      // Si editamos, preservamos el ID
      ...(isEditMode && unidadToEdit ? { id: unidadToEdit.id } : {}),

      numero_economico: formData.numero_economico,
      placas: formData.placas || "S/P",
      marca: formData.marca,
      modelo: formData.modelo,
      year: parseInt(formData.year) || new Date().getFullYear(),
      tipo: (formData.tipo as any) || "sencillo", // Cast seguro
      tipo_1: tipo1Backend,
      vin: cleanString(formData.vin),

      numero_serie_motor: cleanString(formData.numero_serie_motor),
      marca_motor: cleanString(formData.marca_motor),
      capacidad_carga: cleanNumber(formData.capacidad_carga),
      tipo_carga: cleanString(formData.tipo_carga),

      // Mapeamos el input "tarjeta_circulacion" al campo URL que el backend usa temporalmente
      tarjeta_circulacion_url: cleanString(formData.tarjeta_circulacion),

      seguro_vence: cleanDate(formData.seguro_vence),
      verificacion_humo_vence: cleanDate(formData.verificacion_humo_vence),
      verificacion_fisico_mecanica_vence: cleanDate(
        formData.verificacion_fisico_mecanica_vence,
      ),
      verificacion_vence: cleanDate(formData.verificacion_vence),
      permiso_sct_vence: cleanDate(formData.permiso_sct_vence),

      status: (unidadToEdit?.status || "disponible") as any,
    };

    onSave?.(payload);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) => currentYear - i + 1);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                    setCustomCategoryMode(!customCategoryMode);
                    if (!customCategoryMode)
                      setFormData({ ...formData, categoriaActivo: "" });
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
                    setFormData({
                      ...formData,
                      categoriaActivo: e.target.value,
                    })
                  }
                  className={errors.categoriaActivo ? "border-destructive" : ""}
                  autoFocus
                />
              ) : (
                <Select
                  value={formData.categoriaActivo}
                  onValueChange={(val) =>
                    setFormData({ ...formData, categoriaActivo: val })
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
                      setFormData({
                        ...formData,
                        numero_economico: e.target.value.toUpperCase(),
                      })
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
                      setFormData({
                        ...formData,
                        placas: e.target.value.toUpperCase(),
                      })
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
                      setFormData({ ...formData, marca: e.target.value })
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
                      setFormData({ ...formData, modelo: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Año *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(val) =>
                      setFormData({ ...formData, year: val })
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

                {formData.categoriaActivo === "tractocamion" && (
                  <div className="space-y-2">
                    <Label>Configuración</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(val) =>
                        setFormData({ ...formData, tipo: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposActivos.map((t) => (
                          <SelectItem key={t.id} value={t.nombre.toLowerCase()}>
                            {t.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      setFormData({
                        ...formData,
                        vin: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="17 caracteres alfanuméricos"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Número de Motor</Label>
                  <Input
                    value={formData.numero_serie_motor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numero_serie_motor: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Marca de Motor</Label>
                  <Input
                    value={formData.marca_motor}
                    onChange={(e) =>
                      setFormData({ ...formData, marca_motor: e.target.value })
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
                      setFormData({
                        ...formData,
                        capacidad_carga: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Carga</Label>
                  <Select
                    value={formData.tipo_carga}
                    onValueChange={(val) =>
                      setFormData({ ...formData, tipo_carga: val })
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
                {/* Helper para renderizar campos de fecha repetitivos */}
                {[
                  {
                    label: "Póliza de Seguro",
                    key: "seguro_vence" as keyof UnidadFormData,
                  },
                  {
                    label: "Verif. Emisiones (Humo)",
                    key: "verificacion_humo_vence" as keyof UnidadFormData,
                  },
                  {
                    label: "Verif. Físico-Mecánica",
                    key: "verificacion_fisico_mecanica_vence" as keyof UnidadFormData,
                  },
                  {
                    label: "Verificación Ambiental",
                    key: "verificacion_vence" as keyof UnidadFormData,
                  },
                  {
                    label: "Permiso SCT",
                    key: "permiso_sct_vence" as keyof UnidadFormData,
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
                          setFormData({
                            ...formData,
                            [field.key]: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="w-[140px] flex justify-center pb-1">
                      {getStatusBadge(formData[field.key])}
                    </div>
                  </div>
                ))}

                {/* Input especial para folio tarjeta circulación */}
                <div className="flex items-end gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Folio Tarjeta Circulación
                    </Label>
                    <Input
                      value={formData.tarjeta_circulacion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tarjeta_circulacion: e.target.value,
                        })
                      }
                      className="h-8"
                      placeholder="Ingrese Folio"
                    />
                  </div>
                  <div className="w-[140px] flex justify-center pb-1">
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-[10px]"
                    >
                      INFO
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4 sticky bottom-0 bg-background pb-2">
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
