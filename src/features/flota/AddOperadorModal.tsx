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
  Fingerprint,
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
  //  RFC REQUERIDO (12 o 13 caracteres)
  rfc: z.string().min(12, "RFC inválido").max(13, "RFC inválido"),
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

  //  REACT HOOK FORM
  const form = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      name: "",
      rfc: "XAXX010101000", // Valor genérico por defecto
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
          rfc: operatorToEdit.rfc || "XAXX010101000", //  Cargar RFC en edición
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
          rfc: "XAXX010101000",
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
      rfc: data.rfc.trim().toUpperCase(), //  Enviar RFC limpio y en mayúsculas
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
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white dark:bg-brand-navy border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden">
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
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <span className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                {isEditMode ? "Editar Operador" : "Nuevo Operador"}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 mt-1">
                Datos obligatorios para complemento carta porte
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
              <div className="space-y-8">
                {/*  SECCIÓN 1: IDENTIFICACIÓN FISCAL Y PERSONAL */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <Fingerprint className="h-3.5 w-3.5 text-blue-500" />
                    Identificación y Contacto
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
                              placeholder="Ej: Juan Pérez"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/*  NUEVO CAMPO RFC */}
                    <FormField
                      control={form.control}
                      name="rfc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            RFC (SAT)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="XAXX010101000"
                              className="h-11 font-mono uppercase font-bold bg-white dark:bg-slate-900 shadow-sm"
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
                            Teléfono Celular
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="10 dígitos"
                              className="h-11 font-mono font-bold bg-white dark:bg-slate-900 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* SECCIÓN 2: LICENCIA Y VIGENCIAS */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    Licencia Federal y Médica
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="license_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Folio de Licencia
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="LIC-000000"
                              className="h-11 font-mono uppercase font-bold bg-white dark:bg-slate-900"
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
                            Tipo
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900">
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A">Tipo A</SelectItem>
                              <SelectItem value="B">Tipo B</SelectItem>
                              <SelectItem value="E">
                                Tipo E (Federal)
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
                            Vigencia Licencia
                          </FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
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
                            Examen Médico
                          </FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* SECCIÓN 3: EMPRESA */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                    <Truck className="h-3.5 w-3.5 text-blue-500" />
                    Asignación y Alta
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="assigned_unit_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Unidad Asignada</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900">
                                <SelectValue placeholder="Sin asignar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                Sin unidad fija
                              </SelectItem>
                              {unidadesSelectables.map((unit) => (
                                <SelectItem
                                  key={unit.id}
                                  value={unit.id.toString()}
                                >
                                  ECO-{unit.numero_economico}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            Fecha Ingreso
                          </FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving}
                  className={cn(
                    "w-full sm:w-auto text-white",
                    isEditMode ? "bg-brand-green" : "bg-brand-red",
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
