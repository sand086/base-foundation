import { useEffect, useMemo } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";

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
  license_expiry: z.date({ required_error: "Fecha requerida" }),
  medical_check_expiry: z.date({ required_error: "Fecha requerida" }),
  phone: z.string().min(10, "Ingrese un número válido a 10 dígitos"),
  assigned_unit_id: z.string().optional(),
  hire_date: z.date({ required_error: "Fecha requerida" }),
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
      license_expiry: undefined,
      medical_check_expiry: undefined,
      phone: "",
      assigned_unit_id: "none",
      hire_date: new Date(),
      emergency_contact: "",
      emergency_phone: "",
    },
  });

  const { reset, handleSubmit } = form;

  useEffect(() => {
    if (open) {
      if (operatorToEdit) {
        reset({
          name: operatorToEdit.name,
          license_number: operatorToEdit.license_number,
          license_type: operatorToEdit.license_type,
          license_expiry: operatorToEdit.license_expiry
            ? new Date(`${operatorToEdit.license_expiry}T12:00:00`)
            : undefined,
          medical_check_expiry: operatorToEdit.medical_check_expiry
            ? new Date(`${operatorToEdit.medical_check_expiry}T12:00:00`)
            : undefined,
          phone: operatorToEdit.phone || "",
          assigned_unit_id:
            operatorToEdit.assigned_unit_id?.toString() || "none",
          hire_date: operatorToEdit.hire_date
            ? new Date(`${operatorToEdit.hire_date}T12:00:00`)
            : new Date(),
          emergency_contact: operatorToEdit.emergency_contact || "",
          emergency_phone: operatorToEdit.emergency_phone || "",
        });
      } else {
        reset({
          name: "",
          license_number: "",
          license_type: "",
          license_expiry: undefined,
          medical_check_expiry: undefined,
          phone: "",
          assigned_unit_id: "none",
          hire_date: new Date(),
          emergency_contact: "",
          emergency_phone: "",
        });
      }
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
      license_expiry: format(data.license_expiry, "yyyy-MM-dd"),
      medical_check_expiry: format(data.medical_check_expiry, "yyyy-MM-dd"),
      phone: data.phone.trim(),
      assigned_unit_id: unitIdToSend,
      hire_date: format(data.hire_date, "yyyy-MM-dd"),
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
      {/* 🚀 CAPA 1: CASCARÓN DEL MODAL */}
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
        {/* 🚀 CAPA 2: CABECERA (Blanca en Light, Oscura en Dark) */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 z-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <DialogTitle className="flex items-center gap-4 sm:gap-5 text-slate-800 dark:text-white text-xl font-black relative z-10">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30",
              )}
            >
              <User
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    : "text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <span className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none">
                {isEditMode ? "Editar Operador" : "Registrar Nuevo Operador"}
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 tracking-normal normal-case">
                {isEditMode
                  ? "Modifique la información operativa del conductor."
                  : "Complete la información para alta en el sistema."}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* 🚀 CAPA 3: CUERPO Y FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            {/* Fondo gris claro en modo Light para que los inputs blancos resalten */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
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
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              modalTitle="Fecha de Contratación"
                            />
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
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              modalTitle="Vigencia Licencia"
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
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              modalTitle="Vigencia Examen"
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
                                ECO-{unit.numero_economico} - {unit.marca}
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

            {/* 🚀 CAPA 4: FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
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
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white",
                    isEditMode
                      ? "bg-brand-green hover:bg-brand-green/80 shadow-amber-500/20"
                      : "bg-brand-red hover:bg-brand-red/90 shadow-brand-red/20",
                  )}
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
