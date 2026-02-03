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
import {
  Truck,
  CreditCard,
  Calendar,
  Hash,
  Box,
  Wrench,
  Loader2,
} from "lucide-react";

// Definimos los tipos permitidos para categorías
export type CategoriaActivo = "tractocamion" | "remolque_dolly" | "utilitario";

// Definimos la Interfaz EXACTA de los datos que maneja este formulario
export interface UnidadFormData {
  id?: string;
  numeroEconomico: string;
  placas: string;
  marca: string;
  modelo: string;
  year: string; // Usamos string para el input, se convierte al guardar
  tipo: string;
  status?: string;
  operador?: string | null;
  documentosVencidos?: number;
  llantasCriticas?: number;
  // Campos opcionales específicos
  categoriaActivo?: CategoriaActivo | "";
  tipoSuspension?: string;
  dimensiones?: string;
  ejes?: string;
  descripcion?: string;
  // Otros campos que podrían venir del backend
  vin?: string;
}

interface AddUnidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Usamos la interfaz correcta o any para flexibilidad inicial
  unidadToEdit?: UnidadFormData | null;
  onSave?: (unidad: UnidadFormData) => void;
  isSaving?: boolean;
}

const emptyFormData: UnidadFormData = {
  categoriaActivo: "",
  numeroEconomico: "",
  placas: "",
  marca: "",
  modelo: "",
  year: new Date().getFullYear().toString(),
  tipo: "",
  tipoSuspension: "",
  dimensiones: "",
  ejes: "",
  descripcion: "",
};

