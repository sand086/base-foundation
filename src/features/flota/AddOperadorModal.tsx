import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Check,
} from "lucide-react";
import { Operator } from "@/types/api.types";
import { useUnits } from "@/hooks/useUnits";
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

interface AddOperadorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorToEdit?: Operator | null;
  onSave?: (operador: any) => void;
  isSaving?: boolean;
}

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const operatorSchema = z.object({
  name: z.string().min(2, "El nombre es requerido y debe ser válido"),
  license_number: z.string().min(3, "Número de licencia requerido"),
  license_type: z.string().min(1, "Seleccione el tipo de licencia"),
  license_expiry: z.string().min(1, "Fecha requerida"),
  medical_check_expiry: z.string().min(1, "Fecha requerida"),
  phone: z.string().min(10, "Ingrese un número válido a 10 dígitos"),
  assigned_unit_id: z.string().optional(),
  hire_date: z.string().min(1, "Fecha requerida"),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
});

type OperatorFormData = z.infer<typeof operatorSchema>;

export function AddOperadorModal({
  open,
  onOpenChange,
  operatorToEdit,
  onSave,
  isSaving = false,
}: AddOperadorModalProps) {
  const { toast } = useToast();
  const { unidades } = useUnits();

  const isEditMode = !!operatorToEdit;

  // Filtramos unidades disponibles + la actual del operador
  const unidadesSelectables = useMemo(() => {
    return unidades.filter(
      (u) =>
        u.status === "disponible" ||
        (operatorToEdit && u.id === operatorToEdit.assigned_unit_id),
    );
  }, [unidades, operatorToEdit]);

  // 🚀 REACT HOOK FORM
  const form = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      name: "",
      license_number: "",
      license_type: "",
      license_expiry: "",
      medical_check_expiry: "",
      phone: "",
      assigned_unit_id: "none",
      hire_date: "",
      emergency_contact: "",
      emergency_phone: "",
    },
  });

  const { reset, handleSubmit } = form;

  useEffect(() => {
    if (open && operatorToEdit) {
      reset({
        name: operatorToEdit.name,
        license_number: operatorToEdit.license_number,
        license_type: operatorToEdit.license_type,
        license_expiry: operatorToEdit.license_expiry,
        medical_check_expiry: operatorToEdit.medical_check_expiry,
        phone: operatorToEdit.phone || "",
        assigned_unit_id: operatorToEdit.assigned_unit_id?.toString() || "none",
        hire_date: operatorToEdit.hire_date || "",
        emergency_contact: operatorToEdit.emergency_contact || "",
        emergency_phone: operatorToEdit.emergency_phone || "",
      });
    } else if (!open) {
      reset({
        name: "",
        license_number: "",
        license_type: "",
        license_expiry: "",
        medical_check_expiry: "",
        phone: "",
        assigned_unit_id: "none",
        hire_date: "",
        emergency_contact: "",
        emergency_phone: "",
      });
    }
  }, [operatorToEdit, open, reset]);

  // =====================
  // SUBMIT
  // =====================
  const onSubmit = (data: OperatorFormData) => {
    let unitIdToSend: number | null = null;

    if (
      data.assigned_unit_id &&
      data.assigned_unit_id !== "none" &&
      data.assigned_unit_id !== ""
    ) {
      const parsed = parseInt(data.assigned_unit_id, 10);
      unitIdToSend = Number.isNaN(parsed) ? null : parsed;
    }

    const operadorData: any = {
      ...(isEditMode && { id: operatorToEdit?.id }),
      status: operatorToEdit?.status || "activo",
      name: data.name.trim(),
      license_number: data.license_number.trim().toUpperCase(),
      license_type: data.license_type,
      license_expiry: data.license_expiry,
      medical_check_expiry: data.medical_check_expiry,
      phone: data.phone.trim(),
      assigned_unit_id: unitIdToSend,
      hire_date: data.hire_date,
      emergency_contact: data.emergency_contact?.trim() || "",
      emergency_phone: data.emergency_phone?.trim() || "",
    };

    onSave?.(operadorData);
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/* 🚀 HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
              <User className="h-7 w-7 sm:h-8 sm:w-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                {isEditMode ? "Editar Operador" : "Registrar Nuevo Operador"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                {isEditMode
                  ? "Modifique la información operativa del conductor."
                  : "Complete la información para alta en el sistema."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 🚀 BODY: FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div className="space-y-8">
                {/* Información Personal */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    Información Personal
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel variant="brand" required>
                            Nombre Completo
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: Juan Pérez González"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Teléfono
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                {...field}
                                placeholder="+52 55 1234 5678"
                                className="pl-10 h-11 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hire_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Fecha de Contratación
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                type="date"
                                {...field}
                                className="pl-10 h-11 font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Licencia */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    Información de Licencia
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="license_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Número de Licencia
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="LIC-2024-12345"
                              className="h-11 font-mono uppercase font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="license_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Tipo de Licencia
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                              <SelectItem value="A">
                                Tipo A - Motocicleta
                              </SelectItem>
                              <SelectItem value="B">
                                Tipo B - Automóvil
                              </SelectItem>
                              <SelectItem value="C">
                                Tipo C - Carga ligera
                              </SelectItem>
                              <SelectItem value="D">
                                Tipo D - Carga pesada
                              </SelectItem>
                              <SelectItem
                                value="E"
                                className="font-bold text-brand-navy dark:text-blue-400"
                              >
                                Tipo E - Tractocamión
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="license_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Vigencia de Licencia
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="h-11 font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medical_check_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Vigencia Examen Médico
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="h-11 font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Asignación de Unidad */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <Truck className="h-3.5 w-3.5 text-blue-500" />
                    Asignación Operativa
                  </h3>

                  <FormField
                    control={form.control}
                    name="assigned_unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">
                          Unidad Asignada (Opcional)
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                            <SelectItem
                              value="none"
                              className="italic text-slate-500"
                            >
                              Sin asignar (En Patio)
                            </SelectItem>
                            {unidadesSelectables.map((unit) => (
                              <SelectItem
                                key={unit.id}
                                value={unit.id.toString()}
                                className="font-bold"
                              >
                                {unit.numero_economico} - {unit.marca}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contacto de Emergencia */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    Contacto de Emergencia
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="emergency_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            Nombre del Contacto
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: María González"
                              className="h-11 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergency_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            Teléfono de Emergencia
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                {...field}
                                placeholder="+52 55 8765 4321"
                                className="pl-10 h-11 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 🚀 FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="w-full sm:w-auto haptic-press flex-shrink-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={isSaving}
                  className="w-full sm:w-auto haptic-press flex-shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {isEditMode ? "Actualizar Operador" : "Guardar Operador"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
