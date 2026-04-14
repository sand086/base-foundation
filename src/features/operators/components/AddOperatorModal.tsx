import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
  CreditCard,
  Truck,
  Loader2,
  Check,
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Operator } from "@/features/operators/types";
import { useUnits } from "@/features/units/hooks/useUnits";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";

interface AddOperatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorToEdit?: Operator | null;
  onSave?: (operador: any) => void;
  isSaving?: boolean;
}

const operatorSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
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

type OperatorFormValues = z.infer<typeof operatorSchema>;

export function AddOperatorModal({
  open,
  onOpenChange,
  operatorToEdit,
  onSave,
  isSaving = false,
}: AddOperatorModalProps) {
  const { unidades } = useUnits();
  const isEditMode = !!operatorToEdit;

  const unidadesSelectables = useMemo(() => {
    return unidades.filter(
      (u) =>
        u.status === "disponible" ||
        (operatorToEdit && u.id === operatorToEdit.assigned_unit_id),
    );
  }, [unidades, operatorToEdit]);

  const form = useForm<OperatorFormValues>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      name: "",
      rfc: "XAXX010101000",
      license_number: "",
      license_type: "",
      phone: "",
      assigned_unit_id: "none",
      hire_date: new Date(),
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (open) {
      if (operatorToEdit) {
        reset({
          name: operatorToEdit.name,
          rfc: operatorToEdit.rfc || "XAXX010101000",
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
          assigned_unit_id: "none",
          hire_date: new Date(),
        });
      }
    }
  }, [operatorToEdit, open, reset]);

  const onSubmit = (data: OperatorFormValues) => {
    let unitIdToSend: number | null = null;

    if (data.assigned_unit_id && data.assigned_unit_id !== "none") {
      const parsed = parseInt(data.assigned_unit_id, 10);
      unitIdToSend = Number.isNaN(parsed) ? null : parsed;
    }

    const payload = {
      ...(isEditMode && { id: operatorToEdit?.id }),
      status: operatorToEdit?.status || "activo",
      name: data.name.trim(),
      rfc: data.rfc.trim().toUpperCase(),
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

    onSave?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30",
              )}
            >
              <User
                  className={cn(
                    "h-6 w-6",
                    isEditMode
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {isEditMode ? "Editar Operador" : "Nuevo Operador"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Datos obligatorios para complemento carta porte
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-8">
              {/* IDENTIFICACIÓN */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <Fingerprint className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
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
                            className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
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
                            className="h-11 font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* LICENCIA */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <CreditCard className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
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
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
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
                            <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
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

              {/* ASIGNACIÓN */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <Truck className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
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
                            <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
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

            {/* CAPA 5: FOOTER */}
            <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving}
                  className={cn(
                    "w-full sm:w-auto haptic-press border-none text-white font-black uppercase tracking-widest text-[10px]",
                    isEditMode
                      ? "bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)]"
                      : "bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)]",
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