export function AddUnidadModal({
  open,
  onOpenChange,
  unidadToEdit,
  onSave,
  isSaving = false,
}: AddUnidadModalProps) {
  const { toast } = useToast();
  const { tiposActivos, loading: loadingTipos } = useTiposUnidad();

  // Estado local para validación
  const [formData, setFormData] = useState<UnidadFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!unidadToEdit;

  // Pre-load data when editing
  useEffect(() => {
    if (open && unidadToEdit) {
      setFormData({
        ...emptyFormData,
        ...unidadToEdit,
        year:
          unidadToEdit.year?.toString() || new Date().getFullYear().toString(),
        categoriaActivo: unidadToEdit.categoriaActivo || "tractocamion",
      });
      setErrors({});
    } else if (!open) {
      // Reset al cerrar
      setFormData(emptyFormData);
      setErrors({});
    }
  }, [unidadToEdit, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Common validation
    if (!formData.categoriaActivo) {
      newErrors.categoriaActivo = "Seleccione una categoría de activo";
    }
    if (!formData.numeroEconomico || !formData.numeroEconomico.trim()) {
      newErrors.numeroEconomico = "El número económico es obligatorio";
    }

    // Category-specific validation
    if (formData.categoriaActivo === "tractocamion") {
      if (!formData.placas?.trim())
        newErrors.placas = "Las placas son obligatorias";
      if (!formData.marca?.trim()) newErrors.marca = "La marca es obligatoria";
      if (!formData.modelo?.trim())
        newErrors.modelo = "El modelo es obligatorio";
      if (!formData.year) newErrors.year = "El año es obligatorio";
      if (!formData.tipo) newErrors.tipo = "Seleccione un tipo de unidad";
    } else if (formData.categoriaActivo === "remolque_dolly") {
      if (!formData.tipoSuspension?.trim())
        newErrors.tipoSuspension = "Campo obligatorio";
      if (!formData.dimensiones?.trim())
        newErrors.dimensiones = "Campo obligatorio";
      if (!formData.ejes?.trim()) newErrors.ejes = "Campo obligatorio";
    } else if (formData.categoriaActivo === "utilitario") {
      if (!formData.descripcion?.trim())
        newErrors.descripcion = "Campo obligatorio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Faltan datos",
        description: "Por favor complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    // Construir objeto para enviar al padre
    const unidadData: UnidadFormData = {
      ...formData,
      id: isEditMode && unidadToEdit?.id ? unidadToEdit.id : undefined,
      placas: formData.placas?.toUpperCase() || "",
      year: formData.year, // Mantenemos como string o number según venga
      // Preservar datos existentes si es edición
      status: unidadToEdit?.status || "disponible",
      operador: unidadToEdit?.operador || null,
      documentosVencidos: unidadToEdit?.documentosVencidos || 0,
      llantasCriticas: unidadToEdit?.llantasCriticas || 0,
    };

    // Llamar al padre
    onSave?.(unidadData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
  };

  // Generate year options (last 15 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            {isEditMode ? "Editar Unidad" : "Registrar Nueva Unidad"}
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            {isEditMode
              ? "Modifique la información de la unidad."
              : "Complete la información del vehículo para agregarlo a la flota."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Category Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              Categoría de Activo
            </h3>
            <div className="space-y-2">
              <Label htmlFor="categoriaActivo">Tipo de Activo *</Label>
              <Select
                value={formData.categoriaActivo}
                onValueChange={(value: CategoriaActivo) =>
                  setFormData({
                    ...emptyFormData,
                    categoriaActivo: value,
                    numeroEconomico: formData.numeroEconomico,
                  })
                }
              >
                <SelectTrigger
                  className={errors.categoriaActivo ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Seleccionar categoría..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tractocamion">
                    <span className="flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Tractocamión
                    </span>
                  </SelectItem>
                  <SelectItem value="remolque_dolly">
                    <span className="flex items-center gap-2">
                      <Box className="h-4 w-4" /> Remolque / Dolly
                    </span>
                  </SelectItem>
                  <SelectItem value="utilitario">
                    <span className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Utilitario / Otro
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.categoriaActivo && (
                <p className="text-xs text-destructive">
                  {errors.categoriaActivo}
                </p>
              )}
            </div>
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Identificación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroEconomico">No. Económico *</Label>
                <Input
                  id="numeroEconomico"
                  placeholder={
                    formData.categoriaActivo === "remolque_dolly"
                      ? "REM-001"
                      : "TR-001"
                  }
                  value={formData.numeroEconomico}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numeroEconomico: e.target.value.toUpperCase(),
                    })
                  }
                  className={errors.numeroEconomico ? "border-destructive" : ""}
                />
                {errors.numeroEconomico && (
                  <p className="text-xs text-destructive">
                    {errors.numeroEconomico}
                  </p>
                )}
              </div>

              {formData.categoriaActivo === "tractocamion" && (
                <div className="space-y-2">
                  <Label htmlFor="placas">Placas Federales *</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="placas"
                      placeholder="AAA-000-A"
                      className={`pl-10 uppercase ${
                        errors.placas ? "border-destructive" : ""
                      }`}
                      value={formData.placas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          placas: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                  {errors.placas && (
                    <p className="text-xs text-destructive">{errors.placas}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* TRACTOCAMION FIELDS */}
          {formData.categoriaActivo === "tractocamion" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Datos del Vehículo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca *</Label>
                  <Select
                    value={formData.marca}
                    onValueChange={(value) =>
                      setFormData({ ...formData, marca: value })
                    }
                  >
                    <SelectTrigger
                      className={errors.marca ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Freightliner">Freightliner</SelectItem>
                      <SelectItem value="Kenworth">Kenworth</SelectItem>
                      <SelectItem value="Volvo">Volvo</SelectItem>
                      <SelectItem value="International">
                        International
                      </SelectItem>
                      <SelectItem value="Peterbilt">Peterbilt</SelectItem>
                      <SelectItem value="Mack">Mack</SelectItem>
                      <SelectItem value="Western Star">Western Star</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.marca && (
                    <p className="text-xs text-destructive">{errors.marca}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input
                    id="modelo"
                    placeholder="Cascadia, T680, VNL..."
                    value={formData.modelo}
                    onChange={(e) =>
                      setFormData({ ...formData, modelo: e.target.value })
                    }
                    className={errors.modelo ? "border-destructive" : ""}
                  />
                  {errors.modelo && (
                    <p className="text-xs text-destructive">{errors.modelo}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Año *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Select
                      value={formData.year.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, year: value })
                      }
                    >
                      <SelectTrigger
                        className={`pl-10 ${
                          errors.year ? "border-destructive" : ""
                        }`}
                      >
                        <SelectValue placeholder="Seleccionar año" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.year && (
                    <p className="text-xs text-destructive">{errors.year}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Unidad *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                    disabled={loadingTipos}
                  >
                    <SelectTrigger
                      className={errors.tipo ? "border-destructive" : ""}
                    >
                      <SelectValue
                        placeholder={
                          loadingTipos ? "Cargando..." : "Seleccionar tipo"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposActivos.map((tipo) => (
                        <SelectItem
                          key={tipo.id}
                          value={tipo.nombre.toLowerCase()}
                        >
                          <span className="flex items-center gap-2">
                            {tipo.icono} {tipo.nombre}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipo && (
                    <p className="text-xs text-destructive">{errors.tipo}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* REMOLQUE/DOLLY FIELDS */}
          {formData.categoriaActivo === "remolque_dolly" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                Datos del Remolque / Dolly
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoSuspension">Tipo de Suspensión *</Label>
                  <Select
                    value={formData.tipoSuspension}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipoSuspension: value })
                    }
                  >
                    <SelectTrigger
                      className={
                        errors.tipoSuspension ? "border-destructive" : ""
                      }
                    >
                      <SelectValue placeholder="Seleccionar suspensión" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aire">Suspensión de Aire</SelectItem>
                      <SelectItem value="mecanica">
                        Suspensión Mecánica
                      </SelectItem>
                      <SelectItem value="mixta">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tipoSuspension && (
                    <p className="text-xs text-destructive">
                      {errors.tipoSuspension}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensiones">Dimensiones *</Label>
                  <Select
                    value={formData.dimensiones}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dimensiones: value })
                    }
                  >
                    <SelectTrigger
                      className={errors.dimensiones ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Seleccionar dimensiones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40">40 pies</SelectItem>
                      <SelectItem value="48">48 pies</SelectItem>
                      <SelectItem value="53">53 pies</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.dimensiones && (
                    <p className="text-xs text-destructive">
                      {errors.dimensiones}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ejes">Número de Ejes *</Label>
                <Select
                  value={formData.ejes}
                  onValueChange={(value) =>
                    setFormData({ ...formData, ejes: value })
                  }
                >
                  <SelectTrigger
                    className={errors.ejes ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Seleccionar ejes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Ejes</SelectItem>
                    <SelectItem value="3">3 Ejes</SelectItem>
                    <SelectItem value="4">4 Ejes</SelectItem>
                  </SelectContent>
                </Select>
                {errors.ejes && (
                  <p className="text-xs text-destructive">{errors.ejes}</p>
                )}
              </div>
            </div>
          )}

          {/* UTILITARIO FIELDS */}
          {formData.categoriaActivo === "utilitario" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Datos del Utilitario
              </h3>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción del Activo *</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej: Montacargas Yale 5 Ton, Generador..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  className={errors.descripcion ? "border-destructive" : ""}
                />
                {errors.descripcion && (
                  <p className="text-xs text-destructive">
                    {errors.descripcion}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca (Opcional)</Label>
                  <Input
                    id="marca"
                    placeholder="Yale, Caterpillar, etc."
                    value={formData.marca}
                    onChange={(e) =>
                      setFormData({ ...formData, marca: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo (Opcional)</Label>
                  <Input
                    id="modelo"
                    placeholder="Modelo del equipo"
                    value={formData.modelo}
                    onChange={(e) =>
                      setFormData({ ...formData, modelo: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : isEditMode ? (
                "Actualizar Unidad"
              ) : (
                "Guardar Unidad"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
