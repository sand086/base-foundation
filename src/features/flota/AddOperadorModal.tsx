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
import {
  User,
  Phone,
  CreditCard,
  Calendar as CalendarIcon,
  Truck,
  Heart,
  Loader2,
} from "lucide-react";
import { Operador } from "@/services/operatorService";
import { useUnits } from "@/hooks/useUnits";

interface AddOperadorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorToEdit?: Operador | null;
  // Omitimos ID al crear (y permitimos payload flexible)
  onSave?: (operador: any) => void;
  isSaving?: boolean;
}

// Nota: assigned_unit_id sigue siendo string aquí SOLO para el Select.
// En el submit lo convertimos a number | null.
const emptyFormData = {
  name: "",
  license_number: "",
  license_type: "",
  license_expiry: "",
  medical_check_expiry: "",
  phone: "",
  assigned_unit_id: "", // String temporal para el Select
  hire_date: "",
  emergency_contact: "",
  emergency_phone: "",
};

export function AddOperadorModal({
  open,
  onOpenChange,
  operatorToEdit,
  onSave,
  isSaving = false,
}: AddOperadorModalProps) {
  const { toast } = useToast();
  const { unidades } = useUnits();
  const [formData, setFormData] = useState(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!operatorToEdit;

  // Filtramos unidades disponibles + la actual del operador
  const unidadesSelectables = unidades.filter(
    (u) =>
      u.status === "disponible" ||
      (operatorToEdit && u.id === operatorToEdit.assigned_unit_id),
  );

  useEffect(() => {
    if (open && operatorToEdit) {
      setFormData({
        name: operatorToEdit.name,
        license_number: operatorToEdit.license_number,
        license_type: operatorToEdit.license_type,
        license_expiry: operatorToEdit.license_expiry,
        medical_check_expiry: operatorToEdit.medical_check_expiry,
        phone: operatorToEdit.phone || "",
        // Convertimos el ID numérico a string para el Select, o "" si es null
        assigned_unit_id: operatorToEdit.assigned_unit_id?.toString() || "",
        hire_date: operatorToEdit.hire_date || "",
        emergency_contact: operatorToEdit.emergency_contact || "",
        emergency_phone: operatorToEdit.emergency_phone || "",
      });
      setErrors({});
    } else if (!open) {
      setFormData(emptyFormData);
      setErrors({});
    }
  }, [operatorToEdit, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Requerido";
    if (!formData.license_number?.trim())
      newErrors.license_number = "Requerido";
    if (!formData.license_type) newErrors.license_type = "Requerido";
    if (!formData.license_expiry) newErrors.license_expiry = "Requerido";
    if (!formData.medical_check_expiry)
      newErrors.medical_check_expiry = "Requerido";
    if (!formData.phone?.trim()) newErrors.phone = "Requerido";
    if (!formData.hire_date) newErrors.hire_date = "Requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Faltan datos",
        description: "Complete los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    // CORRECCIÓN: Convertir String del Select a Number o Null
    let unitIdToSend: number | null = null;

    if (
      formData.assigned_unit_id &&
      formData.assigned_unit_id !== "none" &&
      formData.assigned_unit_id !== ""
    ) {
      const parsed = parseInt(formData.assigned_unit_id, 10);
      unitIdToSend = Number.isNaN(parsed) ? null : parsed;
    }

    const operadorData: any = {
      // No mandamos ID si es nuevo (el backend lo crea)
      ...(isEditMode && { id: operatorToEdit?.id }),

      status: operatorToEdit?.status || "activo",
      name: formData.name,
      license_number: formData.license_number,
      license_type: formData.license_type,
      license_expiry: formData.license_expiry,
      medical_check_expiry: formData.medical_check_expiry,
      phone: formData.phone,

      // Enviamos el número o null
      assigned_unit_id: unitIdToSend,

      hire_date: formData.hire_date,
      emergency_contact: formData.emergency_contact,
      emergency_phone: formData.emergency_phone,
    };

    onSave?.(operadorData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            {isEditMode ? "Editar Operador" : "Registrar Nuevo Operador"}
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            {isEditMode
              ? "Modifique la información del operador."
              : "Complete la información del conductor para agregarlo al sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Información Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez González"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+52 55 1234 5678"
                    className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Fecha de Contratación *</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hire_date"
                  type="date"
                  className={`pl-10 ${errors.hire_date ? "border-destructive" : ""}`}
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
                  }
                />
              </div>
              {errors.hire_date && (
                <p className="text-xs text-destructive">{errors.hire_date}</p>
              )}
            </div>
          </div>

          {/* Licencia */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Información de Licencia
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">Número de Licencia *</Label>
                <Input
                  id="license_number"
                  placeholder="LIC-2024-12345"
                  value={formData.license_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      license_number: e.target.value,
                    })
                  }
                  className={errors.license_number ? "border-destructive" : ""}
                />
                {errors.license_number && (
                  <p className="text-xs text-destructive">
                    {errors.license_number}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_type">Tipo de Licencia *</Label>
                <Select
                  value={formData.license_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, license_type: value })
                  }
                >
                  <SelectTrigger
                    className={errors.license_type ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Tipo A - Motocicleta</SelectItem>
                    <SelectItem value="B">Tipo B - Automóvil</SelectItem>
                    <SelectItem value="C">Tipo C - Carga ligera</SelectItem>
                    <SelectItem value="D">Tipo D - Carga pesada</SelectItem>
                    <SelectItem value="E">Tipo E - Tractocamión</SelectItem>
                  </SelectContent>
                </Select>
                {errors.license_type && (
                  <p className="text-xs text-destructive">
                    {errors.license_type}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_expiry">Vigencia de Licencia *</Label>
                <Input
                  id="license_expiry"
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) =>
                    setFormData({ ...formData, license_expiry: e.target.value })
                  }
                  className={errors.license_expiry ? "border-destructive" : ""}
                />
                {errors.license_expiry && (
                  <p className="text-xs text-destructive">
                    {errors.license_expiry}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_check_expiry">
                  Vigencia Examen Médico *
                </Label>
                <Input
                  id="medical_check_expiry"
                  type="date"
                  value={formData.medical_check_expiry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      medical_check_expiry: e.target.value,
                    })
                  }
                  className={
                    errors.medical_check_expiry ? "border-destructive" : ""
                  }
                />
                {errors.medical_check_expiry && (
                  <p className="text-xs text-destructive">
                    {errors.medical_check_expiry}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Asignación de Unidad */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Asignación de Unidad (Opcional)
            </h3>

            <div className="space-y-2">
              <Label htmlFor="assigned_unit">Unidad Asignada</Label>
              <Select
                value={formData.assigned_unit_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_unit_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {unidadesSelectables.map((unit) => (
                    // Convertimos ID a string para el value del select
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.numero_economico} - {unit.marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              Contacto de Emergencia
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Nombre del Contacto</Label>
                <Input
                  id="emergency_contact"
                  placeholder="María González"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_contact: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_phone">Teléfono de Emergencia</Label>
                <Input
                  id="emergency_phone"
                  placeholder="+52 55 8765 4321"
                  value={formData.emergency_phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_phone: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

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
                "Actualizar Operador"
              ) : (
                "Guardar Operador"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
