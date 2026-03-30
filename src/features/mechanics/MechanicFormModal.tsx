import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Check,
  Wrench,
  User,
  Briefcase,
  Heart,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { Mechanic } from "@/types/api.types";
import { toast } from "sonner";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mechanicToEdit?: Mechanic | null;
  onSave: (data: any) => Promise<boolean>;
}

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const mechanicSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido"),
  apellido: z.string().optional(),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
  email: z
    .string()
    .email("Formato de correo inválido")
    .optional()
    .or(z.literal("")),
  direccion: z.string().optional(),
  fecha_nacimiento: z.date().optional(),
  fecha_contratacion: z.date().optional(),
  nss: z.string().optional(),
  rfc: z.string().optional(),
  salario_base: z.coerce
    .number()
    .min(0, "El salario no puede ser negativo")
    .optional(),
  contacto_emergencia_nombre: z.string().optional(),
  contacto_emergencia_telefono: z.string().optional(),
  activo: z.boolean().default(true),
});

type MechanicFormData = z.infer<typeof mechanicSchema>;

export function MechanicFormModal({
  open,
  onOpenChange,
  mechanicToEdit,
  onSave,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!mechanicToEdit;

  // 🚀 REACT HOOK FORM
  const form = useForm<MechanicFormData>({
    resolver: zodResolver(mechanicSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      especialidad: "",
      telefono: "",
      email: "",
      direccion: "",
      fecha_nacimiento: undefined,
      fecha_contratacion: undefined,
      nss: "",
      rfc: "",
      salario_base: 0,
      contacto_emergencia_nombre: "",
      contacto_emergencia_telefono: "",
      activo: true,
    },
  });

  const { reset, handleSubmit } = form;

  useEffect(() => {
    if (open) {
      if (mechanicToEdit) {
        reset({
          nombre: mechanicToEdit.nombre || "",
          apellido: mechanicToEdit.apellido || "",
          especialidad: mechanicToEdit.especialidad || "",
          telefono: mechanicToEdit.telefono || "",
          email: mechanicToEdit.email || "",
          direccion: mechanicToEdit.direccion || "",
          // Convertir strings a Dates
          fecha_nacimiento: mechanicToEdit.fecha_nacimiento
            ? new Date(`${mechanicToEdit.fecha_nacimiento}T12:00:00`)
            : undefined,
          fecha_contratacion: mechanicToEdit.fecha_contratacion
            ? new Date(`${mechanicToEdit.fecha_contratacion}T12:00:00`)
            : undefined,
          nss: mechanicToEdit.nss || "",
          rfc: mechanicToEdit.rfc || "",
          salario_base: mechanicToEdit.salario_base || 0,
          contacto_emergencia_nombre:
            mechanicToEdit.contacto_emergencia_nombre || "",
          contacto_emergencia_telefono:
            mechanicToEdit.contacto_emergencia_telefono || "",
          activo: mechanicToEdit.activo ?? true,
        });
      } else {
        reset({
          nombre: "",
          apellido: "",
          especialidad: "",
          telefono: "",
          email: "",
          direccion: "",
          fecha_nacimiento: undefined,
          fecha_contratacion: undefined,
          nss: "",
          rfc: "",
          salario_base: 0,
          contacto_emergencia_nombre: "",
          contacto_emergencia_telefono: "",
          activo: true,
        });
      }
    }
  }, [mechanicToEdit, open, reset]);

  // =====================
  // SUBMIT
  // =====================
  const onFormSubmit = async (data: MechanicFormData) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...data,
        // Convertir Dates a strings para el backend
        fecha_nacimiento: data.fecha_nacimiento
          ? format(data.fecha_nacimiento, "yyyy-MM-dd")
          : null,
        fecha_contratacion: data.fecha_contratacion
          ? format(data.fecha_contratacion, "yyyy-MM-dd")
          : null,
      };

      const success = await onSave(payload);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Ocurrió un error al guardar el mecánico");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) handleClose();
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/* 🚀 HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate",
                isEditMode ? "bg-blue-500/20" : "bg-emerald-500/20",
              )}
            >
              <Wrench
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8",
                  isEditMode
                    ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                    : "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                {isEditMode ? "Editar Mecánico" : "Nuevo Mecánico"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                {isEditMode
                  ? "Modifique la información y expediente del técnico."
                  : "Complete la información para alta en el sistema."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 🚀 BODY: FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            {/* 🚀 TABS CONTENEDOR FLEX PARA SCROLL PERFECTO */}
            <Tabs
              defaultValue="datos"
              className="flex-1 flex flex-col min-h-0 w-full"
            >
              {/* 🚀 TABS LIST TAHOE (FIJA EN LA PARTE SUPERIOR DEL BODY) */}
              <div className="shrink-0 w-full overflow-x-auto hide-scrollbar pt-6 px-6 sm:pt-8 sm:px-8 pb-2 sm:pb-0 z-20">
                <TabsList className="bg-slate-200/50 dark:bg-slate-800/80 backdrop-blur-md p-1 h-12 rounded-xl border border-slate-300/50 dark:border-white/5 inline-flex min-w-max sm:w-full grid-cols-3">
                  <TabsTrigger
                    value="datos"
                    className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
                  >
                    <User className="h-3.5 w-3.5" /> Personales
                  </TabsTrigger>
                  <TabsTrigger
                    value="laboral"
                    className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
                  >
                    <Briefcase className="h-3.5 w-3.5" /> Laboral
                  </TabsTrigger>
                  <TabsTrigger
                    value="emergencia"
                    className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
                  >
                    <Heart className="h-3.5 w-3.5" /> Emergencia
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 🚀 SCROLL AREA PARA LOS TABS CONTENT */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 custom-scrollbar">
                {/* TAB: DATOS PERSONALES */}
                <TabsContent
                  value="datos"
                  className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Nombre(s)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: Juan"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apellido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Apellido(s)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: Pérez"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Teléfono</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                {...field}
                                placeholder="+52 55 1234 5678"
                                className="pl-10 h-11 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                disabled={isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                type="email"
                                {...field}
                                placeholder="correo@ejemplo.com"
                                className="pl-10 h-11 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                disabled={isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="direccion"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel variant="brand">Dirección</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                {...field}
                                placeholder="Calle, Número, Colonia..."
                                className="pl-10 h-11 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                disabled={isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fecha_nacimiento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            Fecha de Nacimiento
                          </FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              modalTitle="Fecha de Nacimiento"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB: LABORAL */}
                <TabsContent
                  value="laboral"
                  className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="especialidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Especialidad</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej. Diesel, Eléctrico, General"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fecha_contratacion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
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

                    <FormField
                      control={form.control}
                      name="nss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            NSS (Seguro Social)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                {...field}
                                placeholder="00000000000"
                                className="pl-10 h-11 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                disabled={isSubmitting}
                              />
                            </div>
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
                          <FormLabel variant="brand">RFC</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                {...field}
                                placeholder="XAXX010101000"
                                className="pl-10 h-11 font-mono uppercase font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                disabled={isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="salario_base"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            Salario Base Mensual
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                className="pl-10 h-11 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                                disabled={isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="activo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 p-4 shadow-sm mt-1">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-bold text-brand-navy dark:text-white">
                              Estado del Mecánico
                            </FormLabel>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              Disponible para órdenes de trabajo
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* TAB: EMERGENCIA */}
                <TabsContent
                  value="emergencia"
                  className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contacto_emergencia_nombre"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel variant="brand">
                            Nombre Contacto de Emergencia
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: María González"
                              className="h-11 font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contacto_emergencia_telefono"
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
                                disabled={isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* 🚀 FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto haptic-press flex-shrink-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white",
                    isEditMode
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {isEditMode ? "Actualizar Mecánico" : "Guardar Mecánico"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
